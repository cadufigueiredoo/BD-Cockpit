import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import type { Health } from "../../core/compute";
import { fmtPct } from "../../format";
import { type Lang } from "../../i18n";

const HEALTH_VAR: Record<Health, string> = {
  good: "var(--good)",
  watch: "var(--watch)",
  risk: "var(--risk)",
};

// A radial gauge of the deterministic data-quality score. The score itself is
// computed by the core; this only renders it.
export function QualityGauge({
  score,
  health,
  lang,
}: {
  score: number;
  health: Health;
  lang: Lang;
}) {
  const data = [{ name: "score", value: Math.round(score * 100), fill: HEALTH_VAR[health] }];

  return (
    <div className="relative h-[150px] w-[150px] shrink-0">
      <ResponsiveContainer>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: "var(--panel3)" }}
            dataKey="value"
            cornerRadius={12}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-mono text-2xl font-semibold leading-none text-text">
            {fmtPct(score, lang)}
          </div>
        </div>
      </div>
    </div>
  );
}
