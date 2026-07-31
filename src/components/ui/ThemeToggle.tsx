import { Moon, Sun } from "lucide-react";
import type { Theme } from "../../theme";
import { t, type Lang } from "../../i18n";

export function ThemeToggle({
  theme,
  toggle,
  lang,
}: {
  theme: Theme;
  toggle: () => void;
  lang: Lang;
}) {
  const next = theme === "dark" ? t(lang, "theme.light") : t(lang, "theme.dark");
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md float-sm bg-panel2 text-dim transition-colors hover:text-text"
      aria-label={next}
      title={next}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
