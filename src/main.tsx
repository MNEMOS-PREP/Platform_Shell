/**
 * The platform shell.
 *
 * PORTS.txt has reserved :5173 for this since day one — "the shell: every built
 * module UI mounted ... a student never hops between ports". This is that file.
 *
 * ── How the modules get here ────────────────────────────────────────────────
 *
 * Each module exports a route tree from its own `src/routes.tsx`, and its own
 * `standalone.tsx` mounts exactly the same tree with providers around it. The
 * modules' vite configs already say what that implies: "when the platform shell
 * exists it mounts the same src/routes.tsx — the components are identical
 * either way, so what you fix here is what students get." Nothing is
 * re-implemented here and nothing is copied.
 *
 * ── The two collisions, and why they are handled the way they are ───────────
 *
 * The module route trees are flat and absolute, and they were authored without
 * a shell to nest under. React Router will not mount an absolute child path
 * beneath a prefix, so prefixing (`/m13/score`) would mean rewriting four
 * modules' routes and every internal `navigate()` with them. Every path is
 * disjoint except two cases, so they are mounted flat and the two are resolved:
 *
 *   · M01 and M02 both claim the index route. The shell owns "/", so their
 *     entry screens are mounted by name at /resume and /jd instead. Both
 *     modules export the components for exactly this, and their own
 *     standalone builds still route to them through m01Routes / m02Routes.
 *
 *   · All four claim /deps. Only M13's is mounted; the shell's own /system
 *     page reads every module at once, which is the view that is actually
 *     worth having and that no single module can render.
 */
import { Component, StrictMode, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MODULES, isStaff, useSession } from "@ai/core";
import { IngestPage, ResumePage } from "@ai/m01";
import { JdPage, ParsePage } from "@ai/m02";
import { m04Routes } from "@ai/m04";
import { m06Routes } from "@ai/m06";
import { m13Routes } from "@ai/m13";
import { m15Routes } from "@ai/m15";

import { Frame, type FrameNavGroup, type FrameNavItem } from "./ui/Frame";
import { Home } from "./pages/Home";
import { NotBuilt } from "./pages/NotBuilt";
import { SignIn } from "./pages/SignIn";
import { initTheme } from "./lib/theme";
import { System } from "./pages/System";
// The typeface, bundled rather than fetched: a demo laptop with no network
// must render the same page (see theme.css).
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
// One stylesheet, one token set. See theme.css for why none of the module
// theme files are imported here.
import "./theme.css";

/*
  Grouped by what the student is doing, in journey order within each group: a
  student reads the rail top to bottom the first time and that order is the
  product's argument. `match` keeps the parent lit on child routes -
  /resumes/:id belongs to Resume.
*/
const NAV: FrameNavGroup[] = [
  {
    label: "Prepare",
    items: [
      { to: "/", label: "Overview", icon: "compass" },
      { to: "/resume", label: "Resume", icon: "document", match: "/resumes" },
      { to: "/jd", label: "Job description", icon: "listChecks", match: "/jds" },
      { to: "/companies", label: "Companies", icon: "building" },
    ],
  },
  {
    label: "Practise",
    items: [
      { to: "/mock", label: "Mock interview", icon: "mic" },
      { to: "/score", label: "Evaluation", icon: "target", match: "/turns" },
      { to: "/skills", label: "Skill graph", icon: "graph" },
    ],
  },
];

/*
  Staff screens, listed only for the roles the backends let in
  (`require_role`, Platform_Core v0.12.0). The routes themselves stay mounted
  for everyone: a student who follows a link gets the module's sentence about
  what the page is, and the backend's 403, rather than a 404.
*/
const PLACEMENT_NAV: FrameNavItem[] = [
  { to: "/review", label: "Review queue", icon: "shield" },
  { to: "/ops", label: "Operations", icon: "zap" },
];
const ADMIN_NAV: FrameNavItem[] = [
  { to: "/disputes", label: "Disputes", icon: "scales" },
  { to: "/raters", label: "Raters", icon: "users" },
  { to: "/outbox", label: "Evaluation outbox", icon: "send" },
];
const PLATFORM_NAV: FrameNavItem[] = [{ to: "/system", label: "System", icon: "monitor" }];

/**
 * One module's crash is one screen's problem. Without this, an exception in
 * any mounted module unmounted the whole tree and left a blank page - which is
 * what M02's job-description screen did in the shell until 2026-10-03. Keyed
 * on the route, so leaving the broken screen clears it.
 */
class ScreenBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("A screen failed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-2xl py-16">
        <div className="panel p-8">
          <p className="rule-label">Something broke on this screen</p>
          <h1 className="mt-2 text-title font-semibold text-ink">This screen hit an error.</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The rest of the platform is fine — pick another screen from the menu, or reload
            this one.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-lg bg-surface-sunken p-3 font-mono text-xs text-ink-soft">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-brand-gradient mt-5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-glow"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

/**
 * Modules with no UI yet get a named placeholder rather than a dead link.
 * Derived by subtraction from core's registry, because the registry's own
 * `live` flags are stale — it still marks M01, M02 and M13 as unbuilt.
 */
const BUILT = new Set(["M01", "M02", "M04", "M05", "M06", "M13", "M15"]);
const PLACEHOLDERS = MODULES.filter((m) => !BUILT.has(m.id));

/*
  The theme, before the first paint (lib/theme.ts). The frame's toggle used to
  be the only thing that set it, so a screen rendered without the frame
  (sign-in, signed out) fell through to the OS preference. Dark by default.
*/
initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

/**
 * The routes, as whoever is signed in.
 *
 * Signed out, every address shows the sign-in screen and remembers where it
 * was headed. Switching people clears the query cache and remounts every
 * screen (the `key`): the previous person's answers are never shown to the
 * next one, even for the second it takes a refetch to land.
 */
function App() {
  const session = useSession();
  const location = useLocation();
  const who = session ? `${session.role}:${session.subject}` : "";
  const previous = useRef(who);

  useEffect(() => {
    if (previous.current !== who) {
      previous.current = who;
      queryClient.clear();
    }
  }, [who]);

  if (!session && location.pathname !== "/signin") {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  if (!session) {
    return <SignIn />;
  }

  const staff = [
    ...(isStaff(session) ? PLACEMENT_NAV : []),
    ...(session?.role === "admin" ? ADMIN_NAV : []),
  ];
  const nav: FrameNavGroup[] = [
    ...NAV,
    ...(staff.length ? [{ label: "Staff", items: staff }] : []),
    { label: "Platform", items: PLATFORM_NAV },
  ];

  return (
    <Frame groups={nav}>
      <ScreenBoundary key={`${who}${location.pathname}`}>
      <Routes key={who}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<Home />} />
        <Route path="/system" element={<System />} />

        {/* M01 — entry screen by name, the rest of the tree as authored. */}
        <Route path="/resume" element={<IngestPage />} />
        <Route path="/resumes/:resumeId" element={<ResumePage />} />

        {/* M02 — same shape. */}
        <Route path="/jd" element={<ParsePage />} />
        <Route path="/jds/:jdId" element={<JdPage />} />

        {/* M04, M06, M13 and M15 mount whole: no index route, no collision. */}
        {m04Routes}
        {m06Routes}
        {m13Routes}
        {m15Routes}

        {PLACEHOLDERS.map((m) => (
          <Route key={m.id} path={m.path} element={<NotBuilt id={m.id} name={m.name} />} />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ScreenBoundary>
    </Frame>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
