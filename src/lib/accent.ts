/**
 * The student's accent colour: the colour of buttons, highlights, focus rings
 * and small marks. One colour is chosen; the rest of the family (hover, soft
 * fill, edge, text on it) is derived from it in theme.css, so a choice can never
 * produce an unreadable button.
 *
 * Saved on this device (`ai.accent`), applied before the first paint, and absent
 * means the platform's own green.
 */
import { useSyncExternalStore } from "react";

const KEY = "ai.accent";
const listeners = new Set<() => void>();

export const DEFAULT_ACCENT = "#176b55";

/** Presets: the platform green first, then colours that read well on light and on black. */
export const PRESETS: { name: string; hex: string | null }[] = [
  { name: "Green (default)", hex: null },
  { name: "Violet", hex: "#7c5cff" },
  { name: "Orange", hex: "#f97316" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Yellow", hex: "#facc15" },
];

export type RGB = [number, number, number];
export type HSV = [number, number, number];

export function normaliseHex(input: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.split("").map((c) => c + c).join("") : m[1]!;
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const h = normaliseHex(hex) ?? DEFAULT_ACCENT;
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsv([r, g, b]: RGB): HSV {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const d = max - Math.min(R, G, B);
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
  }
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}

export function hsvToRgb([h, s, v]: HSV): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Text on a fill of this colour: dark on light colours, white on dark ones. */
function onColour(rgb: RGB): string {
  const l = luminance(rgb);
  const white = 1.05 / (l + 0.05);
  const dark = (l + 0.05) / (0.008 + 0.05);
  return white >= dark ? "#ffffff" : "#0b1a12";
}

/** Small text in the accent on a light page: darken light colours until they can be read. */
function forLightText(rgb: RGB): RGB {
  let out = rgb;
  for (let i = 0; i < 8 && luminance(out) > 0.2; i++) out = out.map((v) => v * 0.85) as RGB;
  return out;
}

/** On black the fill has to be light enough to be seen: lift dark colours towards white. */
function forDark(rgb: RGB): RGB {
  let out = rgb;
  for (let i = 0; i < 6 && luminance(out) < 0.25; i++) out = out.map((v) => v + (255 - v) * 0.2) as RGB;
  return out;
}

function read(): string | null {
  try {
    return normaliseHex(localStorage.getItem(KEY) ?? "");
  } catch {
    return null;
  }
}

let current: string | null = read();

function apply(hex: string | null): void {
  const root = document.documentElement;
  if (!hex) {
    root.removeAttribute("data-accent");
    for (const v of ["--accent-user", "--accent-on", "--accent-text", "--accent-dark", "--accent-dark-on"]) root.style.removeProperty(v);
    return;
  }
  const rgb = hexToRgb(hex);
  const dark = forDark(rgb);
  root.setAttribute("data-accent", "");
  root.style.setProperty("--accent-user", hex);
  root.style.setProperty("--accent-on", onColour(rgb));
  root.style.setProperty("--accent-text", rgbToHex(forLightText(rgb)));
  root.style.setProperty("--accent-dark", rgbToHex(dark));
  root.style.setProperty("--accent-dark-on", onColour(dark));
}

export function getAccent(): string | null {
  return current;
}

/** `null` returns to the platform's own green. */
export function setAccent(hex: string | null): void {
  const next = hex ? normaliseHex(hex) : null;
  current = next;
  try {
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  } catch {
    /* the choice still holds for this page */
  }
  apply(next);
  listeners.forEach((l) => l());
}

/** Before the first paint. */
export function initAccent(): void {
  apply(current);
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function subscribeAccent(l: () => void): () => void {
  return subscribe(l);
}

export function useAccent(): string | null {
  return useSyncExternalStore(subscribe, getAccent, () => null);
}
