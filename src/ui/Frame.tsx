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
 *
 * ── 2026-10-04 ──────────────────────────────────────────────────────────────
 * On a phone the rail became an eight-item sideways strip under the top bar.
 * It is now a bottom tab bar — Today, Interview, Skills, Companies, More —
 * the shape every app a student uses has, in thumb reach; "More" opens the
 * rest. The account card shows the student's name and email rather than a
 * truncated id, and holds Settings and Help. Single-key shortcuts (N, G then
 * S, ?) sit beside ⌘K.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  Icon,
  ROLE_LABEL,
  candidateIdOf,
  signOut,
  useSession,
  type IconName,
  type Session,
} from "@ai/core";
import { useProfile } from "@ai/m04";
import { useHistory } from "@ai/m06";
import { HostShellContext, type HostShell, type RailPayload } from "@ai/m15";

import { readEmail, writeEmail } from "../lib/account";
import { currentStreak, practiceDays } from "../lib/practice";
import { toggleTheme, useTheme } from "../lib/theme";
import { CommandPalette, type PaletteItem } from "./CommandPalette";
import { ShortcutsDialog, useShortcuts } from "./Shortcuts";

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

/** Cmd on Apple keyboards, Ctrl elsewhere - the hint should be the key you press. */
const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "\u2318" : "Ctrl ";

/** Screens reached from the account menu rather than the rail: still named in the top bar. */
const OFF_MENU: FrameNavItem[] = [
  { to: "/settings", label: "Settings", icon: "settings" },
  { to: "/help", label: "Help & feedback", icon: "help" },
  { to: "/signin", label: "Switch account", icon: "users" },
];

/** The phone's tab bar: the four places a student goes most, then More. */
const TABS: FrameNavItem[] = [
  { to: "/", label: "Today", icon: "compass" },
  { to: "/mock", label: "Interview", icon: "mic" },
  { to: "/skills", label: "Skills", icon: "graph" },
  { to: "/companies", label: "Companies", icon: "building" },
];

function isActive(item: FrameNavItem, pathname: string): boolean {
  if (item.to === "/") return pathname === "/";
  return pathname === item.to || pathname.startsWith(`${item.to}/`) ||
    (item.match ? pathname.startsWith(item.match) : false);
}

/** The name to show: what the student told us (M04's profile), else the session's. */
function useDisplayName(session: Session | null): string | undefined {
  const profile = useProfile(candidateIdOf(session));
  return profile.data?.display_name || session?.name;
}

function initials(session: Session, name?: string): string {
  const source = name ?? session.name ?? ROLE_LABEL[session.role];
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

/**
 * The practice streak, always in view for a student - Duolingo's most
 * effective retention surface is the counter you see before you decide what
 * to do. Counted from sessions M06 recorded as started; nothing estimated.
 */
function StreakChip() {
  const history = useHistory(120);
  const streak = currentStreak(practiceDays(history.data ?? []));
  if (!history.data) return null;
  return (
    <Link
      to="/"
      title={streak ? `${streak}-day practice streak` : "No practice streak yet - one interview starts it"}
      className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${
        streak
          ? "border-reported-line bg-reported-soft text-reported"
          : "border-line text-ink-faint hover:text-ink-soft"
      }`}
    >
      <Flame lit={streak > 0} />
      <span data-numeric>{streak}</span>
    </Link>
  );
}

/** A flame, drawn here: core's icon set has no flame, and one icon is not a release. */
export function Flame({ lit, size = 14 }: { lit: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5c.6 3.1 2.6 4.6 4.1 6.4 1.4 1.7 2.4 3.6 2.4 5.9a6.5 6.5 0 0 1-13 0c0-2.3 1-4 2.4-5.4.3 1.8 1.2 2.9 2.4 3.4-.6-3.6.2-7.3 1.7-10.3Z"
        fill={lit ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={lit ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
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
  const name = useDisplayName(session);
  if (!session) return null;
  const label = name ?? ROLE_LABEL[session.role];
  const email = session.role === "student" ? readEmail() : null;
  const linkClass =
    "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs text-rail-ink-soft hover:bg-rail-active hover:text-rail-ink";

  return (
    <div className="m-3 rounded-xl border border-rail-line bg-rail-hover p-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
        >
          {initials(session, name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-rail-ink">{label}</span>
          <span className="block truncate text-[0.6875rem] text-rail-ink-soft">
            {email ?? ROLE_LABEL[session.role]}
          </span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1">
        <Link to="/settings" className={linkClass} title="Settings">
          <Icon name="settings" size={14} />
          Settings
        </Link>
        <Link to="/help" state={{ from: location.pathname }} className={linkClass} title="Help & feedback">
          <Icon name="help" size={14} />
          Help
        </Link>
        <button
          type="button"
          onClick={() => {
            writeEmail(null);
            signOut();
            navigate("/signin");
          }}
          className={linkClass}
          title="Sign out"
        >
          <Icon name="arrowLeft" size={14} />
          Out
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
          ? "bg-rail-active font-medium text-rail-ink"
          : "text-rail-ink-soft hover:bg-rail-hover hover:text-rail-ink",
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
  const current =
    items.find((item) => isActive(item, location.pathname)) ??
    OFF_MENU.find((item) => isActive(item, location.pathname));
  const displayName = useDisplayName(session);

  // Cmd+K / Ctrl+K anywhere; "/" when not already typing.
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState(false);
  const openShortcuts = useCallback(() => setShortcuts(true), []);
  useShortcuts(openShortcuts, !palette && !shortcuts);
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [location.pathname]);

  const paletteItems: PaletteItem[] = [
    ...items.map((item) => ({
      id: `go:${item.to}`,
      group: "Go to",
      label: item.label,
      icon: item.icon,
      run: () => navigate(item.to),
    })),
    {
      id: "do:mock",
      group: "Actions",
      label: "Start a mock interview",
      icon: "mic",
      keywords: "practise practice interview new",
      run: () => navigate("/mock"),
    },
    {
      id: "do:resume",
      group: "Actions",
      label: "Upload a resume",
      icon: "document",
      keywords: "cv add",
      run: () => navigate("/resume"),
    },
    {
      id: "do:jd",
      group: "Actions",
      label: "Paste a job description",
      icon: "listChecks",
      keywords: "jd posting drive role",
      run: () => navigate("/jd"),
    },
    {
      id: "go:settings",
      group: "Go to",
      label: "Settings",
      icon: "settings",
      keywords: "profile name goal reminder consent export delete data privacy",
      run: () => navigate("/settings"),
    },
    {
      id: "go:help",
      group: "Go to",
      label: "Help & feedback",
      icon: "help",
      keywords: "support report bug problem question faq",
      run: () => navigate("/help", { state: { from: location.pathname } }),
    },
    {
      id: "do:shortcuts",
      group: "Actions",
      label: "Keyboard shortcuts",
      icon: "keyboard",
      keywords: "keys hotkeys",
      run: openShortcuts,
    },
    {
      id: "do:theme",
      group: "Actions",
      label: "Toggle light / dark",
      icon: "sun",
      keywords: "theme dark light mode appearance",
      run: toggleTheme,
    },
    {
      id: "do:switch",
      group: "Actions",
      label: "Switch person",
      icon: "users",
      keywords: "sign in account login role",
      run: () => navigate("/signin", { state: { from: location.pathname } }),
    },
  ];

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
                                ? "bg-rail-active text-rail-ink"
                                : "text-rail-ink-soft hover:bg-rail-hover hover:text-rail-ink",
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
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="ml-auto hidden h-9 w-72 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink-faint hover:border-line-strong hover:text-ink-soft md:flex"
              >
                <Icon name="search" size={15} />
                <span className="flex-1 text-left">Search or jump to...</span>
                <span className="kbd">{MOD}K</span>
              </button>
              <div className="ml-auto flex items-center gap-1.5 md:ml-2">
                <button
                  type="button"
                  onClick={() => setPalette(true)}
                  aria-label="Search"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken md:hidden"
                >
                  <Icon name="search" size={17} />
                </button>
                {candidateIdOf(session) && <StreakChip />}
                <ThemeToggle />
                {session && (
                  <Link
                    to="/settings"
                    title={`Signed in as ${displayName ?? ROLE_LABEL[session.role]} — settings`}
                    className="bg-brand-gradient ml-1 grid h-8 w-8 place-items-center rounded-full text-[0.6875rem] font-semibold text-white lg:hidden"
                  >
                    {initials(session, displayName)}
                  </Link>
                )}
              </div>
            </div>
          </header>

          <main
            key={location.pathname}
            className="page-in min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-5 md:px-10 md:pt-10 lg:pb-10 xl:px-14"
          >
            {/* Wide, but not edge-to-edge on an ultrawide - past about 1500px a
                row of cards stops being scannable in one sweep. */}
            <div className="mx-auto w-full max-w-[92rem]">{children}</div>
          </main>
        </div>
      </div>
      {/* ---------- phone: a tab bar in thumb reach ---------- */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((tab) => {
            const on = isActive(tab, location.pathname);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                aria-current={on ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${
                  on ? "text-brand" : "text-ink-faint"
                }`}
              >
                <Icon name={tab.icon} size={20} />
                {tab.label}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-expanded={more}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${
              more ? "text-brand" : "text-ink-faint"
            }`}
          >
            <Icon name="menu" size={20} />
            More
          </button>
        </div>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMore(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Everything else"
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
            {groups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2 pb-1 text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">{group.label}</p>
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex h-11 items-center gap-3 rounded-lg px-2 text-sm ${
                      isActive(item, location.pathname) ? "bg-brand-soft text-brand" : "text-ink"
                    }`}
                  >
                    <Icon name={item.icon} size={17} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <Link to="/settings" className="flex h-11 items-center gap-2 rounded-lg px-2 text-sm text-ink">
                <Icon name="settings" size={17} /> Settings
              </Link>
              <Link to="/help" state={{ from: location.pathname }} className="flex h-11 items-center gap-2 rounded-lg px-2 text-sm text-ink">
                <Icon name="help" size={17} /> Help
              </Link>
            </div>
          </div>
        </div>
      )}
      <CommandPalette open={palette} onClose={() => setPalette(false)} items={paletteItems} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </HostShellContext.Provider>
  );
}
