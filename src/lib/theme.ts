/**
 * Light or dark, one setting for the page.
 *
 * Dark is the default (2026-10-03): it is how the products students already
 * think of as premium present themselves (Linear, Vercel, Raycast), and the
 * dark token set was designed alongside the light one, not inverted from it.
 * Light stays a first-class choice — a projector in a bright room wants it —
 * and `?theme=light` is a link that opens the demo in it.
 */
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "ai.theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let current: Theme = read();

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme): void {
  current = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* the choice still holds for this page */
  }
  apply(theme);
  listeners.forEach((listener) => listener());
}

/** The toggle cross-fades the window (theme.css `theme-fading`) where it can. */
export function toggleTheme(): void {
  const next: Theme = current === "dark" ? "light" : "dark";
  const root = document.documentElement;
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    setTheme(next);
    return;
  }
  root.classList.add("theme-fading");
  const clear = () => root.classList.remove("theme-fading");
  document.startViewTransition(() => setTheme(next)).finished.then(clear, clear);
}

/** Before the first paint: a `?theme=` link wins, then the saved choice. */
export function initTheme(): void {
  try {
    const asked = new URLSearchParams(window.location.search).get("theme");
    if (asked === "dark" || asked === "light") {
      setTheme(asked);
      return;
    }
  } catch {
    /* no URL to read */
  }
  apply(current);
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getTheme,
    () => "dark" as Theme,
  );
}
