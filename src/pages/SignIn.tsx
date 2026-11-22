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
import { useEffect, useState } from "react";
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

import { Landing } from "./Landing";
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
    session: () => ({ role: "reviewer", subject: "reviewer-1", name: "Question reviewer" }),
    title: "Question reviewer",
    icon: "shield",
    shows: "Drafted questions awaiting a decision. Questions only, never a student's record.",
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
  // 2026-11-22 (good_and_bads #14): with AUTH_MODE=email the shell proves the
  // address with a code before anyone is signed in (server/auth.ts), and the
  // identity every module sees comes from its cookie. Demo mode is as before.
  const [mode, setMode] = useState<"demo" | "email" | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  useEffect(() => {
    let alive = true;
    fetch("/auth/me")
      .then((r) => (r.ok ? r.json() : { mode: "demo" }))
      .then((body: { mode?: string }) => alive && setMode(body.mode === "email" ? "email" : "demo"))
      .catch(() => alive && setMode("demo"));
    return () => {
      alive = false;
    };
  }, []);
  const proving = mode === "email";

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
    if (proving) {
      await proveEmail();
      return;
    }
    try {
      const subject = await subjectForEmail(email);
      const display = name.trim() || firstName(normaliseEmail(email).split("@")[0]!.replace(/[._-]+/g, " ")) || undefined;
      go({ role: "student", subject, name: display }, email);
    } catch {
      setError("This browser can't sign in here — open the platform on localhost or over https.");
      setBusy(false);
    }
  };

  /** Email mode: send a code, then check it. The session comes back from the
   *  server, which also set the cookie the proxy reads. */
  const proveEmail = async () => {
    const post = (path: string, body: unknown) =>
      fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    try {
      if (!codeSent) {
        const sent = await post("/auth/code", { email });
        if (!sent.ok) throw new Error(((await sent.json()) as { detail?: string }).detail ?? "The code could not be sent.");
        setCodeSent(true);
        setBusy(false);
        return;
      }
      const checked = await post("/auth/verify", { email, code });
      const body = (await checked.json()) as { detail?: string; session?: { role: Session["role"]; subject: string } };
      if (!checked.ok || !body.session) throw new Error(body.detail ?? "That code isn't right.");
      const display = name.trim() || firstName(normaliseEmail(email).split("@")[0]!.replace(/[._-]+/g, " ")) || undefined;
      go({ role: body.session.role, subject: body.session.subject, name: display }, email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(false);
    }
  };

  const brand = (
    <div className="flex items-center gap-3">
      <img src="/logo.png" alt="" aria-hidden className="logo-themed h-11 w-auto" />
      <span>
        <span className="brand-name block font-semibold tracking-tight text-ink">AI Interviewer</span>
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
            id="signin-email"
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
        {proving && codeSent && (
          <label className="block text-sm font-medium text-ink">
            The code we emailed you
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="6 digits"
              className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 font-mono text-[0.9375rem] tracking-[0.3em] text-ink outline-none focus:border-brand"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-contested">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !email.trim() || (proving && codeSent && code.length !== 6)}
          className="bg-brand-gradient flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {busy ? "Signing in…" : proving && !codeSent ? "Email me a code" : "Continue"}
          <Icon name="arrowRight" size={16} />
        </button>
        <p className="text-xs leading-relaxed text-ink-faint">
          {proving
            ? "We email a six-digit code to prove it's you. It works once, for ten minutes."
            : "The same email brings back your interviews and skill graph on any device."}
        </p>
      </form>

      {!proving && (
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
      )}

      {staffMode && !proving && (
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

      {!staffMode && !current && !proving && <StaffLink className="mt-6 !text-left" />}
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

  // Signed out: the landing, with this same form beside the product.
  return <Landing signInBlock={signInBlock} />;
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
