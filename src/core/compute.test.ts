import { describe, it, expect } from "vitest";
import { computeFunnel, computeQuality, computeBdr, pct, healthOf } from "./compute";
import type { Dataset, LeadRecord } from "./schema";

function rec(p: Partial<LeadRecord> & { id: string; stage: LeadRecord["stage"]; owner: string }): LeadRecord {
  return {
    createdAt: "2026-07-01T00:00:00.000Z",
    lastActivityAt: "2026-07-20T00:00:00.000Z",
    _source: { file: "test", row: 0 },
    ...p,
  };
}

function ds(records: LeadRecord[], targets = [{ owner: "Ana", target: 2 }]): Dataset {
  return {
    label: "test",
    periodLabel: "test",
    currency: "USD",
    avgDealFallback: 1000,
    records,
    targets,
    source: "upload",
  };
}

describe("pct", () => {
  it("guards divide by zero", () => {
    expect(pct(5, 0)).toBe(0);
    expect(pct(1, 4)).toBe(0.25);
  });
});

describe("computeFunnel", () => {
  it("counts records at-or-beyond each stage", () => {
    const d = ds([
      rec({ id: "1", stage: "lead", owner: "Ana" }),
      rec({ id: "2", stage: "mql", owner: "Ana" }),
      rec({ id: "3", stage: "sql", owner: "Ana" }),
      rec({ id: "4", stage: "cwp", owner: "Ana", amount: 5000 }),
    ]);
    const f = computeFunnel(d);
    const byKey = Object.fromEntries(f.stages.map((s) => [s.key, s.value]));
    expect(byKey.lead).toBe(4); // everyone is at least a lead
    expect(byKey.mql).toBe(3);
    expect(byKey.sql).toBe(2);
    expect(byKey.sqo).toBe(1); // only the cwp record is at/beyond sqo
    expect(byKey.cwp).toBe(1);
  });

  it("uses fallback for missing amounts and flags estimates", () => {
    const d = ds([
      rec({ id: "1", stage: "sqo", owner: "Ana" }), // no amount -> fallback 1000
      rec({ id: "2", stage: "cwp", owner: "Ana", amount: 4000 }),
    ]);
    const f = computeFunnel(d);
    expect(f.pipelineValue).toBe(5000);
    expect(f.cwpValue).toBe(4000);
    expect(f.estimatedRows).toBeGreaterThan(0);
  });
});

describe("computeQuality", () => {
  it("detects duplicates, missing fields and stale records", () => {
    const d = ds([
      rec({ id: "1", stage: "mql", owner: "Ana", email: "a@x.com" }),
      rec({ id: "2", stage: "mql", owner: "Ana", email: "a@x.com" }), // dup email
      rec({ id: "3", stage: "mql", owner: "", email: "b@x.com" }), // missing owner
      rec({ id: "4", stage: "mql", owner: "Ana", email: "c@x.com", lastActivityAt: "2026-01-01T00:00:00.000Z" }), // stale
    ]);
    const q = computeQuality(d, "2026-07-25T00:00:00.000Z", 30);
    expect(q.duplicates).toBe(1);
    expect(q.missingFieldRecords).toBe(1);
    expect(q.stale).toBe(1);
    expect(q.score).toBeGreaterThan(0);
    expect(q.score).toBeLessThanOrEqual(1);
  });

  it("is deterministic against a fixed reference date", () => {
    const d = ds([rec({ id: "1", stage: "mql", owner: "Ana" })]);
    const a = computeQuality(d, "2026-07-25T00:00:00.000Z");
    const b = computeQuality(d, "2026-07-25T00:00:00.000Z");
    expect(a.score).toBe(b.score);
  });
});

describe("computeBdr", () => {
  it("counts qualified opps per owner against targets", () => {
    const d = ds(
      [
        rec({ id: "1", stage: "sql", owner: "Ana" }),
        rec({ id: "2", stage: "sqo", owner: "Ana" }),
        rec({ id: "3", stage: "mql", owner: "Ana" }), // not qualified (below sql)
      ],
      [{ owner: "Ana", target: 4 }]
    );
    const b = computeBdr(d);
    expect(b.rows[0].attained).toBe(2);
    expect(b.rows[0].attainment).toBe(0.5);
    expect(b.attainment).toBe(0.5);
  });
});

describe("healthOf", () => {
  it("bands values correctly", () => {
    expect(healthOf(1.0, 1.0, 0.85)).toBe("good");
    expect(healthOf(0.9, 1.0, 0.85)).toBe("watch");
    expect(healthOf(0.5, 1.0, 0.85)).toBe("risk");
  });
});
