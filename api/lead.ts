// Vercel serverless function (Node runtime). Receives a registration lead from
// the client gate and relays it to a Google Sheet via the Apps Script webhook
// URL held in LEADS_WEBHOOK_URL (server-side, never shipped to the browser).
//
// POST /api/lead  body: { name, email, company, phone?, source, lang }
// returns: { ok: true, stored: boolean }
//
// If LEADS_WEBHOOK_URL is not configured the endpoint still answers 200 with
// stored:false, so the gate works the moment the app is deployed — the owner
// just won't see leads centrally until the env var is set.

interface VercelReq {
  method?: string;
  body?: unknown;
}
interface VercelRes {
  status(code: number): VercelRes;
  json(body: unknown): void;
}

const str = (v: unknown, max = 300): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }

  const lead = {
    name: str(body?.name, 120),
    email: str(body?.email, 160),
    company: str(body?.company, 160),
    phone: str(body?.phone, 60),
    source: str(body?.source, 80),
    lang: str(body?.lang, 8),
  };

  if (!lead.name || !lead.company || !EMAIL_RE.test(lead.email)) {
    res.status(400).json({ error: "Missing or invalid fields (name, email, company are required)." });
    return;
  }

  const webhook = process.env.LEADS_WEBHOOK_URL;
  if (!webhook) {
    console.log("[lead] captured (no webhook configured):", lead);
    res.status(200).json({ ok: true, stored: false });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(webhook, {
      method: "POST",
      // text/plain avoids a CORS preflight on Apps Script and is parsed there.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...lead, ts: new Date().toISOString() }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!upstream.ok) throw new Error(`webhook ${upstream.status}`);
    res.status(200).json({ ok: true, stored: true });
  } catch (e) {
    // Don't trap a legitimate visitor if the sheet hiccups: log and let them in.
    console.error("[lead] webhook relay failed:", e, lead);
    res.status(200).json({ ok: true, stored: false });
  }
}
