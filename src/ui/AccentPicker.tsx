/**
 * Choosing the accent colour: a row of presets, and "+" for any colour at all
 * (a picker, a hue bar and R, G, B boxes). The choice applies at once and is
 * kept on this device.
 */
import { useEffect, useRef, useState } from "react";

import { PALETTES, setPalette, usePalette } from "../lib/palette";
import {
  DEFAULT_ACCENT,
  PRESETS,
  getAccent,
  hexToRgb,
  normaliseHex,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  setAccent,
  useAccent,
  type HSV,
} from "../lib/accent";

function Picker() {
  const accent = useAccent();
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb(accent ?? DEFAULT_ACCENT)));
  const area = useRef<HTMLDivElement>(null);
  const [h, s, v] = hsv;
  const rgb = hsvToRgb(hsv).map(Math.round) as [number, number, number];

  const push = (next: HSV) => {
    setHsv(next);
    setAccent(rgbToHex(hsvToRgb(next)));
  };
  const fromPointer = (e: React.PointerEvent) => {
    const box = area.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (e.clientY - box.top) / box.height));
    push([h, x, 1 - y]);
  };
  const setChannel = (i: number, value: string) => {
    const n = Math.max(0, Math.min(255, Number.parseInt(value || "0", 10) || 0));
    const next = [...rgb] as [number, number, number];
    next[i] = n;
    push(rgbToHsv(next));
  };

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-3">
      <div
        ref={area}
        role="slider"
        aria-label="Shade"
        aria-valuetext={`saturation ${Math.round(s * 100)}%, brightness ${Math.round(v * 100)}%`}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) fromPointer(e);
        }}
        onKeyDown={(e) => {
          const step = 0.04;
          if (e.key === "ArrowRight") push([h, Math.min(1, s + step), v]);
          if (e.key === "ArrowLeft") push([h, Math.max(0, s - step), v]);
          if (e.key === "ArrowUp") push([h, s, Math.min(1, v + step)]);
          if (e.key === "ArrowDown") push([h, s, Math.max(0, v - step)]);
        }}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-lg"
        style={{
          backgroundColor: `hsl(${h} 100% 50%)`,
          backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span aria-hidden className="size-8 shrink-0 rounded-full border border-line" style={{ background: rgbToHex(rgb) }} />
        <input
          type="range"
          min={0}
          max={360}
          value={Math.round(h)}
          onChange={(e) => push([Number(e.target.value), s || 0.8, v || 0.9])}
          aria-label="Hue"
          className="h-2.5 w-full cursor-pointer appearance-none rounded-full"
          style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["R", "G", "B"] as const).map((label, i) => (
          <label key={label} className="text-center text-[0.6875rem] text-ink-faint">
            <input
              inputMode="numeric"
              value={rgb[i]}
              onChange={(e) => setChannel(i, e.target.value)}
              aria-label={label}
              className="h-9 w-full rounded-lg border border-line bg-surface text-center text-sm text-ink outline-none focus:border-brand"
            />
            <span className="mt-1 block">{label}</span>
          </label>
        ))}
      </div>
      <label className="mt-2 block text-[0.6875rem] text-ink-faint">
        Hex
        <input
          defaultValue={rgbToHex(rgb)}
          key={rgbToHex(rgb)}
          onBlur={(e) => {
            const hex = normaliseHex(e.target.value);
            if (hex) push(rgbToHsv(hexToRgb(hex)));
          }}
          className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3 font-mono text-sm text-ink outline-none focus:border-brand"
        />
      </label>
    </div>
  );
}

/** The themes: a small preview of each, and its name. */
export function PalettePanel() {
  const current = usePalette();
  return (
    <div>
      <p className="text-sm font-medium text-ink">Theme</p>
      <p className="mt-0.5 text-xs text-ink-faint">The background, cards and text. Works with light or dark.</p>
      <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Theme">
        {PALETTES.map((p) => {
          const on = p.key === current;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${p.label}: ${p.note}`}
              title={`${p.label}: ${p.note}`}
              onClick={() => setPalette(p.key)}
              className="group flex flex-col items-center gap-1.5 text-[0.6875rem] text-ink-soft hover:text-ink"
            >
              <span
                className={`relative grid h-11 w-full place-items-center overflow-hidden rounded-lg border transition-transform group-hover:scale-105 ${on ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-line-strong"}`}
                style={{ background: p.bg }}
              >
                <span aria-hidden className="absolute bottom-1.5 left-1.5 h-1.5 w-5 rounded-full" style={{ background: p.ink }} />
                <span aria-hidden className="absolute top-1.5 right-1.5 size-3 rounded-full" style={{ background: p.brand }} />
              </span>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The swatches, and the custom picker behind "+". */
export function AccentPanel() {
  const accent = useAccent();
  const themeBrand = PALETTES.find((p) => p.key === usePalette())?.brand ?? DEFAULT_ACCENT;
  const isPreset = PRESETS.some((p) => (p.hex ?? null) === accent);
  const [custom, setCustom] = useState(!isPreset && accent !== null);

  return (
    <div>
      <p className="text-sm font-medium text-ink">Accent colour</p>
      <p className="mt-0.5 text-xs text-ink-faint">For buttons, highlights and small marks. Kept on this device.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label="Accent colour">
        {PRESETS.map((p) => {
          const on = (p.hex ?? null) === accent && !custom;
          return (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.hex ? p.name : "Theme colour (default)"}
              title={p.hex ? p.name : "Theme colour (default)"}
              onClick={() => {
                setCustom(false);
                setAccent(p.hex);
              }}
              className={`size-9 rounded-full transition-transform hover:scale-110 ${on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
              style={{ background: p.hex ?? themeBrand }}
            />
          );
        })}
        <button
          type="button"
          aria-label="Choose any colour"
          aria-expanded={custom}
          title="Choose any colour"
          onClick={() => {
            setCustom((c) => !c);
            if (!accent) setAccent(DEFAULT_ACCENT);
          }}
          className={`grid size-9 place-items-center rounded-full border border-dashed text-lg leading-none text-ink-soft hover:text-ink ${custom ? "border-ink" : "border-line-strong"}`}
        >
          +
        </button>
      </div>
      {custom && <Picker />}
      {accent && (
        <button type="button" onClick={() => { setCustom(false); setAccent(null); }} className="mt-3 text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline">
          Back to the theme colour
        </button>
      )}
    </div>
  );
}

/** A palette button for the top bar that opens the panel. */
export function AccentButton() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const accent = getAccent();

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Accent colour"
        aria-expanded={open}
        title="Accent colour"
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
          <circle cx="7.5" cy="11" r="1" fill={accent ?? "currentColor"} />
          <circle cx="10.5" cy="7" r="1" fill="currentColor" />
          <circle cx="15" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Accent colour" className="absolute right-0 top-11 z-50 w-[19rem] rounded-2xl border border-line bg-surface p-4 shadow-raised">
          <PalettePanel />
          <div className="mt-5 border-t border-line pt-4">
            <AccentPanel />
          </div>
        </div>
      )}
    </div>
  );
}
