import { ShieldCheck } from "lucide-react";
import { Panel } from "../ui/Panel";
import { healthOf, type QualityResult } from "../../core/compute";
import { QualityGauge } from "../charts/QualityGauge";
import { fmtInt } from "../../format";
import { t, type Lang } from "../../i18n";

export function QualityPanel({ quality, lang }: { quality: QualityResult; lang: Lang }) {
  const health = healthOf(quality.score, 0.85, 0.7);
  const cleanRecords = Math.max(
    0,
    quality.total - quality.duplicates - quality.missingFieldRecords - quality.stale
  );

  const cells: { label: string; value: number; tone: string }[] = [
    { label: t(lang, "quality.duplicates"), value: quality.duplicates, tone: "text-risk" },
    { label: t(lang, "quality.missing"), value: quality.missingFieldRecords, tone: "text-watch" },
    { label: t(lang, "quality.stale"), value: quality.stale, tone: "text-watch" },
    { label: t(lang, "quality.clean"), value: cleanRecords, tone: "text-good" },
  ];

  return (
    <Panel title={t(lang, "panel.quality")} kicker={t(lang, "panel.quality.kicker")} icon={ShieldCheck}>
      <div className="flex items-center gap-4">
        <QualityGauge score={quality.score} health={health} lang={lang} />
        <div className="grid flex-1 grid-cols-2 gap-2">
          {cells.map((c) => (
            <div key={c.label} className="float-sm rounded-2xl px-3 py-2.5 text-center">
              <div className={`font-mono text-lg font-semibold tabular-nums ${c.tone}`}>
                {fmtInt(c.value, lang)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-faint">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 text-[11px] text-faint">
        {fmtInt(quality.total, lang)} {t(lang, "quality.records")}
      </div>
    </Panel>
  );
}
