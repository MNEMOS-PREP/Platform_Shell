/**
 * Sign in — the DEV half of PLATFORM_TODO §1's login screen.
 *
 * The screen is the shell's because the shell owns the origin and mounts every
 * module; a login inside a module would be the nineteenth copy. What it sets is
 * `@ai/core`'s session (v0.12.0), which every mounted module reads and which
 * writes the identity headers every request carries.
 *
 * 2026-10-04 — a student signs in with their college email (lib/account.ts):
 * the id is derived from it, so the same email is the same student on any
 * browser. Until then the screen was a picker that offered Administrator and
 * Placement officer to anyone, which undercut the privacy story every other
 * screen tells. Staff identities are still here — a demo needs them — but only
 * behind `/signin?staff` (or a `?as=` link), never on the student's way in.
 *
 * Still not authentication, and the staff view says so. When a real provider
 * lands (the master plan recommends college SSO), it feeds `signIn` a verified
 * subject and this screen loses its form, not its job.
 */
import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import {
  Icon,
  ROLE_LABEL,
  SEEDED_CANDIDATE_ID,
  signIn,
  useSession,
  type IconName,
  type Session,
} from "@ai/core";

import { Face } from "@ai/m06";

import { firstName, looksLikeEmail, normaliseEmail, readEmail, subjectForEmail, writeEmail } from "../lib/account";

interface StaffChoice {
  session: () => Session;
  title: string;
  icon: IconName;
  shows: string;
}

const STAFF: StaffChoice[] = [
  {
    session: () => ({ role: "placement_officer", subject: "placement-officer-1", name: "Placement cell" }),
    title: "Placement officer",
    icon: "building",
    shows: "The review queue and company curation. Cohort figures, never one student's record.",
  },
  {
    session: () => ({ role: "admin", subject: "admin-1", name: "Operations" }),
    title: "Administrator",
    icon: "shield",
    shows: "Disputes, raters, the outboxes and the evaluation bench.",
  },
  {
    session: () => ({ role: "student", subject: crypto.randomUUID(), name: "New student" }),
    title: "A brand-new student",
    icon: "sparkles",
    shows: "Nothing measured yet — the cold start, including the welcome step.",
  },
];

export function SignIn() {
  const current = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const staffMode = params.has("staff");
  const [email, setEmail] = useState(() => readEmail() ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Back to where the student was headed, or Today.
  const from = (location.state as { from?: string } | null)?.from;
  const go = (session: Session, emailUsed: string | null = null) => {
    writeEmail(emailUsed);
    signIn(session);
    navigate(from && from !== "/signin" ? from : "/", { replace: true });
  };

  const submit = async () => {
    if (!looksLikeEmail(email)) {
      setError("That doesn't look like an email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const subject = await subjectForEmail(email);
      const display = name.trim() || firstName(normaliseEmail(email).split("@")[0]!.replace(/[._-]+/g, " ")) || undefined;
      go({ role: "student", subject, name: display }, email);
    } catch {
      setError("This browser can't sign in here — open the platform on localhost or over https.");
      setBusy(false);
    }
  };

  const brand = (
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
  );

  const intro = (
    <>
      <h1 className="text-title font-semibold text-ink lg:text-display">
        {current ? "Switch account" : (
          <>
            Practise for <span className="text-gradient">placements</span>
          </>
        )}
      </h1>
      <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft lg:text-lg">
        Mock interviews that follow up like a real panel, and a skill graph that shows what you
        know.
      </p>
      {current && (
        <p className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft">
          <Icon name="checkCircle" size={15} className="shrink-0 text-confirmed" />
          <span className="truncate">
            Signed in as <span className="font-medium text-ink">{current.name ?? ROLE_LABEL[current.role]}</span>
          </span>
        </p>
      )}
    </>
  );

  const signInBlock = (
    <>
      <form
        className="panel space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="block text-sm font-medium text-ink">
          College email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@college.edu"
            className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-[0.9375rem] text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Your name <span className="font-normal text-ink-faint">(optional)</span>
          <input
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="What should we call you?"
            className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-[0.9375rem] text-ink outline-none focus:border-brand"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-contested">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="bg-brand-gradient flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Continue"}
          <Icon name="arrowRight" size={16} />
        </button>
        <p className="text-xs leading-relaxed text-ink-faint">
          The same email brings back your interviews and skill graph on any device.
        </p>
      </form>

      <button
        type="button"
        onClick={() => go({ role: "student", subject: SEEDED_CANDIDATE_ID, name: "Demo student" })}
        className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3 text-left text-sm text-ink-soft hover:border-brand-line hover:text-ink"
      >
        <Icon name="student" size={18} className="shrink-0 text-brand" />
        <span className="flex-1">
          <span className="font-medium text-ink">Look around first</span>
          <span className="block text-xs text-ink-faint">
            As a demo student who already has a resume, interviews and a skill graph.
          </span>
        </span>
        <Icon name="arrowRight" size={15} />
      </button>

      {staffMode && (
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="staff-heading">
          <h2 id="staff-heading" className="text-sm font-semibold text-ink">
            Staff and demo identities
          </h2>
          <div className="mt-3 space-y-2">
            {STAFF.map((choice) => (
              <button
                key={choice.title}
                type="button"
                onClick={() => go(choice.session())}
                className="panel flex w-full items-start gap-3 p-4 text-left hover:border-brand-line"
              >
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon name={choice.icon} size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{choice.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{choice.shows}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
            <Icon name="info" size={14} className="mt-0.5 shrink-0" />
            <span>
              Development sign-in: the backends trust these identities only under{" "}
              <code className="font-mono">AI_AUTH_MODE=dev</code>. College SSO replaces this
              screen, not the modules.
            </span>
          </p>
        </section>
      )}

      {!staffMode && !current && <StaffLink className="mt-8 hidden lg:block" />}
    </>
  );

  if (current) {
    return (
      <div className="py-4">
        <div className="mx-auto w-full max-w-md">
          {brand}
          <div className="mt-10">{intro}</div>
          <div className="mt-7">{signInBlock}</div>
        </div>
      </div>
    );
  }

  /*
    Signed out, this is the first page a visitor ever sees, so it shows before
    it asks (2026-10-04): on a laptop the product is beside the form — a real
    exchange, a band, the skill graph moving — and what you get, in the order
    you get it. On a phone the form stays high, right under the headline, and
    the preview follows it: someone who came to sign in should not scroll past
    a pitch.
  */
  return (
    <div className="relative min-h-dvh overflow-hidden px-4 py-12 lg:py-16">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-brand opacity-[0.14] blur-3xl"
      />
      <main className="page-in relative mx-auto grid w-full max-w-md gap-x-16 lg:min-h-[calc(100dvh-8rem)] lg:max-w-6xl lg:grid-cols-[minmax(0,1.15fr)_minmax(0,26rem)] lg:content-center">
        <div className="lg:col-start-1 lg:row-start-1">
          {brand}
          <div className="mt-10">{intro}</div>
        </div>
        <div className="mt-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">{signInBlock}</div>
        <div className="mt-12 lg:col-start-1 lg:row-start-2 lg:mt-8">
          <Showcase />
        </div>
        {/* On a phone the staff link comes last: it is for a different person,
            and it should not sit between a student and the preview. */}
        {!staffMode && <StaffLink className="mt-10 lg:hidden" />}
      </main>
    </div>
  );
}

function StaffLink({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-ink-faint ${className}`}>
      Placement cell?{" "}
      <Link to="/signin?staff" className="font-medium text-ink-soft hover:text-ink">
        Staff sign-in
      </Link>
    </p>
  );
}

/** What you get, in the order you get it. */
const OUTCOMES: { icon: IconName; title: string; sub: string }[] = [
  { icon: "mic", title: "Practise out loud", sub: "An interviewer that follows up until it finds the edge of what you know." },
  { icon: "target", title: "See what held", sub: "Every mark points to the exact words of yours it was based on." },
  { icon: "graph", title: "Know what to fix next", sub: "Your skill graph picks the topic that unblocks the most others." },
];

/**
 * The product, before the form: one exchange from an interview, the word it
 * earned, and the topic it moved. An example, and labelled as one.
 */
function Showcase() {
  return (
    <section aria-label="What practising here looks like">
      <div className="panel relative overflow-hidden p-5">
        <span className="absolute top-4 right-4 rounded-full border border-line px-2 py-0.5 text-[0.625rem] text-ink-faint">
          Example
        </span>
        <div className="flex gap-3 pr-14">
          <Face name="Priya" size={36} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-faint">Priya · Senior Engineer</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink">
              Why is lookup in a hash map O(1) on average — and what has to be true for that to hold?
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md border border-brand-line bg-brand-soft px-4 py-3">
            <p className="text-xs font-medium text-brand">You</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">
              The key is hashed straight to a bucket, so there's no scan — as long as keys spread evenly
              and the table resizes before it fills.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-medium text-ink">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mastery-strong" />
            Strong
          </span>
          <span className="text-ink-soft">covered 3 of 3 key points</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-ink-soft">
            <Icon name="graph" size={13} /> Hashing moved up to <span className="font-medium text-ink">solid</span>
          </span>
        </div>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {OUTCOMES.map((o, i) => (
          <li key={o.title} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
              <Icon name={o.icon} size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                <span className="text-ink-faint" data-numeric>
                  {i + 1}.
                </span>{" "}
                {o.title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{o.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
