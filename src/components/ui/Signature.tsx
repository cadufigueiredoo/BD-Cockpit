import { t, type Lang } from "../../i18n";

// Footer signature — present in every view and both themes.
export function Signature({ lang, demo }: { lang: Lang; demo?: boolean }) {
  return (
    <footer className="mt-8 border-t border-line px-1 py-4 text-center text-xs text-faint">
      {demo ? <span>{t(lang, "footer.demo")} · </span> : null}
      <span>{t(lang, "footer.by")} </span>
      <a
        href="https://www.linkedin.com/in/carloseduardovf/"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-signal hover:underline"
      >
        Carlos Eduardo
      </a>
    </footer>
  );
}
