import { useEffect, useState, type FormEvent } from "react";
import { Lock, Loader2, Moon, Sun } from "lucide-react";
import { persistLead, submitLead, type Lead } from "../lead";
import type { Theme } from "../theme";

// Registration gate shown before the tool unlocks. Self-contained and
// bilingual, it defaults to English on every tool (per brand owner) and keeps a
// PT|EN toggle. It reads the app's CSS variables (--signal, --panel, --text…),
// so it automatically wears each tool's brand color and light/dark theme.

const LINKEDIN = "https://www.linkedin.com/in/carloseduardovf/";

type GLang = "en" | "pt";

const COPY = {
  en: {
    kicker: "Restricted access",
    ipPre: "This tool is the intellectual property of ",
    ipName: "Carlos Eduardo",
    ipPost: ".",
    sub: "Complete your registration below to access it.",
    name: "Full name",
    email: "Work email",
    company: "Company",
    phone: "Phone",
    optional: "optional",
    submit: "Access tool",
    submitting: "Submitting…",
    required: "Required",
    bademail: "Enter a valid email.",
    error: "Couldn't submit. Please check your connection and try again.",
    privacy: "Used only to know who's accessing the tool.",
    light: "Light",
    dark: "Dark",
  },
  pt: {
    kicker: "Acesso restrito",
    ipPre: "Esta ferramenta é propriedade intelectual de ",
    ipName: "Carlos Eduardo",
    ipPost: ".",
    sub: "Conclua seu registro abaixo para acessá-la.",
    name: "Nome completo",
    email: "E-mail corporativo",
    company: "Empresa",
    phone: "Telefone",
    optional: "opcional",
    submit: "Acessar ferramenta",
    submitting: "Enviando…",
    required: "Obrigatório",
    bademail: "Informe um e-mail válido.",
    error: "Não foi possível enviar. Verifique a conexão e tente de novo.",
    privacy: "Usado apenas para saber quem acessa a ferramenta.",
    light: "Claro",
    dark: "Escuro",
  },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadGate({
  source,
  onDone,
  theme,
  toggleTheme,
}: {
  source: string;
  onDone: (lead: Lead) => void;
  theme: Theme;
  toggleTheme: () => void;
}) {
  const [lang, setLang] = useState<GLang>("en");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const c = COPY[lang];

  // Lock background scroll while the gate is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const nameErr = touched && !name.trim() ? c.required : null;
  const companyErr = touched && !company.trim() ? c.required : null;
  const emailErr = touched ? (!email.trim() ? c.required : !EMAIL_RE.test(email.trim()) ? c.bademail : null) : null;
  const valid = name.trim() && company.trim() && EMAIL_RE.test(email.trim());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErr(null);
    if (!valid) return;
    const lead: Lead = {
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      phone: phone.trim() || undefined,
      ts: Date.now(),
    };
    setBusy(true);
    try {
      await submitLead({ ...lead, source, lang });
      persistLead(lead);
      onDone(lead);
    } catch {
      setErr(c.error);
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl bg-panel2 px-3.5 py-2.5 text-[14px] text-text placeholder:text-faint " +
    "shadow-[var(--shadow-sm),inset_0_1px_0_var(--edge-hi)] outline-none focus:ring-2 focus:ring-signal/60";
  const labelCls = "mb-1 block text-[12px] font-medium text-dim";

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto p-4"
         style={{ background: "var(--atmo), rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <div className="float-raised w-full max-w-[440px] rounded-3xl p-6 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <span className="brand-glow grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-signal to-cyanx">
            <Lock size={18} className="text-white" />
          </span>
          <div className="flex items-center gap-2">
            <div className="float-sm inline-flex overflow-hidden rounded-xl text-xs">
              {(["en", "pt"] as GLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 uppercase transition-colors ${lang === l ? "bg-signal text-white" : "text-dim hover:text-text"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="float-sm inline-flex h-8 w-8 items-center justify-center rounded-xl bg-panel2 text-dim transition-colors hover:text-text"
              aria-label={theme === "dark" ? c.light : c.dark}
              title={theme === "dark" ? c.light : c.dark}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-signal">{c.kicker}</p>
        <h2 className="text-[19px] font-semibold leading-snug tracking-tight text-text">
          {c.ipPre}
          <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" className="text-signal underline decoration-signal/40 underline-offset-2 hover:decoration-signal">
            {c.ipName}
          </a>
          {c.ipPost}
        </h2>
        <p className="mt-1.5 text-[13.5px] text-dim">{c.sub}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate>
          <div>
            <label className={labelCls} htmlFor="lg-name">{c.name}</label>
            <input id="lg-name" className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            {nameErr && <p className="mt-1 text-[11px] text-risk">{nameErr}</p>}
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-email">{c.email}</label>
            <input id="lg-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            {emailErr && <p className="mt-1 text-[11px] text-risk">{emailErr}</p>}
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-company">{c.company}</label>
            <input id="lg-company" className={field} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
            {companyErr && <p className="mt-1 text-[11px] text-risk">{companyErr}</p>}
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-phone">
              {c.phone} <span className="text-faint">({c.optional})</span>
            </label>
            <input id="lg-phone" type="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>

          {err && <p className="text-[12px] text-risk">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="brand-glow mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? c.submitting : c.submit}
          </button>
          <p className="text-center text-[11px] text-faint">{c.privacy}</p>
        </form>
      </div>
    </div>
  );
}
