/**
 * Sign in — the DEV half of PLATFORM_TODO §1's login screen.
 *
 * The screen is the shell's because the shell owns the origin and mounts every
 * module; a login inside a module would be the nineteenth copy. What it sets is
 * `@ai/core`'s session (v0.12.0), which every mounted module reads and which
 * writes the identity headers every request carries.
 *
 * It is a picker, and says so. The backends trust these headers only under
 * `AI_AUTH_MODE=dev`. When a real provider lands (the master plan recommends
 * Clerk, then college SSO), it replaces the choices below and nothing else:
 * `signIn()` is fed by the provider instead of a click.
 *
 * Two rules from the spec it keeps. The roles are `ai_core.identity`'s four,
 * closed — nothing here invents a fifth. And there is no "view as a student"
 * for staff: whether a placement officer may see an individual is §15 decision
 * 4, unresolved, and a button would decide it silently.
 *
 * Signed out, it is the whole page (no rail — there is nothing to navigate to
 * yet). Signed in, it is the "switch person" screen inside the frame.
 */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Icon,
  ROLE_LABEL,
  SEEDED_CANDIDATE_ID,
  signIn,
  useSession,
  type IconName,
  type Session,
} from "@ai/core";

interface Choice {
  session: () => Session;
  title: string;
  who: string;
  icon: IconName;
  /** What this identity is FOR in a demo, in one line. */
  shows: string;
}

const CHOICES: Choice[] = [
  {
    session: () => ({ role: "student", subject: SEEDED_CANDIDATE_ID, name: "Demo student" }),
    title: "Demo student",
    who: "Student · seeded",
    icon: "student",
    shows: "A resume, a skill graph and history already — the populated path.",
  },
  {
    session: () => ({ role: "student", subject: crypto.randomUUID(), name: "New student" }),
    title: "A new student",
    who: "Student · fresh",
    icon: "sparkles",
    shows: "Nothing measured yet — the cold start, where every screen says “not measured”.",
  },
  {
    session: () => ({ role: "placement_officer", subject: "placement-officer-1", name: "Placement cell" }),
    title: "Placement officer",
    who: ROLE_LABEL.placement_officer,
    icon: "building",
    shows: "The review queue and company curation. Cohort figures, never one student's record.",
  },
  {
    session: () => ({ role: "admin", subject: "admin-1", name: "Operations" }),
    title: "Administrator",
    who: ROLE_LABEL.admin,
    icon: "shield",
    shows: "Disputes, raters and the outboxes — and every record, which is worth logging.",
  },
];

export function SignIn() {
  const current = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [custom, setCustom] = useState("");

  // Back to where the student was headed, or the overview.
  const from = (location.state as { from?: string } | null)?.from;
  const go = (session: Session) => {
    signIn(session);
    navigate(from && from !== "/signin" ? from : "/", { replace: true });
  };

  const content = (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white shadow-glow"
        >
          <Icon name="sparkles" size={20} />
        </span>
        <span>
          <span className="block font-semibold tracking-tight text-ink">AI Interviewer</span>
          <span className="block text-xs text-ink-faint">Placement prep that shows its work</span>
        </span>
      </div>

      <h1 className="mt-10 text-display font-semibold text-ink">
        Who's <span className="text-gradient">practising</span> today?
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
        Pick who you are. Every screen reads the same answer, and every request carries it.
      </p>

      {current && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft">
          <Icon name="checkCircle" size={15} className="text-confirmed" />
          Signed in as{" "}
          <span className="font-medium text-ink">{current.name ?? ROLE_LABEL[current.role]}</span>
          <span className="font-mono text-xs text-ink-faint">{current.subject.slice(0, 8)}</span>
        </p>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => (
          <button
            key={choice.title}
            type="button"
            onClick={() => go(choice.session())}
            className="panel group flex items-start gap-4 p-5 text-left hover:-translate-y-0.5 hover:border-brand-line hover:shadow-raised focus-visible:border-brand"
            style={{ transitionProperty: "transform, box-shadow, border-color", transitionDuration: "180ms" }}
          >
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"
            >
              <Icon name={choice.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-ink">{choice.title}</span>
                <Icon
                  name="arrowRight"
                  size={15}
                  className="ml-auto text-brand opacity-0 transition-opacity group-hover:opacity-100"
                />
              </span>
              <span className="mt-0.5 block text-xs text-ink-faint">{choice.who}</span>
              <span className="mt-2 block text-sm leading-relaxed text-ink-soft">{choice.shows}</span>
            </span>
          </button>
        ))}
      </div>

      <details className="group mt-6">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <Icon name="chevronRight" size={15} className="transition-transform group-open:rotate-90" />
          Sign in as a particular student id
        </summary>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (custom.trim()) go({ role: "student", subject: custom.trim() });
          }}
        >
          <label className="flex min-w-[18rem] flex-1 flex-col gap-1.5 text-sm text-ink-soft">
            Student id
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="00000000-0000-4000-8000-…"
              className="h-10 rounded-lg border border-line bg-surface px-3 font-mono text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={!custom.trim()}
            className="bg-brand-gradient h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Continue
          </button>
        </form>
      </details>

      <p className="mt-10 flex items-start gap-2 border-t border-line pt-5 text-xs leading-relaxed text-ink-faint">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        <span>
          Development sign-in. The backends trust it only under{" "}
          <code className="font-mono">AI_AUTH_MODE=dev</code>; a real provider (college SSO)
          replaces this screen, not the modules.
        </span>
      </p>
    </div>
  );

  if (current) return <div className="py-4">{content}</div>;

  return (
    <div className="relative flex min-h-dvh items-center overflow-hidden px-5 py-16">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-brand opacity-[0.14] blur-3xl"
      />
      <div className="page-in relative w-full">{content}</div>
    </div>
  );
}
