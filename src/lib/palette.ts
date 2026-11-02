/**
 * The student's theme: which set of neutrals (background, cards, lines, text)
 * and which default accent the platform wears. Forest is the platform's own and
 * carries no attribute. The light/dark switch and the accent colour still work on
 * top of any theme.
 */
import { useSyncExternalStore } from "react";

const KEY = "ai.palette";
const listeners = new Set<() => void>();

export type PaletteKey = "forest" | "slate" | "sand" | "rose" | "mono" | "dracula" | "nord" | "tokyo" | "monokai" | "solarized";

export const PALETTES: { key: PaletteKey; label: string; note: string; bg: string; ink: string; brand: string }[] = [
  { key: "forest", label: "Forest", note: "The platform's own", bg: "#f7f8f4", ink: "#192d28", brand: "#176b55" },
  { key: "slate", label: "Slate", note: "Cool and calm", bg: "#f5f7fa", ink: "#14202e", brand: "#2f5fd0" },
  { key: "sand", label: "Sand", note: "Warm paper", bg: "#faf6ef", ink: "#2b2218", brand: "#b45309" },
  { key: "rose", label: "Rose", note: "Soft and bright", bg: "#fbf5f6", ink: "#2d1a20", brand: "#be185d" },
  { key: "mono", label: "Mono", note: "Black and white", bg: "#f6f6f6", ink: "#111111", brand: "#111111" },
  { key: "dracula", label: "Dracula", note: "Purple and pink on charcoal", bg: "#fffbeb", ink: "#1f1f1f", brand: "#644ac9" },
  { key: "nord", label: "Nord", note: "Arctic blues", bg: "#eceff4", ink: "#2e3440", brand: "#5e81ac" },
  { key: "tokyo", label: "Tokyo Night", note: "Deep indigo", bg: "#e1e2e7", ink: "#343b58", brand: "#34548a" },
  { key: "monokai", label: "Monokai", note: "Olive with lime", bg: "#faf9f5", ink: "#272822", brand: "#6a9a0a" },
  { key: "solarized", label: "Solarized", note: "Teal and cream", bg: "#fdf6e3", ink: "#073642", brand: "#268bd2" },
];

function read(): PaletteKey {
  try {
    const v = localStorage.getItem(KEY);
    return PALETTES.some((p) => p.key === v) ? (v as PaletteKey) : "forest";
  } catch {
    return "forest";
  }
}

let current: PaletteKey = read();

function apply(key: PaletteKey): void {
  const root = document.documentElement;
  if (key === "forest") root.removeAttribute("data-palette");
  else root.setAttribute("data-palette", key);
}

export function getPalette(): PaletteKey {
  return current;
}

export function setPalette(key: PaletteKey): void {
  current = key;
  try {
    if (key === "forest") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, key);
  } catch {
    /* the choice still holds for this page */
  }
  apply(key);
  listeners.forEach((l) => l());
}

/** Before the first paint. */
export function initPalette(): void {
  apply(current);
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function subscribePalette(l: () => void): () => void {
  return subscribe(l);
}

export function usePalette(): PaletteKey {
  return useSyncExternalStore(subscribe, getPalette, () => "forest" as PaletteKey);
}
