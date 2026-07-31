/** @type {import('tailwindcss').Config} */
// Colors resolve to CSS variables so a single [data-theme] switch flips the
// whole palette (light/dark) with zero component changes.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)", panel: "var(--panel)", panel2: "var(--panel2)", panel3: "var(--panel3)",
        line: "var(--line)", text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)",
        signal: "var(--signal)", cyanx: "var(--cyan)",
        good: "var(--good)", watch: "var(--watch)", risk: "var(--risk)",
      },
      fontFamily: { mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
    },
  },
  plugins: [],
};
