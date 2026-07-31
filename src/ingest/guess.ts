import {
  STAGE_ORDER,
  type CanonicalStage,
  type ColumnMapping,
  type StageMapping,
  type RawRow,
} from "../core/schema";

// ── Column auto-mapping ─────────────────────────────────────────────────────
const HINTS: Record<keyof ColumnMapping, string[]> = {
  id: ["record id", "lead id", "opportunity id", "id", "código", "codigo"],
  createdAt: ["created", "create date", "created at", "criado", "data de criação", "data criacao"],
  lastActivityAt: ["last activity", "activity date", "última atividade", "ultima atividade", "atividade"],
  stage: ["stage", "status", "phase", "estágio", "estagio", "etapa"],
  owner: ["owner", "bdr", "rep", "sales rep", "sdr", "responsável", "responsavel", "vendedor"],
  region: ["region", "geo", "market", "região", "regiao", "território", "territorio"],
  amount: ["amount", "value", "deal size", "valor", "receita", "montante"],
  email: ["email", "e-mail", "contact email"],
};

const norm = (s: string) => s.trim().toLowerCase();

function guessOne(field: keyof ColumnMapping, headers: string[]): string {
  const hs = headers.map((h) => ({ h, n: norm(h) }));
  for (const hint of HINTS[field]) {
    const exact = hs.find((x) => x.n === hint);
    if (exact) return exact.h;
  }
  for (const hint of HINTS[field]) {
    const partial = hs.find((x) => x.n.includes(hint));
    if (partial) return partial.h;
  }
  return "";
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  return {
    id: guessOne("id", headers),
    createdAt: guessOne("createdAt", headers),
    lastActivityAt: guessOne("lastActivityAt", headers),
    stage: guessOne("stage", headers),
    owner: guessOne("owner", headers),
    region: guessOne("region", headers),
    amount: guessOne("amount", headers),
    email: guessOne("email", headers),
  };
}

// ── Distinct value collection + stage auto-mapping ──────────────────────────
export function distinctValues(rows: RawRow[], column: string): string[] {
  if (!column) return [];
  const set = new Set<string>();
  for (const r of rows) {
    const v = (r[column] ?? "").trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

const STAGE_HINTS: Record<CanonicalStage, string[]> = {
  lead: ["lead", "new", "raw", "inquiry", "subscriber", "novo"],
  mql: ["mql", "marketing qualified", "marketing", "nurtur"],
  sql: ["sql", "sales qualified", "sales accepted", "sal", "qualified"],
  sqo: ["sqo", "opportunity", "opp", "pipeline", "proposal", "negotiation", "oportunidade", "proposta"],
  cwp: ["cwp", "closed won", "won", "customer", "closed-won", "ganho", "fechado"],
};

function classifyStage(value: string): CanonicalStage | "" {
  const n = norm(value);
  const direct = STAGE_ORDER.find((s) => s === n);
  if (direct) return direct;
  // Order matters: check most-specific (cwp/sqo/sql/mql) before "lead", since
  // "closed won" also contains no lead hint but "sales qualified lead" would.
  for (const s of [...STAGE_ORDER].reverse()) {
    if (STAGE_HINTS[s].some((h) => n.includes(h))) return s;
  }
  return "";
}

export function guessStageMapping(values: string[]): StageMapping {
  const out: StageMapping = {};
  for (const v of values) {
    // Default unknown stages to "lead" (the safest, furthest-up assumption);
    // the user can correct before loading.
    out[v] = classifyStage(v) || "lead";
  }
  return out;
}

export function isColumnMappingComplete(m: ColumnMapping): boolean {
  return Boolean(m.id && m.createdAt && m.stage && m.owner);
}
