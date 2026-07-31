import {
  type LeadRecord,
  type ColumnMapping,
  type StageMapping,
  type RawRow,
  type ValidationIssue,
  type CanonicalStage,
  STAGE_ORDER,
} from "../core/schema";

export interface MappingResult {
  records: LeadRecord[];
  issues: ValidationIssue[];
}

// Locale-aware number parse (amounts): the rightmost separator is the decimal.
export function toNum(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.trim().startsWith("-");
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot > -1 && lastComma > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const parts = s.split(",");
    const looksThousands = parts.slice(1).every((g) => g.length === 3) && parts[0].length <= 3;
    s = looksThousands ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    const parts = s.split(".");
    const looksThousands = parts.length > 1 && parts.slice(1).every((g) => g.length === 3) && parts[0].length <= 3;
    if (looksThousands) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

// Normalizes a date cell to an ISO string, or "" if unparseable. Accepts ISO
// and common locale formats that Date can parse.
function toISO(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  // dd/mm/yyyy → try swapping to mm/dd/yyyy
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, a, b, y] = m;
    const alt = new Date(`${b}/${a}/${y}`);
    if (!Number.isNaN(alt.getTime())) return alt.toISOString();
  }
  return "";
}

const cell = (row: RawRow, col?: string): string => (col ? (row[col] ?? "").trim() : "");

export function applyMapping(
  rows: RawRow[],
  mapping: ColumnMapping,
  stageMap: StageMapping,
  file: string
): MappingResult {
  const records: LeadRecord[] = [];
  const issues: ValidationIssue[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // 1-based + header row
    const push = (field: string, message: string) => issues.push({ row: rowNum, field, message });

    const rawId = cell(row, mapping.id);
    const rawStage = cell(row, mapping.stage);
    const owner = cell(row, mapping.owner);

    // A fully empty row is noise, not an error.
    if (!rawId && !rawStage && !owner) return;

    const id = rawId || `ROW-${rowNum}`;
    if (!rawId) push("id", "Missing record id — generated from row number");

    let stage = stageMap[rawStage] as CanonicalStage | undefined;
    if (!stage || !STAGE_ORDER.includes(stage)) {
      push("stage", `Unmapped stage "${rawStage}" — defaulted to lead`);
      stage = "lead";
    }

    const createdAt = toISO(cell(row, mapping.createdAt));
    if (!createdAt) push("createdAt", "Missing or invalid created date");

    if (!owner) push("owner", "Missing owner");

    const record: LeadRecord = {
      id,
      createdAt,
      stage,
      owner,
      _source: { file, row: rowNum },
    };

    const lastActivity = toISO(cell(row, mapping.lastActivityAt));
    if (lastActivity) record.lastActivityAt = lastActivity;

    const region = cell(row, mapping.region);
    if (region) record.region = region;

    const email = cell(row, mapping.email);
    if (email) record.email = email;

    const amount = toNum(cell(row, mapping.amount));
    if (amount != null && amount >= 0) record.amount = amount;

    records.push(record);
  });

  return { records, issues };
}
