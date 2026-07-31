import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { RawRow } from "../core/schema";

export interface ParseResult {
  headers: string[];
  rows: RawRow[];
}

// Everything downstream expects string cells (the Zod boundary is z.string()).
function toStringCell(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function normalizeRows(records: Record<string, unknown>[]): ParseResult {
  const headerSet = new Set<string>();
  const rows: RawRow[] = records.map((rec) => {
    const out: RawRow = {};
    for (const key of Object.keys(rec)) {
      const h = key.trim();
      if (!h) continue;
      headerSet.add(h);
      out[h] = toStringCell(rec[key]);
    }
    return out;
  });
  return { headers: [...headerSet], rows };
}

function parseCSV(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return normalizeRows((parsed.data || []).filter((r) => r && typeof r === "object"));
}

function parseXLSX(buf: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return normalizeRows(records);
}

// Reads a dropped/selected file into RawRow[]. Rejects with a sentinel the UI
// surfaces in its own voice — never throws a raw library error at the user.
export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".csv") || file.type === "text/csv") {
      return parseCSV(await file.text());
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      return parseXLSX(await file.arrayBuffer());
    }
    return parseCSV(await file.text());
  } catch {
    throw new Error("parse_failed");
  }
}
