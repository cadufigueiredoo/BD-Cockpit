import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Eyebrow } from "./Eyebrow";

// A borderless, floating surface. Depth comes from layered shadows (`.float`),
// not an outline. An optional icon chip and a gradient hairline give the header
// a designed, three-dimensional feel.
export function Panel({
  title,
  kicker,
  icon: Icon,
  right,
  children,
  className = "",
}: {
  title: string;
  kicker?: string;
  icon?: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`float rounded-3xl ${className}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-signal/20 to-cyanx/10 text-signal float-sm">
              <Icon size={18} />
            </span>
          ) : null}
          <div className="min-w-0">
            {kicker ? <Eyebrow>{kicker}</Eyebrow> : null}
            <h2 className="text-[15px] font-semibold leading-tight text-text">{title}</h2>
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      <div className="mx-5 mt-3 hairline opacity-60" />
      <div className="px-5 pb-5 pt-4">{children}</div>
    </section>
  );
}
