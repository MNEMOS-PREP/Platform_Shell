/**
 * Help & feedback.
 *
 * The only way to report anything was the ⚑ on one question. A student who hit
 * a broken screen, a wrong mark or a confusing word had nowhere to say so.
 * Answers to the questions students actually ask first, the shortcuts, and a
 * "report a problem" that opens a pre-filled issue on the platform's public
 * tracker — with the page and browser filled in, and nothing about the student
 * unless they type it.
 */
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { Icon, MOD_KEY, PageHeader } from "@ai/core";

import { SHORTCUTS } from "../ui/Shortcuts";

const TRACKER = "https://github.com/MNEMOS-PREP/Platform_Shell/issues/new";

function Q({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line py-4 last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 text-[0.9375rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{q}</span>
        <Icon name="chevronDown" size={16} className="text-ink-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

export function Help() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "";
  const [kind, setKind] = useState("Something is broken");
  const [what, setWhat] = useState("");

  const report = () => {
    const body = [
      `**What happened**\n${what || "(describe it here)"}`,
      "",
      `**Where**: ${from || "(the page you were on)"}`,
      `**Browser**: ${navigator.userAgent}`,
      `**When**: ${new Date().toISOString()}`,
    ].join("\n");
    const url = `${TRACKER}?${new URLSearchParams({ title: `${kind}: ${what.slice(0, 60)}`, body, labels: "feedback" })}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Help & feedback" subtitle="Answers to the common questions, and a way to tell us what's wrong." />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Common questions" className="panel px-6 py-2">
          <Q q="How are my answers marked?">
            <p>
              A separate evaluator reads each answer against the key points a strong answer covers.
              It never sees your name. Your notes show a band per answer — Strong, Partly there or
              Not yet — from how many of those points you reached.
            </p>
            <p>
              Numerical scores stay hidden until they agree with human markers. Every mark links to
              the sentences of yours it was based on.
            </p>
          </Q>
          <Q q="Why did my skill graph not change?">
            <p>
              Two usual reasons: you haven't agreed to let your progress be remembered (check{" "}
              <Link to="/settings#privacy" className="font-medium text-brand">Settings</Link>), or the
              answers are still being marked — that takes about a minute after the interview ends.
            </p>
          </Q>
          <Q q="Can I speak my answers?">
            <p>
              Yes — press the mic in the answer box. Your browser turns speech into text, which you
              can edit before sending. It works in Chrome, Edge and Safari; if the mic button is
              missing, your browser doesn't support it yet.
            </p>
          </Q>
          <Q q="What does the placement cell see?">
            <p>
              Counts across students — how many practised, which topics are weak across a batch —
              never one student's answers or skill graph.
            </p>
          </Q>
          <Q q="How do I delete my data?">
            <p>
              <Link to="/settings#privacy" className="font-medium text-brand">Settings → Your data</Link>.
              You can download everything first. Deleting removes your skill graph and every mark
              behind it, and can't be undone.
            </p>
          </Q>
          <Q q="I paused and now there's no pause button.">
            <p>
              You get one pause per 15 minutes planned, up to five minutes each. Ending early is
              always fine and still gives you notes.
            </p>
          </Q>
        </section>

        <aside className="space-y-5">
          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-ink">Report a problem</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">
              Opens a pre-filled report on the platform's public tracker. Don't include anything
              you wouldn't post publicly.
            </p>
            <label className="mt-4 block text-xs font-medium text-ink-soft">
              What kind
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
              >
                <option>Something is broken</option>
                <option>A mark looks wrong</option>
                <option>Something is confusing</option>
                <option>An idea</option>
              </select>
            </label>
            <label className="mt-3 block text-xs font-medium text-ink-soft">
              What happened
              <textarea
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                rows={4}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <button
              type="button"
              onClick={report}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              <Icon name="externalLink" size={14} /> Open the report
            </button>
            <p className="mt-3 text-xs text-ink-faint">
              A wrong mark? Open it from your notes — "How this answer was marked" has a dispute
              button that goes straight to the people who review marks.
            </p>
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-ink">Keyboard shortcuts</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Search or jump</dt>
                <dd className="flex gap-1">
                  <span className="kbd">{MOD_KEY}</span>
                  <span className="kbd">K</span>
                </dd>
              </div>
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-soft">{s.label}</dt>
                  <dd className="flex gap-1">
                    {s.keys.map((k) => (
                      <span key={k} className="kbd">
                        {k}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
