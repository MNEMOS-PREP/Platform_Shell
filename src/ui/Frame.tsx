/**
 * The one frame the product has.
 *
 * ── Shape ───────────────────────────────────────────────────────────────────
 * A rail on the left, permanently, and a content area that uses the window,
 * with a glass bar across its top that says where you are. The rail is dark
 * for the reason M15 gave when it built one: it pins the chrome to one edge
 * and leaves the reading column the only bright surface.
 *
 * ── 2026-10-03 ──────────────────────────────────────────────────────────────
 * Rebuilt for the product to read as current rather than as a 1990s intranet:
 * real icons from core's set instead of ◆ ▤ ◈ glyphs (which every OS draws
 * differently), navigation grouped by what the student is doing, an account
 * card with who is signed in, and a top bar that names the screen. Nothing a
 * module renders changed; this is chrome.
 *
 * ── The contextual half ─────────────────────────────────────────────────────
 * M15 publishes the current company and its sections rather than drawing them
 * (see that module's `ui/embed.ts`), so the rail carries platform navigation
 * above the rule and wherever-you-are navigation below it.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { Icon, ROLE_LABEL, signOut, useSession, type IconName, type Session } from "@ai/core";
import { HostShellContext, type HostShell, type RailPayload } from "@ai/m15";

export interface FrameNavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Matched as a prefix so child routes keep the parent lit. */
  match?: string;
}

export interface FrameNavGroup {
  label: string;
  items: FrameNavItem[];
}

function isActive(item: FrameNavItem, pathname: string): boolean {
  if (item.to === "/") return pathname === "/";
  return pathname === item.to || pathname.startsWith(`${item.to}/`) ||
    (item.match ? pathname.startsWith(item.match) : false);
}

function initials(session: Session): string {
  const source = session.name ?? ROLE_LABEL[session.role];
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("ai.theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("ai.theme", theme);
    } catch {
      /* the choice still holds for this page */
    }
  }, [theme]);

  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className="bg-brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-glow"
      >
        <Icon name="sparkles" size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.9375rem] font-semibold tracking-tight text-rail-ink">
          AI Interviewer
        </span>
        <span className="block truncate text-[0.6875rem] text-rail-ink-soft">Placement prep</span>
      </span>
    </Link>
  );
}

/**
 * Who is signed in, always visible. A demo switches people mid-flow, and a
 * screen that silently answers as somebody else is the confusion this stops.
 */
function AccountCard() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  if (!session) return null;
  const label = session.name ?? ROLE_LABEL[session.role];

  return (
    <div className="m-3 rounded-xl border border-rail-line bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
        >
          {initials(session)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-rail-ink">{label}</span>
          <span className="block truncate font-mono text-[0.6875rem] text-rail-ink-soft">
            {ROLE_LABEL[session.role]} · {session.subject.slice(0, 8)}
          </span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Link
          to="/signin"
          state={{ from: location.pathname }}
          className="flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs text-rail-ink-soft hover:bg-white/[0.06] hover:text-rail-ink"
        >
          <Icon name="users" size={14} />
          Switch
        </Link>
        <button
          type="button"
          onClick={() => {
            signOut();
            navigate("/signin");
          }}
          className="flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs text-rail-ink-soft hover:bg-white/[0.06] hover:text-rail-ink"
        >
          <Icon name="arrowLeft" size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function RailLink({ item, pathname }: { item: FrameNavItem; pathname: string }) {
  const active = isActive(item, pathname);
  return (
    <NavLink
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm",
        active
          ? "bg-white/[0.08] font-medium text-rail-ink"
          : "text-rail-ink-soft hover:bg-white/[0.05] hover:text-rail-ink",
      ].join(" ")}
    >
      {active && (
        <span
          aria-hidden
          className="bg-brand-gradient absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full"
        />
      )}
      <Icon
        name={item.icon}
        size={17}
        className={active ? "text-rail-ink" : "text-rail-ink-soft group-hover:text-rail-ink"}
      />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

export function Frame({ groups, children }: { groups: FrameNavGroup[]; children: ReactNode }) {
  const location = useLocation();
  const session = useSession();

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
  const items = groups.flatMap((g) => g.items);
  const current = items.find((item) => isActive(item, location.pathname));

  return (
    <HostShellContext.Provider value={host}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* ---------- rail ---------- */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rail-line bg-rail lg:flex">
          <div className="px-4 pt-5 pb-4">
            <Logo />
          </div>

          <nav aria-label="Platform" className="flex-1 space-y-5 overflow-y-auto px-3 pt-2 pb-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1.5 text-[0.6875rem] font-medium tracking-wide text-rail-ink-soft/70 uppercase">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <RailLink key={item.to} item={item} pathname={location.pathname} />
                  ))}
                </div>
              </div>
            ))}

            {/* ---------- what the current section published ---------- */}
            {(rail?.context || sections.length > 0) && (
              <div className="border-t border-rail-line pt-4">
                {rail?.context && (
                  <div className="px-3">
                    <p className="truncate text-sm font-semibold text-rail-ink">{rail.context.title}</p>
                    {rail.context.sub && (
                      <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-rail-ink-soft">
                        {rail.context.sub}
                      </p>
                    )}
                  </div>
                )}
                {sections.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {sections.map((item) =>
                      item.disabledReason ? (
                        <span
                          key={item.to}
                          title={item.disabledReason}
                          className="flex h-8 cursor-not-allowed items-center gap-2 rounded-lg px-3 text-sm text-rail-ink-soft/45"
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
                          className={({ isActive: on }) =>
                            [
                              "flex h-8 items-center gap-2 rounded-lg px-3 text-sm",
                              on
                                ? "bg-white/[0.08] text-rail-ink"
                                : "text-rail-ink-soft hover:bg-white/[0.05] hover:text-rail-ink",
                            ].join(" ")
                          }
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
                  </div>
                )}
              </div>
            )}
          </nav>

          <AccountCard />
        </aside>

        {/* ---------- content ---------- */}
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/75 backdrop-blur-xl">
            <div className="flex h-14 items-center gap-3 px-4 md:px-8">
              <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label="Home">
                <span className="bg-brand-gradient grid h-8 w-8 place-items-center rounded-lg text-white">
                  <Icon name="sparkles" size={16} />
                </span>
              </Link>
              {current && (
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <Icon name={current.icon} size={16} className="shrink-0 text-ink-faint" />
                  <span className="truncate font-medium text-ink">{current.label}</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-1">
                <ThemeToggle />
                {session && (
                  <Link
                    to="/signin"
                    state={{ from: location.pathname }}
                    title={`Signed in as ${session.name ?? ROLE_LABEL[session.role]} — switch`}
                    className="bg-brand-gradient ml-1 grid h-8 w-8 place-items-center rounded-full text-[0.6875rem] font-semibold text-white lg:hidden"
                  >
                    {initials(session)}
                  </Link>
                )}
              </div>
            </div>
            {/* The rail is hidden below lg, so the nav has to survive somewhere. */}
            <nav
              aria-label="Platform"
              className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:hidden"
            >
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={() =>
                    [
                      "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm",
                      isActive(item, location.pathname)
                        ? "bg-brand text-white"
                        : "text-ink-soft hover:bg-surface-sunken",
                    ].join(" ")
                  }
                >
                  <Icon name={item.icon} size={14} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main key={location.pathname} className="page-in min-w-0 flex-1 px-5 py-8 md:px-10 md:py-10 xl:px-14">
            {/* Wide, but not edge-to-edge on an ultrawide - past about 1500px a
                row of cards stops being scannable in one sweep. */}
            <div className="mx-auto w-full max-w-[92rem]">{children}</div>
          </main>
        </div>
      </div>
    </HostShellContext.Provider>
  );
}
