// Lead-gate persistence + submit. A visitor must register (name, work email,
// company; phone optional) before the tool unlocks. We remember them in
// localStorage so returning visitors are not asked again, and forward the lead
// to /api/lead (serverless), which relays it to the Google Sheet webhook.

export interface Lead {
  name: string;
  email: string;
  company: string;
  phone?: string;
  ts: number;
}

const KEY = "leadgate.registered";

export function readLead(): Lead | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Lead) : null;
  } catch {
    return null;
  }
}

export function persistLead(lead: Lead): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lead));
  } catch {
    /* private mode / quota — the session still proceeds, we just re-ask later */
  }
}

export interface LeadInput {
  name: string;
  email: string;
  company: string;
  phone?: string;
  source: string;
  lang: string;
}

// Best-effort capture. Resolves on any 2xx (including when the webhook is not
// configured yet, so the gate works the moment the app is deployed). Throws on
// network / server error so the form can show a retry.
export async function submitLead(input: LeadInput): Promise<void> {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Lead submit failed (${res.status})`);
}
