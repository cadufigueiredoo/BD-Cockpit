import type { ReactNode } from "react";

// Small uppercase label above a title. Quiet by design.
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
      {children}
    </div>
  );
}
