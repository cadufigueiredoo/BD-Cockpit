import type { Health } from "../../core/compute";

const TONE: Record<Health, string> = {
  good: "bg-good",
  watch: "bg-watch",
  risk: "bg-risk",
};

// Traffic-light health indicator. Status color is content, not decoration.
export function StatusDot({ health, label }: { health: Health; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${TONE[health]}`} aria-hidden />
      {label ? <span className="text-xs text-dim">{label}</span> : null}
    </span>
  );
}

export const HEALTH_TEXT: Record<Health, string> = {
  good: "text-good",
  watch: "text-watch",
  risk: "text-risk",
};
