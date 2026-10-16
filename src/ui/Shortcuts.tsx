/**
 * Keyboard shortcuts (1.5), the way Linear and GitHub do them: single keys
 * when nobody is typing, "G then X" to go somewhere, "?" for the list. ⌘K
 * stays the way to everything else.
 *
 * Never while typing — an answer box that swallowed "n" into a new interview
 * would be the worst bug on the platform — and never with a modifier held, so
 * the browser's own shortcuts are left alone.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { Icon, MOD_KEY } from "@ai/core";

export interface Shortcut {
  keys: string[];
  label: string;
  /** For "G then X": the second key. For a single key: the key. */
  to?: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ["N"], label: "New interview", to: "/mock" },
  { keys: ["G", "T"], label: "Go to Today", to: "/" },
  { keys: ["G", "S"], label: "Go to your skill graph", to: "/skills" },
  { keys: ["G", "A"], label: "Go to your answers", to: "/answers" },
  { keys: ["G", "H"], label: "Go to history", to: "/history" },
  { keys: ["G", "C"], label: "Go to companies", to: "/companies" },
  { keys: ["G", ","], label: "Go to settings", to: "/settings" },
  { keys: ["?"], label: "Show these shortcuts" },
];

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** Wires the shortcuts to the router. `onHelp` opens the list. */
export function useShortcuts(onHelp: () => void, enabled = true) {
  const navigate = useNavigate();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      const key = event.key.toLowerCase();
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const hit = SHORTCUTS.find((s) => s.keys.length === 2 && s.keys[1]!.toLowerCase() === key);
        if (hit?.to) {
          event.preventDefault();
          navigate(hit.to);
        }
        return;
      }
      if (key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
        return;
      }
      if (key === "n") {
        event.preventDefault();
        navigate("/mock");
      } else if (event.key === "?") {
        event.preventDefault();
        onHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, navigate, onHelp]);
}

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim-in fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="dialog-in panel w-full max-w-sm p-5 shadow-raised"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Icon name="keyboard" size={17} className="text-brand" />
          <h2 id="shortcuts-title" className="flex-1 text-sm font-semibold text-ink">
            Keyboard shortcuts
          </h2>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-md text-ink-faint hover:bg-surface-sunken hover:text-ink"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-soft">Search or jump anywhere</dt>
            <dd className="flex gap-1">
              <span className="kbd">{MOD_KEY}</span>
              <span className="kbd">K</span>
            </dd>
          </div>
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <dt className="text-ink-soft">{s.label}</dt>
              <dd className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    {i > 0 && <span className="text-2xs text-ink-faint">then</span>}
                    <span className="kbd">{k}</span>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
