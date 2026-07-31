import { STAGE_ORDER, type CanonicalStage, type Dataset, type LeadRecord } from "../core/schema";

// ────────────────────────────────────────────────────────────────────────────
// Preset dataset: a fully pre-filled, already-run snapshot so the tool can be
// demonstrated (in an interview or a walkthrough) without uploading data.
// Generated deterministically from a fixed seed, so every render is identical.
// It is clearly labelled as demonstration data in the UI.
// ────────────────────────────────────────────────────────────────────────────

// Mulberry32 seeded PRNG -> deterministic output, no Math.random.
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OWNERS = [
  { owner: "Ana Reyes", region: "LATAM", target: 45, strength: 1.15 },
  { owner: "Bruno Costa", region: "NAM", target: 45, strength: 0.84 },
  { owner: "Camila Díaz", region: "LATAM", target: 40, strength: 1.03 },
  { owner: "Diego Alvarez", region: "NAM", target: 45, strength: 0.64 },
  { owner: "Elena Souza", region: "LATAM", target: 40, strength: 1.10 },
  { owner: "Felipe Nunes", region: "NAM", target: 45, strength: 0.78 },
];

// Stage distribution weights shape a realistic funnel (many leads, few CWP).
const STAGE_WEIGHTS: Record<CanonicalStage, number> = {
  lead: 0.62, mql: 0.20, sql: 0.09, sqo: 0.06, cwp: 0.03,
};

function pickStage(r: number): CanonicalStage {
  let acc = 0;
  for (const s of STAGE_ORDER) {
    acc += STAGE_WEIGHTS[s];
    if (r <= acc) return s;
  }
  return "lead";
}

function isoDaysAgo(fromISO: string, days: number): string {
  return new Date(new Date(fromISO).getTime() - days * 86400000).toISOString();
}

export function buildPreset(referenceISO = "2026-07-25T00:00:00.000Z"): Dataset {
  const rnd = seeded(30);
  const records: LeadRecord[] = [];
  const N = 520;

  for (let i = 0; i < N; i++) {
    const o = OWNERS[Math.floor(rnd() * OWNERS.length)];
    // stronger reps convert a bit further down the funnel
    const bias = rnd() * (0.75 + o.strength * 0.35);
    const stage = pickStage(bias > 1 ? rnd() * 0.6 : rnd());
    const created = Math.floor(rnd() * 60) + 1;
    const activity = Math.floor(rnd() * created);
    const hasAmount = stage === "sqo" || stage === "cwp" || rnd() > 0.4;
    const record: LeadRecord = {
      id: `REC-${1000 + i}`,
      createdAt: isoDaysAgo(referenceISO, created),
      lastActivityAt: isoDaysAgo(referenceISO, activity),
      stage,
      owner: o.owner,
      region: o.region,
      _source: { file: "preset", row: i },
    };
    if (hasAmount) record.amount = Math.round((28000 + rnd() * 42000) / 1000) * 1000;
    if (rnd() < 0.05) record.email = "dupe@acme.example"; // seeds a few duplicates
    else record.email = `lead${i}@acme.example`;
    if (rnd() < 0.06) record.owner = ""; // seeds a few missing-field records
    records.push(record);
  }

  return {
    label: "Preset · Americas FY26 (demonstration data)",
    periodLabel: "Week 30 · FY26",
    currency: "USD",
    avgDealFallback: 42000,
    records,
    targets: OWNERS.map(({ owner, region, target }) => ({ owner, region, target })),
    source: "preset",
  };
}
