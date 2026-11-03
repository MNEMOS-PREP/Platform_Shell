/**
 * The logo follows the colour. It is a picture, not a shape we can recolour, so
 * it is rebuilt through a small SVG filter: its three tones (deep, mid, pale) are
 * read from the picture's lightness and re-drawn as a deep shade of the colour,
 * the colour itself, and a pale tint of it. Every colour keeps one clear hue.
 * The platform's own green leaves the picture untouched.
 */
import { getAccent, hexToRgb, subscribeAccent, type RGB } from "./accent";
import { PALETTES, getPalette, subscribePalette } from "./palette";

const STEPS = 17;

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lum([r, g, b]: RGB): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** The logo's own tones sit near 0.10 (deep), 0.45 (mid) and 0.88 (pale) in lightness. */
function ramp(base: RGB): (l: number) => RGB {
  const deep = mix(base, [0, 0, 0], 0.62);
  const pale = mix(base, [255, 255, 255], 0.82);
  return (l) => (l <= 0.45 ? mix(deep, base, Math.max(0, (l - 0.1) / 0.35)) : mix(base, pale, Math.min(1, (l - 0.45) / 0.43)));
}

function ensureFilter(): Element[] {
  const ns = "http://www.w3.org/2000/svg";
  let svg = document.getElementById("logo-tint-defs") as unknown as SVGSVGElement | null;
  if (!svg) {
    svg = document.createElementNS(ns, "svg");
    svg.id = "logo-tint-defs";
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.innerHTML = `
      <filter id="logo-tint" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0 1"/>
          <feFuncG type="table" tableValues="0 1"/>
          <feFuncB type="table" tableValues="0 1"/>
        </feComponentTransfer>
      </filter>`;
    document.body.appendChild(svg);
  }
  return [svg.querySelector("feFuncR")!, svg.querySelector("feFuncG")!, svg.querySelector("feFuncB")!];
}

export function refreshLogo(): void {
  const root = document.documentElement;
  const accent = getAccent();
  const own = !accent && getPalette() === "forest";
  const hex = accent ?? PALETTES.find((p) => p.key === getPalette())?.brand;
  if (!hex || own) {
    root.style.removeProperty("--logo-filter");
    return;
  }
  let base = hexToRgb(hex);
  // On a dark page a very dark colour would vanish: lift it until it can be seen.
  if (root.dataset.theme === "dark") for (let i = 0; i < 8 && lum(base) < 0.3; i++) base = mix(base, [255, 255, 255], 0.2);
  const to = ramp(base);
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < STEPS; i++) {
    const c = to(i / (STEPS - 1));
    r.push(c[0] / 255);
    g.push(c[1] / 255);
    b.push(c[2] / 255);
  }
  const [fr, fg, fb] = ensureFilter();
  const fmt = (v: number[]) => v.map((x) => Math.max(0, Math.min(1, x)).toFixed(3)).join(" ");
  fr!.setAttribute("tableValues", fmt(r));
  fg!.setAttribute("tableValues", fmt(g));
  fb!.setAttribute("tableValues", fmt(b));
  root.style.setProperty("--logo-filter", "url(#logo-tint)");
}

export function initLogoTint(): void {
  const start = () => {
    refreshLogo();
    subscribeAccent(refreshLogo);
    subscribePalette(refreshLogo);
    // The light/dark switch changes the attribute on <html>.
    new MutationObserver(refreshLogo).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
