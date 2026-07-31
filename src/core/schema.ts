import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Canonical data model. Real CRM exports are messy and vary by column name;
// everything is normalized to these types before any metric is computed.
// This boundary is what keeps the deterministic core honest: numbers can only
// come from validated, provenance-tagged records.
// ────────────────────────────────────────────────────────────────────────────

export const STAGE_ORDER = ["lead", "mql", "sql", "sqo", "cwp"] as const;
export type CanonicalStage = (typeof STAGE_ORDER)[number];

export const STAGE_LABEL: Record<CanonicalStage, string> = {
  lead: "Leads",
  mql: "MQL",
  sql: "SQL",
  sqo: "SQO / Pipeline",
  cwp: "Closed Won (CWP)",
};

// A single normalized record (a lead or opportunity from the CRM export).
export interface LeadRecord {
  id: string;
  createdAt: string; // ISO date
  lastActivityAt?: string; // ISO date, drives "stale" detection
  stage: CanonicalStage; // furthest stage reached
  owner: string; // BDR / rep name
  region?: string;
  amount?: number; // deal value in reporting currency
  email?: string; // used for duplicate detection
  // provenance: which source file / row each record came from (never invent)
  _source: { file: string; row: number };
}

// Per-record quality assessment produced during validation.
export interface RecordQuality {
  id: string;
  duplicate: boolean;
  missingFields: string[];
  stale: boolean;
}

// Targets per BDR (from a targets file or the preset). Deterministic input.
export interface BdrTarget {
  owner: string;
  region?: string;
  target: number; // qualified opportunities expected in the period
}

export interface Dataset {
  label: string; // e.g. "Uploaded 2026-07-25" or "Preset · Americas FY26"
  periodLabel: string;
  currency: string;
  avgDealFallback: number; // used only when a record has no amount, flagged as estimated
  records: LeadRecord[];
  targets: BdrTarget[];
  source: "preset" | "upload";
}

// ── Zod schemas for the ingestion boundary ──────────────────────────────────
// The raw parsed row (arbitrary string keys) before mapping.
export const RawRowSchema = z.record(z.string(), z.string());
export type RawRow = z.infer<typeof RawRowSchema>;

// The mapping the user confirms in the Import Wizard: canonical field -> column.
export const ColumnMappingSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lastActivityAt: z.string().optional(),
  stage: z.string(),
  owner: z.string(),
  region: z.string().optional(),
  amount: z.string().optional(),
  email: z.string().optional(),
});
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

// Maps the user's raw stage strings to canonical stages, e.g.
// { "Marketing Qualified": "mql", "Closed Won": "cwp" }.
export const StageMappingSchema = z.record(z.string(), z.enum(STAGE_ORDER));
export type StageMapping = z.infer<typeof StageMappingSchema>;

export interface ValidationIssue {
  row: number;
  field: string;
  message: string;
}
