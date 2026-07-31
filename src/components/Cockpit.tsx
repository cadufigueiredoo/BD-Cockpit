import { useMemo } from "react";
import { computeSnapshot } from "../core/compute";
import type { Dataset } from "../core/schema";
import type { Lang } from "../i18n";
import { KpiRow } from "./panels/KpiRow";
import { FunnelPanel } from "./panels/FunnelPanel";
import { QualityPanel } from "./panels/QualityPanel";
import { BdrPanel } from "./panels/BdrPanel";
import { WbrPanel, type WbrMetrics } from "./panels/WbrPanel";

export function Cockpit({
  dataset,
  referenceISO,
  lang,
}: {
  dataset: Dataset;
  referenceISO: string;
  lang: Lang;
}) {
  const snap = useMemo(() => computeSnapshot(dataset, referenceISO), [dataset, referenceISO]);

  // Compact metrics for the narrator (deterministic figures only).
  const metrics: WbrMetrics = useMemo(
    () => ({
      label: dataset.label,
      period: dataset.periodLabel,
      currency: dataset.currency,
      funnel: snap.funnel.stages.map((s) => ({ stage: s.label, count: s.value, conversion: s.conv })),
      pipelineValue: snap.funnel.pipelineValue,
      cwpValue: snap.funnel.cwpValue,
      quality: {
        score: snap.quality.score,
        duplicates: snap.quality.duplicates,
        missingFields: snap.quality.missingFieldRecords,
        stale: snap.quality.stale,
        total: snap.quality.total,
      },
      bdr: {
        attainment: snap.bdr.attainment,
        target: snap.bdr.target,
        attained: snap.bdr.attained,
        reps: snap.bdr.rows.map((r) => ({
          owner: r.owner,
          attained: r.attained,
          target: r.target,
          attainment: r.attainment,
        })),
      },
    }),
    [snap, dataset]
  );

  return (
    <div className="space-y-4">
      <KpiRow snap={snap} lang={lang} />
      <WbrPanel metrics={metrics} lang={lang} />
      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelPanel funnel={snap.funnel} lang={lang} />
        <QualityPanel quality={snap.quality} lang={lang} />
      </div>
      <BdrPanel bdr={snap.bdr} lang={lang} showDefaultNote={dataset.source === "upload"} />
    </div>
  );
}
