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
 * Clerk, then college SSO), it replaces the four buttons below and nothing
 * else: `signIn()` is fed by the provider instead of a click.
 *
 * Two rules from the spec it keeps. The roles are `ai_core.identity`'s four,
 * closed — nothing here invents a fifth. And there is no "view as a student"
 * for staff: whether a placement officer may see an individual is §15 decision
 * 4, unresolved, and a button would decide it silently. Staff sign in as
 * themselves and the backend answers what they may see.
 */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ROLE_LABEL, SEEDED_CANDIDATE_ID, signIn, useSession, type Session } from "@ai/core";

interface Choice {
  session: () => Session;
  title: string;
  who: string;
  /** What this identity is FOR in a demo, in one line. */
  shows: string;
}

const CHOICES: Choice[] = [
  {
    session: () => ({ role: "student", subject: SEEDED_CANDIDATE_ID, name: "Demo student" }),
    title: "Demo student",
    who: "Student · the seeded candidate",
    shows: "Has a resume, a skill graph and history already — the populated path.",
  },
  {
    session: () => ({ role: "student", subject: crypto.randomUUID(), name: "New student" }),
    title: "A new student",
    who: "Student · a fresh id",
    shows: "Nothing measured yet — the cold start, where every module says “not measured”.",
  },
  {
    session: () => ({ role: "placement_officer", subject: "placement-officer-1", name: "Placement cell" }),
    title: "Placement officer",
    who: ROLE_LABEL.placement_officer,
    shows: "The review queue and company curation. Cohort figures, never one student's record.",
  },
  {
    session: () => ({ role: "admin", subject: "admin-1", name: "Operations" }),
    title: "Administrator",
    who: ROLE_LABEL.admin,
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

  return (
    <div className="mx-auto max-w-4xl py-6">
      <p className="rule-label">Sign in</p>
      <h1 className="mt-2.5 text-display font-semibold text-ink">Who is using the platform?</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
        Every module reads the same answer, and every request carries it. This is the
        development sign-in: the backends trust it only under{" "}
        <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-xs">
          AI_AUTH_MODE=dev
        </code>
        , and a real provider replaces this screen — not the modules.
      </p>

      {current && (
        <p className="mt-5 text-sm text-ink-soft">
          Signed in as <span className="font-semibold text-ink">{current.name ?? ROLE_LABEL[current.role]}</span>{" "}
          <span className="provenance">
            {ROLE_LABEL[current.role]} · {current.subject.slice(0, 8)}
          </span>
          . Switching clears every screen, so nothing one person saw is shown to the next.
        </p>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {CHOICES.map((choice) => (
          <button
            key={choice.title}
            type="button"
            onClick={() => go(choice.session())}
            className="panel group flex flex-col p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-raised"
          >
            <span className="provenance">{choice.who}</span>
            <span className="mt-2 text-section font-semibold text-ink">{choice.title}</span>
            <span className="mt-1.5 text-sm leading-relaxed text-ink-soft">{choice.shows}</span>
            <span className="mt-4 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
              Continue as {choice.title.toLowerCase()} &rarr;
            </span>
          </button>
        ))}
      </div>

      <form
        className="mt-8 flex flex-wrap items-end gap-3 border-t border-line pt-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (custom.trim()) go({ role: "student", subject: custom.trim() });
        }}
      >
        <label className="flex min-w-[18rem] flex-1 flex-col gap-1.5 text-sm text-ink-soft">
          A particular student's id
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="00000000-0000-4000-8000-…"
            className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={!custom.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Sign in as this student
        </button>
      </form>
    </div>
  );
}
