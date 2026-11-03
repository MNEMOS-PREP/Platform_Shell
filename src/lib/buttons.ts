/**
 * The shape of the main buttons: independent of the theme and the accent colour.
 * Rounded is the platform's own and carries no attribute.
 */
import { useSyncExternalStore } from "react";

const KEY = "ai.buttons";
const listeners = new Set<() => void>();

export type ButtonStyle = "rounded" | "pill" | "square" | "outline" | "soft";

export const BUTTON_STYLES: { key: ButtonStyle; label: string }[] = [
  { key: "rounded", label: "Rounded" },
  { key: "pill", label: "Pill" },
  { key: "square", label: "Square" },
  { key: "outline", label: "Outline" },
  { key: "soft", label: "Soft" },
];

function read(): ButtonStyle {
  try {
    const v = localStorage.getItem(KEY);
    return BUTTON_STYLES.some((b) => b.key === v) ? (v as ButtonStyle) : "rounded";
  } catch {
    return "rounded";
  }
}

let current: ButtonStyle = read();

function apply(key: ButtonStyle): void {
  const root = document.documentElement;
  if (key === "rounded") root.removeAttribute("data-buttons");
  else root.setAttribute("data-buttons", key);
}

export function getButtons(): ButtonStyle {
  return current;
}

export function setButtons(key: ButtonStyle): void {
  current = key;
  try {
    if (key === "rounded") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, key);
  } catch {
    /* the choice still holds for this page */
  }
  apply(key);
  listeners.forEach((l) => l());
}

export function initButtons(): void {
  apply(current);
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useButtons(): ButtonStyle {
  return useSyncExternalStore(subscribe, getButtons, () => "rounded" as ButtonStyle);
}
