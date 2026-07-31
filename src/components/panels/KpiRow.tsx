import { TrendingUp, GitCompareArrows, ShieldCheck, Target } from "lucide-react";
import { Tile } from "../ui/Tile";
import { healthOf, pct } from "../../core/compute";
import type { computeSnapshot } from "../../core/compute";
import { fmtUSD, fmtPct } from "../../format";
import { t, type Lang } from "../../i18n";

type Snapshot = ReturnType<typeof computeSnapshot>;

export function KpiRow({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const leadCount = snap.funnel.stages.find((s) => s.key === "lead")?.value ?? 0;
  const cwpCount = snap.funnel.stages.find((s) => s.key === "cwp")?.value ?? 0;
  const leadToCwp = pct(cwpCount, leadCount);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label={t(lang, "kpi.pipeline")}
        value={fmtUSD(snap.funnel.pipelineValue, lang)}
        sub={snap.funnel.estimatedRows ? `${snap.funnel.estimatedRows} ${t(lang, "prov.estimated")}` : undefined}
        icon={TrendingUp}
      />
      <Tile
        label={t(lang, "kpi.lead_cwp")}
        value={fmtPct(leadToCwp, lang, 1)}
        health={healthOf(leadToCwp, 0.03, 0.015)}
        icon={GitCompareArrows}
      />
      <Tile
        label={t(lang, "kpi.data_quality")}
        value={fmtPct(snap.quality.score, lang)}
        health={healthOf(snap.quality.score, 0.85, 0.7)}
        icon={ShieldCheck}
      />
      <Tile
        label={t(lang, "kpi.bdr")}
        value={fmtPct(snap.bdr.attainment, lang)}
        health={healthOf(snap.bdr.attainment, 1, 0.85)}
        icon={Target}
      />
    </div>
  );
}
