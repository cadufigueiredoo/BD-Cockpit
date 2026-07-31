import { useEffect, useState } from "react";
import { Sparkles, Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { postNarrate, type Wbr, type Priority } from "../../narrate";
import { t, type Lang } from "../../i18n";

const PRIORITY_STYLE: Record<Priority, string> = {
  P1: "bg-risk/15 text-risk border-risk/30",
  P2: "bg-watch/15 text-watch border-watch/30",
  P3: "bg-panel2 text-dim border-line",
};

// The metrics the narrator receives — already-computed figures only, never raw
// records. Owner names are included only in the aggregate BDR rows.
export interface WbrMetrics {
  label: string;
  period: string;
  currency: string;
  funnel: { stage: string; count: number; conversion: number | null }[];
  pipelineValue: number;
  cwpValue: number;
  quality: { score: number; duplicates: number; missingFields: number; stale: number; total: number };
  bdr: {
    attainment: number;
    target: number;
    attained: number;
    reps: { owner: string; attained: number; target: number; attainment: number }[];
  };
}

export function WbrPanel({ metrics, lang }: { metrics: WbrMetrics; lang: Lang }) {
  const [wbr, setWbr] = useState<Wbr | null>(null);
  // Language the current narrative was generated in — the AI text is fetched
  // per-language, so we track this to re-fetch when the user switches languages.
  const [wbrLang, setWbrLang] = useState<Lang | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setWbr(await postNarrate(metrics, lang));
      setWbrLang(lang);
    } catch {
      setError(t(lang, "wbr.error"));
    } finally {
      setLoading(false);
    }
  }

  // Switching the language toggle must re-translate an already-generated report:
  // the WBR prose is produced by the AI in one language and can't be swapped by
  // relabeling, so re-generate it in the active language when the user switches.
  useEffect(() => {
    if (wbr && wbrLang && wbrLang !== lang && !loading) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function copy() {
    if (!wbr) return;
    const text = [
      wbr.headline,
      "",
      wbr.summary,
      "",
      ...wbr.actions.map((a) => `[${a.priority}] ${a.title} — ${a.detail}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  const action = (
    <div className="flex items-center gap-2">
      {wbr ? (
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md float-sm bg-panel2 px-2.5 py-1.5 text-xs text-dim hover:text-text"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? t(lang, "wbr.copied") : t(lang, "wbr.copy")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md bg-signal px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {wbr ? <RefreshCw size={13} /> : <Sparkles size={13} />}
        {loading ? t(lang, "wbr.loading") : wbr ? t(lang, "wbr.regenerate") : t(lang, "wbr.cta")}
      </button>
    </div>
  );

  return (
    <Panel title={t(lang, "panel.wbr")} kicker={t(lang, "panel.wbr.kicker")} icon={Sparkles} right={action}>
      {!wbr && !loading && !error ? (
        <p className="max-w-2xl text-sm leading-relaxed text-dim">{t(lang, "wbr.blurb")}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-dim">
          <RefreshCw size={15} className="animate-spin" />
          {t(lang, "wbr.loading")}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-risk/30 bg-risk/10 px-3 py-2 text-sm text-risk">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {wbr && !loading ? (
        <div className="space-y-4">
          <div>
            <Eyebrow>{t(lang, "wbr.headline")}</Eyebrow>
            <h3 className="text-lg font-semibold leading-snug text-text">{wbr.headline}</h3>
            {wbr.summary ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">{wbr.summary}</p>
            ) : null}
          </div>

          {wbr.actions.length ? (
            <div>
              <Eyebrow>{t(lang, "wbr.actions")}</Eyebrow>
              <ul className="mt-1 space-y-2">
                {wbr.actions.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg float-sm bg-panel2 px-3 py-2.5"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-5 shrink-0 items-center rounded border px-1.5 font-mono text-[11px] font-semibold ${
                        PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.P3
                      }`}
                    >
                      {a.priority}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text">{a.title}</div>
                      <div className="text-sm text-dim">{a.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
