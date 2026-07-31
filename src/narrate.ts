import type { Lang } from "./i18n";

// Priority levels the narrator returns, most to least urgent.
export type Priority = "P1" | "P2" | "P3";

export interface WbrAction {
  title: string;
  detail: string;
  priority: Priority;
}
export interface Wbr {
  headline: string;
  summary: string;
  actions: WbrAction[];
}

// Calls the serverless narrator with the ALREADY-COMPUTED metrics. The AI never
// sees raw records, only the finished numbers. Throws on any failure so the
// panel can render its own error copy.
export async function postNarrate(metrics: unknown, lang: Lang): Promise<Wbr> {
  const res = await fetch("/api/narrate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ metrics, lang }),
  });

  if (res.status === 404) {
    throw new Error(
      "The /api/narrate endpoint was not found. Deploy on Vercel, or run `vercel dev` instead of `npm run dev`."
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    throw new Error("The narrator returned an unreadable response.");
  }

  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status}).`;
    throw new Error(msg);
  }

  const wbr = data as Partial<Wbr>;
  if (!wbr || typeof wbr.headline !== "string" || !Array.isArray(wbr.actions)) {
    throw new Error("The narrator returned an unexpected shape.");
  }
  return {
    headline: wbr.headline,
    summary: typeof wbr.summary === "string" ? wbr.summary : "",
    actions: wbr.actions.filter((a): a is WbrAction => Boolean(a) && typeof a.title === "string"),
  };
}
