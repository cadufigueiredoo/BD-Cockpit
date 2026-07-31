// Vercel serverless function (Node.js runtime). Holds the API key server-side
// and narrates the deterministic metrics the client computed. It must NOT
// recompute or invent numbers; it only writes the WBR prose around the figures
// it receives.
//
// POST /api/narrate  body: { metrics: object, lang: "en" | "pt" }
// returns: { headline, summary, actions: [{ title, detail, priority }] }

// Minimal shapes for the Vercel Node request/response (avoids a hard dependency
// on @vercel/node types while keeping `strict` happy).
interface VercelReq {
  method?: string;
  body?: unknown;
}
interface VercelRes {
  status(code: number): VercelRes;
  json(body: unknown): void;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = 1200;
const MAX_RETRIES = 3;
const UPSTREAM_TIMEOUT_MS = 50_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables, then redeploy.",
    });
    return;
  }

  let metrics: unknown;
  let langRaw: unknown;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    metrics = body && (body as { metrics?: unknown }).metrics;
    langRaw = body && (body as { lang?: unknown }).lang;
  } catch {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }
  if (metrics == null) {
    res.status(400).json({ error: "Missing 'metrics' in request body." });
    return;
  }

  // The whole prompt and the metrics JSON are in English, so a single mid-prompt
  // "write in X" was being ignored and the model replied in English. Front-load
  // the language rule, name the language assertively, and repeat it after the
  // schema so every emitted string (headline/summary/title/detail) is localized.
  const langName = langRaw === "pt" ? "Brazilian Portuguese (pt-BR)" : "English";
  const prompt =
    `Write ALL natural-language text you output — the headline, the summary, and every action title and detail — in ${langName}. This instruction overrides the language of these instructions and of the data; do not answer in any other language. ` +
    `You are a demand generation operations analyst preparing a Weekly Business Review for regional marketing and sales leadership. ` +
    `Use ONLY the numbers in this JSON; never invent or estimate figures beyond what is given (you may compute simple gaps from the provided numbers). ` +
    `Respond with ONLY valid minified JSON, no markdown, no preamble, with this exact shape: ` +
    `{"headline": string (max 12 words), "summary": string (2-3 sentences covering funnel, data quality and BDR attainment), ` +
    `"actions": [{"title": string, "detail": string (1 sentence), "priority": "P1"|"P2"|"P3"}] } with exactly 3 actions ranked by impact. ` +
    `Keep the JSON keys and the priority codes (P1/P2/P3) exactly as written in English, but write every string VALUE in ${langName}. ` +
    `Metrics: ${JSON.stringify(metrics)}`;

  let lastError = "Narration failed.";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      clearTimeout(timeout);

      // Transient upstream conditions: back off and retry.
      if (upstream.status === 429 || upstream.status === 529 || upstream.status >= 500) {
        lastError = `The model is busy (${upstream.status}). Please try again.`;
        await sleep(600 * Math.pow(2, attempt));
        continue;
      }

      if (!upstream.ok) {
        const detail = await readUpstreamError(upstream);
        if (upstream.status === 400 && /credit balance/i.test(detail)) {
          res.status(402).json({
            error: "Anthropic credit balance is too low. Top up at console.anthropic.com → Billing.",
          });
          return;
        }
        if (upstream.status === 401) {
          res.status(401).json({ error: "Invalid ANTHROPIC_API_KEY. Check the value in Vercel and redeploy." });
          return;
        }
        res.status(upstream.status).json({ error: detail || `Upstream error (${upstream.status}).` });
        return;
      }

      const data = (await upstream.json()) as { content?: { type: string; text?: string }[] };
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("");

      const parsed = extractJSON(text);
      if (!parsed) {
        lastError = "Couldn't parse the narrator's response.";
        await sleep(400 * Math.pow(2, attempt));
        continue;
      }
      res.status(200).json(parsed);
      return;
    } catch (e) {
      clearTimeout(timeout);
      lastError =
        e && typeof e === "object" && "name" in e && (e as { name?: string }).name === "AbortError"
          ? "The request timed out. Try again."
          : (e as { message?: string })?.message || "Network error.";
      await sleep(600 * Math.pow(2, attempt));
    }
  }

  res.status(503).json({ error: lastError });
}

async function readUpstreamError(upstream: Response): Promise<string> {
  try {
    const errJson = (await upstream.json()) as { error?: { message?: string } };
    return errJson?.error?.message || "";
  } catch {
    return "";
  }
}

// ── Tolerant JSON extraction (ported from the Campaign Intelligence lesson) ──
// A response can arrive wrapped in prose/markdown or truncated by the token cap;
// repair it rather than discarding a usable review.
function extractJSON(text: string): unknown {
  if (!text) return null;
  const s = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const first = s.indexOf("{");
  if (first === -1) return null;
  const last = s.lastIndexOf("}");
  const body = last > first ? s.slice(first, last + 1) : s.slice(first);

  const attempts = [
    body,
    body.replace(/,\s*([}\]])/g, "$1"), // trailing commas
    repairTruncated(body),
    repairTruncated(body.replace(/,\s*([}\]])/g, "$1")),
  ];
  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next */
    }
  }
  return null;
}

function repairTruncated(str: string | null): string | null {
  if (!str) return null;
  let out = "";
  let inStr = false;
  let escaped = false;
  const stack: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    out += ch;
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}
