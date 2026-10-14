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
 *   · M01 and M02 both claimed the index route. Since 2026-10-04 their front
 *     doors are /resume and /jd everywhere (each standalone app redirects its
 *     index there), so both trees mount whole like the others.
 *
 *   · All four claim /deps. Only M13's is mounted; the shell's own /system
 *     page reads every module at once, which is the view that is actually
 *     worth having and that no single module can render.
 */
import { Component, StrictMode, useEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MODULES, candidateIdOf, canReview, isStaff, useSession } from "@ai/core";
import { m01Routes } from "@ai/m01";
import { m02Routes } from "@ai/m02";
import { m04Routes, usePracticeConsent, useProfile } from "@ai/m04";
import { MockTargetsContext, m06Routes, type MockTarget } from "@ai/m06";
import { m11Routes } from "@ai/m11";
import { m13Routes } from "@ai/m13";
import { m15Routes } from "@ai/m15";

import { Frame, type FrameNavGroup, type FrameNavItem } from "./ui/Frame";
import { Answers } from "./pages/Answers";
import { QuestionReview } from "./pages/QuestionReview";
import { Help } from "./pages/Help";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { NotBuilt } from "./pages/NotBuilt";
import { Practice } from "./pages/Practice";
import { Settings } from "./pages/Settings";
import { SignIn } from "./pages/SignIn";
import { Welcome } from "./pages/Welcome";
import { countdownLabel, daysUntil } from "./lib/goals";
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
  Ordered by how often a student goes there, not by the journey (2026-10-04).
  It used to read Prepare: Today, Resume, Job description, Companies, then
  Practise: Mock interview… — Today filed under "Prepare", and the thing a
  student does every day fifth. Setup is done once; it goes last. The first
  group has no label: Today and the interview are the product.
  `match` keeps the parent lit on child routes - /resumes/:id belongs to Resume.
*/
const TODAY: FrameNavItem = { to: "/", label: "Today", icon: "compass" };
const COMPANIES: FrameNavItem = { to: "/companies", label: "Companies", icon: "building" };
const JD: FrameNavItem = { to: "/jd", label: "Job description", icon: "listChecks", match: "/jds" };

const STUDENT_NAV: FrameNavGroup[] = [
  {
    label: "",
    items: [TODAY, { to: "/mock", label: "Mock interview", icon: "mic" }],
  },
  {
    label: "Progress",
    items: [
      // A student's "evaluation" is their own marked answers (2026-10-04).
      // M13's bench, which this used to open, is a staff tool now.
      { to: "/answers", label: "My answers", icon: "target", match: "/turns" },
      { to: "/skills", label: "Skill graph", icon: "graph" },
      { to: "/history", label: "History", icon: "clock" },
    ],
  },
  {
    label: "Prepare",
    items: [
      COMPANIES,
      JD,
      { to: "/resume", label: "Resume", icon: "document", match: "/resumes" },
    ],
  },
];

/** The phone's tab bar, per role: the four places each goes most. */
const STUDENT_TABS: FrameNavItem[] = [
  TODAY,
  { to: "/mock", label: "Interview", icon: "mic" },
  { to: "/skills", label: "Skills", icon: "graph" },
  COMPANIES,
];
const STAFF_TABS: FrameNavItem[] = [
  TODAY,
  { to: "/review", label: "Review", icon: "shield" },
  COMPANIES,
  { to: "/system", label: "System", icon: "monitor" },
];

/*
  Staff screens, listed only for the roles the backends let in
  (`require_role`, Platform_Core v0.12.0). The routes themselves stay mounted
  for everyone: a student who follows a link gets the module's sentence about
  what the page is, and the backend's 403, rather than a 404.
*/
const QUESTION_REVIEW_NAV: FrameNavItem = { to: "/questions/review", label: "Question review", icon: "shield" };
const PLACEMENT_NAV: FrameNavItem[] = [
  { to: "/review", label: "Review queue", icon: "shield" },
  QUESTION_REVIEW_NAV,
  { to: "/ops", label: "Operations", icon: "zap" },
  { to: "/score", label: "Evaluation bench", icon: "scales" },
];
const ADMIN_NAV: FrameNavItem[] = [
  { to: "/disputes", label: "Disputes", icon: "scales" },
  { to: "/raters", label: "Raters", icon: "users" },
  { to: "/outbox", label: "Evaluation outbox", icon: "send" },
];
/* Staff only (2026-10-04): module health is the operator's view, and in a
   student's menu it read as the platform showing its wiring. */
const PLATFORM_NAV: FrameNavItem[] = [{ to: "/system", label: "System", icon: "monitor" }];

/** Screens a brand-new student may reach before the welcome step is done. */
const BEFORE_WELCOME = new Set(["/welcome", "/signin", "/settings", "/help"]);

/*
  A student's own pages: the student menu less what staff browse too, and the
  student screens no menu lists. Staff are nobody's candidate, so these had
  nothing to show them, and drew a student's first-run screen instead — "Let's
  start with your resume" to a placement officer (2026-10-13 crawl). The
  developer's status page under /mock is theirs.
*/
const STUDENT_ONLY = [
  ...STUDENT_NAV.flatMap((group) => group.items)
    .filter((item) => item !== TODAY && item !== COMPANIES && item !== JD)
    .map((item) => item.to),
  "/resumes",
  "/me",
  "/skipped",
];
const STAFF_TOO = new Set(["/mock/system"]);

function isStudentOnly(path: string): boolean {
  if (STAFF_TOO.has(path)) return false;
  return STUDENT_ONLY.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function StudentOnlyNotice() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-title font-semibold text-ink">This is a student's page.</h1>
      <p className="mt-3 text-ink-soft">
        Staff see the cohort's counts, never one student's record. Your queues are on Today.
      </p>
    </div>
  );
}

/** The question-review screen: staff and the dedicated reviewer role. */
function ReviewerOnly({ children }: { children: ReactNode }) {
  const session = useSession();
  if (canReview(session)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-title font-semibold text-ink">This page is for question reviewers.</h1>
      <p className="mt-3 text-ink-soft">Everything you need is in the menu.</p>
    </div>
  );
}

/** A staff-only screen, for a student who follows a link to one. */
function StaffOnly({ children }: { children: ReactNode }) {
  const session = useSession();
  if (isStaff(session) || session?.role === "admin") return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-title font-semibold text-ink">This page is for the placement cell.</h1>
      <p className="mt-3 text-ink-soft">Everything you need is in the menu.</p>
    </div>
  );
}

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
  const candidate = candidateIdOf(session);
  const consent = usePracticeConsent(candidate);
  const profile = useProfile(candidate);

  // What the interview setup can plan FOR: the drives this student told us
  // about that M15 knows the format of. M06 reads these through its context.
  const targets = useMemo<MockTarget[]>(
    () =>
      (profile.data?.drives ?? [])
        .filter((d) => d.company_id && d.drive_id && daysUntil(d.date) >= 0)
        .map((d) => ({
          key: `drive:${d.drive_id}`,
          label: d.label,
          sub: `Drive ${countdownLabel(daysUntil(d.date))}`,
          params: { company: d.company_id!, drive: d.drive_id!, label: d.label },
        })),
    [profile.data],
  );

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

  // A brand-new student — no consent and never welcomed — starts at the
  // welcome step. Consent first, because without it no interview moves their
  // skill graph (M04, FR-4.20) and nothing else on the platform reached it.
  if (
    candidate &&
    consent.isSuccess &&
    profile.isSuccess &&
    !consent.data &&
    !profile.data.onboarded_at &&
    !BEFORE_WELCOME.has(location.pathname)
  ) {
    return <Navigate to="/welcome" replace />;
  }
  if (location.pathname === "/welcome") {
    return (
      <div className="min-h-dvh px-4 py-10">
        <Welcome />
      </div>
    );
  }

  const reviewerOnly = session.role === "reviewer";
  const staffRole = isStaff(session) || session.role === "admin" || reviewerOnly;
  const staff = [
    ...(reviewerOnly ? [QUESTION_REVIEW_NAV] : []),
    ...(isStaff(session) ? PLACEMENT_NAV : []),
    ...(session.role === "admin" ? ADMIN_NAV : []),
  ];
  /*
    Staff lead with their own work. Resume, My answers, the skill graph and
    history are a student's own — staff are nobody's candidate, so those pages
    had nothing for them and pushed their queues below the fold.
  */
  const nav: FrameNavGroup[] = staffRole
    ? [
        { label: "", items: [TODAY] },
        { label: "Staff", items: staff },
        ...(reviewerOnly
          ? []
          : [{ label: "Browse", items: [COMPANIES, JD] }, { label: "Platform", items: PLATFORM_NAV }]),
      ]
    : STUDENT_NAV;

  return (
    <Frame groups={nav} tabs={staffRole ? STAFF_TABS : STUDENT_TABS}>
      <MockTargetsContext.Provider value={targets}>
      <ScreenBoundary key={`${who}${location.pathname}`}>
      {staffRole && isStudentOnly(location.pathname) ? (
        <StudentOnlyNotice />
      ) : (
      <Routes key={who}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/history" element={<History />} />
        <Route path="/answers" element={<Answers />} />
        <Route path="/help" element={<Help />} />
        <Route path="/system" element={<StaffOnly><System /></StaffOnly>} />
        <Route path="/questions/review" element={<ReviewerOnly><QuestionReview /></ReviewerOnly>} />
        {/* M15's "Practise this now" hands a topic to /practice; here that is
            M06's focused interview on it (pages/Practice.tsx). */}
        <Route path="/practice" element={<Practice />} />

        {/* Every module mounts whole. M01 and M02 used to claim the index, so
            only two of their screens were mounted by name and every other page
            they link to — a resume's "check against a job", its audit, the
            JD match — bounced to Today. Since 2026-10-04 their front doors
            live at /resume and /jd in both places. */}
        {m01Routes}
        {m02Routes}
        {m04Routes}
        {m06Routes}
        {m11Routes}
        {m13Routes}
        {m15Routes}

        {PLACEHOLDERS.map((m) => (
          <Route key={m.id} path={m.path} element={<NotBuilt id={m.id} name={m.name} />} />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      )}
      </ScreenBoundary>
      </MockTargetsContext.Provider>
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
