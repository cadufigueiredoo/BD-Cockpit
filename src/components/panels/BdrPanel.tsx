import { Target } from "lucide-react";
import { Panel } from "../ui/Panel";
import { healthOf, type BdrResult } from "../../core/compute";
import { fmtInt, fmtPct } from "../../format";
import { t, type Lang } from "../../i18n";

const TONE: Record<"good" | "watch" | "risk", string> = {
  good: "bg-good",
  watch: "bg-watch",
  risk: "bg-risk",
};

export function BdrPanel({
  bdr,
  lang,
  showDefaultNote,
}: {
  bdr: BdrResult;
  lang: Lang;
  showDefaultNote?: boolean;
}) {
  const rows = [...bdr.rows].sort((a, b) => b.attainment - a.attainment);

  return (
    <Panel title={t(lang, "panel.bdr")} kicker={t(lang, "panel.bdr.kicker")} icon={Target}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-faint">
              <th className="py-1.5 pr-2 font-medium">{t(lang, "bdr.owner")}</th>
              <th className="hidden py-1.5 pr-2 font-medium sm:table-cell">{t(lang, "bdr.region")}</th>
              <th className="py-1.5 pr-2 text-right font-medium">{t(lang, "bdr.attained")}</th>
              <th className="py-1.5 pr-2 text-right font-medium">{t(lang, "bdr.target")}</th>
              <th className="py-1.5 font-medium">{t(lang, "bdr.attainment")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const health = healthOf(r.attainment, 1, 0.85);
              return (
                <tr key={r.owner} className="border-t border-line">
                  <td className="max-w-[10rem] truncate py-2 pr-2 font-medium text-text">{r.owner}</td>
                  <td className="hidden py-2 pr-2 text-dim sm:table-cell">{r.region ?? "—"}</td>
                  <td className="py-2 pr-2 text-right font-mono tabular-nums text-text">
                    {fmtInt(r.attained, lang)}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono tabular-nums text-dim">
                    {fmtInt(r.target, lang)}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-panel2">
                        <div
                          className={`h-full ${TONE[health]}`}
                          style={{ width: `${Math.min(100, Math.round(r.attainment * 100))}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-xs text-dim">
                        {fmtPct(r.attainment, lang)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-line font-semibold">
              <td className="py-2 pr-2 text-text" colSpan={2}>
                {t(lang, "bdr.total")}
              </td>
              <td className="py-2 pr-2 text-right font-mono tabular-nums text-text">
                {fmtInt(bdr.attained, lang)}
              </td>
              <td className="py-2 pr-2 text-right font-mono tabular-nums text-dim">
                {fmtInt(bdr.target, lang)}
              </td>
              <td className="py-2 font-mono text-text">{fmtPct(bdr.attainment, lang)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {showDefaultNote ? (
        <div className="mt-3 text-[11px] text-faint">{t(lang, "bdr.default_note")}</div>
      ) : null}
    </Panel>
  );
}
