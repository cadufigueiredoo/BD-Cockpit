import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Health } from "../../core/compute";
import { HEALTH_TEXT } from "./StatusDot";

const ACCENT: Record<Health, string> = {
  good: "bg-good",
  watch: "bg-watch",
  risk: "bg-risk",
};

// A KPI readout: borderless, floating, with a left accent rail, an icon, and a
// hero mono value. Optional health tints both the value and the accent.
export function Tile({
  label,
  value,
  sub,
  health,
  icon: Icon,
  title,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  health?: Health;
  icon?: LucideIcon;
  title?: string;
}) {
  return (
    <div className="float-sm float-lift relative overflow-hidden rounded-2xl px-4 py-3.5" title={title}>
      <span className={`absolute inset-y-3 left-0 w-1 rounded-full ${health ? ACCENT[health] : "bg-signal"}`} />
      <div className="flex items-center justify-between pl-2.5">
        <div className="text-[11px] font-medium uppercase tracking-wide text-dim">{label}</div>
        {Icon ? <Icon size={15} className="text-faint" /> : null}
      </div>
      <div
        className={`mt-1.5 pl-2.5 font-mono text-[26px] font-semibold tabular-nums leading-none ${
          health ? HEALTH_TEXT[health] : "text-text"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="mt-1.5 pl-2.5 text-xs text-faint">{sub}</div> : null}
    </div>
  );
}
