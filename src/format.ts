// Presentation-only formatting helpers. No business logic — every figure is
// already computed by src/core. These just render it for a locale.

import type { Lang } from "./i18n";

const locale = (lang: Lang) => (lang === "pt" ? "pt-BR" : "en-US");

export function fmtInt(v: number, lang: Lang): string {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 0 }).format(v || 0);
}

// Compact currency (USD) — e.g. $1.2M — for KPI tiles and value readouts.
export function fmtUSD(v: number, lang: Lang, compact = true): string {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(v || 0);
}

export function fmtPct(ratio: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(locale(lang), {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(ratio) ? ratio : 0);
}
