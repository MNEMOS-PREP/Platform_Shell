/**
 * The one frame the product has.
 *
 * ── Why this replaces core's Layout ─────────────────────────────────────────
 *
 * `@ai/core`'s `Layout` is a centred `max-w-5xl` column with a top bar. That is
 * 1024px of a 1920px window - the content sits in just over half the screen
 * with dead margin either side, and every module page inherits it because none
 * of them declare a container of their own. It was the right call when a module
 * ran alone on its own port and the top bar had three links in it. It is the
 * wrong call for an app with a handful of sections and a contextual sub-nav.
 *
 * So: a rail on the left, permanently, and a content area that uses the window.
 * The rail is dark for the reason M15 gave when it built one - it pins the
 * chrome to one edge and leaves the reading column the only bright surface.
 *
 * ── The contextual half ─────────────────────────────────────────────────────
 *
 * M15 publishes the current company and its sections rather than drawing them
 * (see that module's `ui/embed.ts`), so the rail carries platform navigation
 * above the rule and wherever-you-are navigation below it. One rail, two
 * scopes, and the sub-nav does not disappear just because the module is no
 * longer running on its own port.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { HostShellContext, type HostShell, type RailPayload } from "@ai/m15";

export interface FrameNavItem {
  to: string;
  label: string;
  /** A single glyph. Never the only signal - the label is always present. */
  glyph: string;
  /** Matched as a prefix so child routes keep the parent lit. */
  match?: string;
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("ai.theme") as "light" | "dark") || "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ai.theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-7 w-7 place-items-center rounded-md text-rail-ink-soft transition-colors hover:bg-white/10 hover:text-rail-ink"
    >
      <span aria-hidden className="text-xs">
        {theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}

function railLink(isActive: boolean) {
  return [
    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
    isActive
      ? "bg-brand text-white shadow-glow"
      : "text-rail-ink-soft hover:bg-white/8 hover:text-rail-ink",
  ].join(" ");
}

export function Frame({ nav, children }: { nav: FrameNavItem[]; children: ReactNode }) {
  const location = useLocation();

  // What the current module published into the rail, if anything.
  const [rail, setRail] = useState<RailPayload | null>(null);
  const lastKey = useRef("");

  const host = useMemo<HostShell>(
    () => ({
      publish: (next) => {
        // Callers rebuild `sections` every render, so compare by value or the
        // publish turns into a render loop.
        const key = JSON.stringify(next);
        if (key === lastKey.current) return;
        lastKey.current = key;
        setRail(next);
      },
    }),
    [],
  );

  // A published rail belongs to the route that published it. Leaving that
  // section has to clear it, or a company's sections outlive the company page.
  useEffect(() => {
    if (!location.pathname.startsWith("/companies")) {
      lastKey.current = "";
      setRail(null);
    }
  }, [location.pathname]);

  const sections = rail?.sections ?? [];

  return (
    <HostShellContext.Provider value={host}>
      <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        {/* ---------- rail ---------- */}
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-rail-line bg-rail lg:flex">
          <div className="flex items-center gap-2.5 px-4 py-4">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-sm font-bold text-white shadow-glow"
              >
                ai
              </span>
              <span className="truncate font-semibold tracking-tight text-rail-ink">
                AI Interviewer
              </span>
            </Link>
            <span className="ml-auto">
              <ThemeToggle />
            </span>
          </div>

          <nav aria-label="Platform" className="mt-2 space-y-0.5 px-2.5">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  railLink(
                    isActive || (item.match ? location.pathname.startsWith(item.match) : false),
                  )
                }
              >
                <span aria-hidden className="w-4 shrink-0 text-center text-xs opacity-80">
                  {item.glyph}
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* ---------- what the current section published ---------- */}
          {(rail?.context || sections.length > 0) && (
            <div className="mt-6 border-t border-rail-line px-4 pt-4">
              {rail?.context && (
                <>
                  <p className="truncate text-sm font-semibold text-rail-ink">
                    {rail.context.title}
                  </p>
                  {rail.context.sub && (
                    <p className="provenance mt-0.5 truncate text-rail-ink-soft">
                      {rail.context.sub}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {sections.length > 0 && (
            <nav aria-label="Section" className="mt-3 space-y-0.5 px-2.5">
              {sections.map((item) =>
                item.disabledReason ? (
                  <span
                    key={item.to}
                    title={item.disabledReason}
                    className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-rail-ink-soft/45"
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    <span aria-hidden className="text-[10px]">
                      —
                    </span>
                  </span>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className={({ isActive }) => railLink(isActive)}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="font-mono text-[10px] opacity-70" data-numeric>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ),
              )}
            </nav>
          )}

          <p className="provenance mt-auto border-t border-rail-line px-4 py-3 text-rail-ink-soft">
            Every fact shows its source
          </p>
        </aside>

        {/* ---------- content ---------- */}
        <div className="flex min-w-0 flex-col">
          {/* The rail is hidden below lg, so the nav has to survive somewhere. */}
          <div className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Link to="/" className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-md bg-brand text-xs font-bold text-white"
                >
                  ai
                </span>
                <span className="text-sm font-semibold text-ink">AI Interviewer</span>
              </Link>
              <span className="ml-auto">
                <ThemeToggle />
              </span>
            </div>
            <nav
              aria-label="Platform"
              className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]"
            >
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    [
                      "shrink-0 rounded-lg px-2.5 py-1 text-sm transition-colors",
                      isActive ? "bg-brand text-white" : "text-ink-soft hover:bg-surface-sunken",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <main className="min-w-0 flex-1 px-5 py-8 md:px-9 md:py-10 xl:px-14">
            {/* Wide, but not edge-to-edge on an ultrawide - past about 1500px a
                row of cards stops being scannable in one sweep. */}
            <div className="mx-auto w-full max-w-[92rem]">{children}</div>
          </main>
        </div>
      </div>
    </HostShellContext.Provider>
  );
}
