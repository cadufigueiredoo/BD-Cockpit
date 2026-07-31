import type { LeadRecord, Dataset, BdrTarget } from "../core/schema";

// Uploads carry no targets file. Apply a transparent planning-default target per
// distinct owner so BDR tracking stays meaningful; the UI states the assumption.
export const DEFAULT_BDR_TARGET = 40;

export function buildTargets(records: LeadRecord[]): BdrTarget[] {
  const regionByOwner = new Map<string, string | undefined>();
  for (const r of records) {
    const owner = r.owner?.trim();
    if (!owner) continue;
    if (!regionByOwner.has(owner)) regionByOwner.set(owner, r.region);
  }
  return [...regionByOwner.entries()].map(([owner, region]) => ({
    owner,
    region,
    target: DEFAULT_BDR_TARGET,
  }));
}

export function buildUploadDataset(records: LeadRecord[], fileName: string): Dataset {
  return {
    label: `Uploaded · ${fileName}`,
    periodLabel: new Date().toISOString().slice(0, 10),
    currency: "USD",
    avgDealFallback: 42000,
    records,
    targets: buildTargets(records),
    source: "upload",
  };
}
