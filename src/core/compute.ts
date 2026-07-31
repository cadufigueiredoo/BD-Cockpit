import {
  STAGE_ORDER,
  STAGE_LABEL,
  type CanonicalStage,
  type LeadRecord,
  type RecordQuality,
  type BdrTarget,
  type Dataset,
} from "./schema";

// ────────────────────────────────────────────────────────────────────────────
// Deterministic compute layer. Pure functions only. No randomness, no dates
// read from the clock, no AI. Every number here is derived from the records the
// user provided. The AI layer narrates these outputs; it never produces them.
// ────────────────────────────────────────────────────────────────────────────

export const pct = (n: number, d: number): number => (d === 0 ? 0 : n / d);
const stageIndex = (s: CanonicalStage): number => STAGE_ORDER.indexOf(s);

export interface FunnelStage {
  key: CanonicalStage;
  label: string;
  value: number;
  conv: number | null; // conversion from previous stage
}
export interface FunnelResult {
  stages: FunnelStage[];
  pipelineValue: number;
  cwpValue: number;
  estimatedRows: number; // records where amount was missing and fallback was used
}

// Counts records at-or-beyond each stage, so a CWP record also counts as a Lead.
export function computeFunnel(ds: Dataset): FunnelResult {
  const counts = STAGE_ORDER.map(
    (stage) => ds.records.filter((r) => stageIndex(r.stage) >= stageIndex(stage)).length
  );
  const stages: FunnelStage[] = STAGE_ORDER.map((key, i) => ({
    key,
    label: STAGE_LABEL[key],
    value: counts[i],
    conv: i > 0 ? pct(counts[i], counts[i - 1]) : null,
  }));

  let estimatedRows = 0;
  const valueAtOrBeyond = (stage: CanonicalStage): number =>
    ds.records
      .filter((r) => stageIndex(r.stage) >= stageIndex(stage))
      .reduce((sum, r) => {
        if (r.amount == null) {
          estimatedRows += 1;
          return sum + ds.avgDealFallback;
        }
        return sum + r.amount;
      }, 0);

  return {
    stages,
    pipelineValue: valueAtOrBeyond("sqo"),
    cwpValue: valueAtOrBeyond("cwp"),
    estimatedRows,
  };
}

export interface QualityResult {
  total: number;
  duplicates: number;
  missingFieldRecords: number;
  stale: number;
  score: number; // 0..1 composite
  perRecord: RecordQuality[];
}

const REQUIRED_FIELDS: (keyof LeadRecord)[] = ["createdAt", "stage", "owner"];

// Stale = no activity within `staleDays` of the reference date. The reference is
// passed in (never read from the clock) to keep this function pure/testable.
export function computeQuality(
  ds: Dataset,
  referenceISO: string,
  staleDays = 30
): QualityResult {
  const ref = new Date(referenceISO).getTime();
  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  const seenEmail = new Map<string, number>();
  const seenId = new Map<string, number>();

  const perRecord: RecordQuality[] = ds.records.map((r) => {
    const missingFields = REQUIRED_FIELDS.filter((f) => {
      const v = r[f];
      return v == null || v === "";
    }) as string[];

    const emailKey = r.email?.trim().toLowerCase();
    const idKey = r.id?.trim();
    let duplicate = false;
    if (emailKey) {
      duplicate = (seenEmail.get(emailKey) ?? 0) > 0;
      seenEmail.set(emailKey, (seenEmail.get(emailKey) ?? 0) + 1);
    }
    if (idKey) {
      const dupId = (seenId.get(idKey) ?? 0) > 0;
      duplicate = duplicate || dupId;
      seenId.set(idKey, (seenId.get(idKey) ?? 0) + 1);
    }

    const activity = r.lastActivityAt ?? r.createdAt;
    const stale = activity ? ref - new Date(activity).getTime() > staleMs : true;

    return { id: r.id, duplicate, missingFields, stale };
  });

  const total = ds.records.length;
  const duplicates = perRecord.filter((q) => q.duplicate).length;
  const missingFieldRecords = perRecord.filter((q) => q.missingFields.length > 0).length;
  const stale = perRecord.filter((q) => q.stale).length;

  // Composite: each issue class penalizes the clean ratio, capped at 0.
  const issues = duplicates + missingFieldRecords + stale;
  const score = total === 0 ? 0 : Math.max(0, 1 - issues / (total * 3));

  return { total, duplicates, missingFieldRecords, stale, score, perRecord };
}

export interface BdrRow {
  owner: string;
  region?: string;
  target: number;
  attained: number;
  attainment: number;
}
export interface BdrResult {
  rows: BdrRow[];
  target: number;
  attained: number;
  attainment: number;
}

// Attained = qualified opportunities (records at SQL or beyond) per owner.
export function computeBdr(ds: Dataset, qualifiedFrom: CanonicalStage = "sql"): BdrResult {
  const attainedByOwner = new Map<string, number>();
  for (const r of ds.records) {
    if (stageIndex(r.stage) >= stageIndex(qualifiedFrom)) {
      attainedByOwner.set(r.owner, (attainedByOwner.get(r.owner) ?? 0) + 1);
    }
  }
  const rows: BdrRow[] = ds.targets.map((t: BdrTarget) => {
    const attained = attainedByOwner.get(t.owner) ?? 0;
    return { owner: t.owner, region: t.region, target: t.target, attained, attainment: pct(attained, t.target) };
  });
  const target = rows.reduce((a, r) => a + r.target, 0);
  const attained = rows.reduce((a, r) => a + r.attained, 0);
  return { rows, target, attained, attainment: pct(attained, target) };
}

export type Health = "good" | "watch" | "risk";
export function healthOf(v: number, good: number, watch: number): Health {
  return v >= good ? "good" : v >= watch ? "watch" : "risk";
}

// Convenience: everything the dashboard and the AI narrator need, computed once.
export function computeSnapshot(ds: Dataset, referenceISO: string) {
  const funnel = computeFunnel(ds);
  const quality = computeQuality(ds, referenceISO);
  const bdr = computeBdr(ds);
  return { funnel, quality, bdr };
}
