import type { Dataset } from "./core/schema";

// Lightweight persistence, mirroring the Campaign Intelligence lesson: save the
// current dataset (with its reference date) to localStorage, degrade to an
// in-memory store when localStorage is unavailable, and say which happened.

export interface SavedDataset {
  id: string;
  label: string;
  savedAt: number;
  referenceISO: string;
  dataset: Dataset;
}

const KEY = "bdcockpit.saves";
const MAX = 20;
const mem: SavedDataset[] = [];
let durable: boolean | null = null;

function probe(): boolean {
  if (durable !== null) return durable;
  try {
    localStorage.setItem("bdcockpit.probe", "1");
    localStorage.removeItem("bdcockpit.probe");
    durable = true;
  } catch {
    durable = false;
  }
  return durable;
}

function readAll(): SavedDataset[] {
  if (probe()) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as SavedDataset[];
    } catch {
      /* fall through to memory */
    }
    return [];
  }
  return [...mem];
}

function writeAll(list: SavedDataset[]): boolean {
  if (probe()) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch {
      durable = false;
    }
  }
  mem.length = 0;
  mem.push(...list);
  return false;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function listSaves(): SavedDataset[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveDataset(
  dataset: Dataset,
  referenceISO: string,
  label: string
): { mode: "durable" | "session" } {
  const list = readAll();
  const snapshot: SavedDataset = {
    id: uid(),
    label: label.trim() || dataset.label,
    savedAt: Date.now(),
    referenceISO,
    dataset,
  };
  const next = [snapshot, ...list].slice(0, MAX);
  const durableWrite = writeAll(next);
  return { mode: durableWrite ? "durable" : "session" };
}

export function removeSave(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}
