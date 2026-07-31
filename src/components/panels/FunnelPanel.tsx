import { Filter } from "lucide-react";
import { Panel } from "../ui/Panel";
import type { FunnelResult } from "../../core/compute";
import { fmtInt, fmtPct } from "../../format";
import { t, type Lang } from "../../i18n";

export function FunnelPanel({ funnel, lang }: { funnel: FunnelResult; lang: Lang }) {
  const max = Math.max(1, ...funnel.stages.map((s) => s.value));

  return (
    <Panel title={t(lang, "panel.funnel")} kicker={t(lang, "panel.funnel.kicker")} icon={Filter}>
      <div className="space-y-2.5">
        {funnel.stages.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-dim">{s.label}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded bg-panel2">
              <div
                className="h-full rounded bg-gradient-to-r from-signal to-cyanx"
                style={{ width: `${(s.value / max) * 100}%` }}
              />
              <span className="absolute inset-y-0 left-2 flex items-center font-mono text-xs text-text">
                {fmtInt(s.value, lang)}
              </span>
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-xs text-dim">
              {s.conv == null ? "—" : fmtPct(s.conv, lang, 1)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-faint">
        <span>{t(lang, "funnel.conv")} · {t(lang, "panel.funnel.kicker")}</span>
        {funnel.estimatedRows ? (
          <span title={t(lang, "prov.estimated")}>
            {funnel.estimatedRows} {t(lang, "prov.estimated")}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}
