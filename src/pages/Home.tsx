/**
 * The overview — the first screen after sign-in, and the platform's argument.
 *
 * Rebuilt 2026-10-03, for two reasons. It had never actually rendered: M15's
 * route tree carried its own index route, which React Router ranked above this
 * one, so `/` showed M15's old front page ("4 of 19 built"). And it read as a
 * document about the platform rather than as the product's front door.
 *
 * Now, top to bottom: the next thing to do (a hero with the two actions that
 * start everything), what the platform already knows about you (live, from
 * M04 — the same beliefs the skill graph shows, so the first screen is not a
 * brochure), the journey as stages with their real status, and the rules that
 * make any of it trustworthy. Planned stages still render, dashed and
 * unlinked: absent, not stubbed, and said out loud.
 */
import { Link } from "react-router-dom";

import { Icon, candidateIdOf, relativeDays, useSession, type IconName } from "@ai/core";
import { useBottlenecks, useMastery } from "@ai/m04";

import { JOURNEY, type Stage } from "../lib/journey";

const STAGE_ICON: Record<string, IconName> = {
  M01: "document",
  M02: "listChecks",
  M05: "filter",
  M06: "mic",
  M13: "target",
  M04: "graph",
  M15: "building",
  M16: "calendar",
};

function StatusPill({ kind }: { kind: Stage["kind"] }) {
  if (kind === "ui") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-confirmed-line bg-confirmed-soft px-2 py-0.5 text-[0.6875rem] font-medium text-confirmed">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-confirmed" />
        Live
      </span>
    );
  }
  if (kind === "headless") {
    return (
      <span
        title="A service with no screen of its own — other stages use it"
        className="rounded-full border border-line px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-ink-soft"
      >
        Service
      </span>
    );
  }
  return (
    <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[0.6875rem] font-medium text-ink-faint">
      Planned
    </span>
  );
}

function StageCard({ stage }: { stage: Stage }) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            stage.kind === "ui"
              ? "bg-brand-soft text-brand"
              : "bg-surface-sunken text-ink-faint"
          }`}
        >
          <Icon name={STAGE_ICON[stage.module] ?? "layers"} size={19} />
        </span>
        <span className="font-mono text-[0.6875rem] whitespace-nowrap text-ink-faint">
          {String(stage.step).padStart(2, "0")} · {stage.module}
        </span>
        <span className="ml-auto">
          <StatusPill kind={stage.kind} />
        </span>
      </div>
      <h3 className="mt-4 text-section font-semibold text-ink">{stage.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{stage.blurb}</p>
      <p className="mt-auto pt-4 text-xs leading-relaxed text-ink-faint">{stage.mechanism}</p>
    </>
  );

  if (stage.to) {
    return (
      <Link
        to={stage.to}
        className="panel group relative flex flex-col p-5 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-raised"
        style={{ transitionProperty: "transform, box-shadow, border-color", transitionDuration: "180ms" }}
      >
        {body}
        <Icon
          name="arrowRight"
          size={16}
          className="absolute top-5 right-5 text-brand opacity-0 transition-opacity group-hover:opacity-100"
        />
      </Link>
    );
  }
  return (
    <div
      className={`flex flex-col rounded-panel p-5 ${
        stage.kind === "planned"
          ? "border border-dashed border-line-strong bg-surface/40"
          : "panel"
      }`}
    >
      {body}
    </div>
  );
}

/** What the platform already believes about this student — live, from M04. */
function Snapshot({ candidate }: { candidate: string }) {
  const mastery = useMastery(candidate, false);
  const bottlenecks = useBottlenecks(candidate, false);
  const totals = mastery.data?.totals;
  const latest = (mastery.data?.measured ?? []).reduce<string | null>(
    (acc, r) => (r.last_evidence_at && (!acc || r.last_evidence_at > acc) ? r.last_evidence_at : acc),
    null,
  );
  const blocker = bottlenecks.data?.bottlenecks[0];

  const tiles: { label: string; value: string; hint: string; icon: IconName }[] = [
    {
      label: "Concepts measured",
      value: totals ? `${totals.measured}` : "—",
      hint: totals ? `of ${totals.in_ontology} in the skill graph` : "the skill graph is offline",
      icon: "graph",
    },
    {
      label: "What is blocking you",
      value: blocker ? blocker.name : mastery.data ? "Nothing yet" : "—",
      hint: blocker ? `underneath ${blocker.blocks} of your weak topics` : "needs a few answers first",
      icon: "target",
    },
    {
      label: "Last new evidence",
      value: latest ? relativeDays(latest) : mastery.data ? "None yet" : "—",
      hint: "every belief rests on an answer you gave",
      icon: "clock",
    },
  ];

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-section font-semibold text-ink">What we know about you so far</h2>
          <p className="mt-1 text-sm text-ink-soft">Live from your skill graph. Untested is never zero.</p>
        </div>
        <Link to="/skills" className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-brand sm:flex">
          Open the skill graph <Icon name="arrowRight" size={15} />
        </Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.label} to="/skills" className="panel group p-5 hover:border-brand-line">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-faint">
              <Icon name={tile.icon} size={15} />
              {tile.label}
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-ink" data-numeric>
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-ink-faint">{tile.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

const RULES: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Every fact shows its source",
    body: "Round formats, cutoffs and questions carry who reported them, when, and how many agree. Anything we cannot source, we do not show.",
    icon: "shield",
  },
  {
    title: "Not measured is never zero",
    body: "A topic nobody has asked you about is listed as untested — not scored 0. A score you see quotes the words that earned it.",
    icon: "scales",
  },
  {
    title: "A missing module narrows, never lies",
    body: "Stop any service and the screens that need it say so by name, while the rest keep working. Nothing degrades silently.",
    icon: "layers",
  },
];

export function Home() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const live = JOURNEY.filter((s) => s.kind === "ui").length;
  const firstName = session?.name?.split(" ")[0];

  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-12 shadow-card sm:px-10 lg:px-14 lg:py-16">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-80" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-brand opacity-[0.12] blur-3xl"
        />
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
            <Icon name="sparkles" size={13} />
            {live} stages live · placement prep that shows its work
          </p>
          <h1 className="mt-5 text-display font-semibold text-ink">
            {firstName ? `${firstName}, practise` : "Practise"} the interview{" "}
            <span className="text-gradient">you're actually going to sit.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
            Start from your resume or the job you're applying for. A mock interviewer probes
            until it finds the edge of what you know, every answer is scored against a rubric
            with the words that earned it, and your skill graph moves while you watch.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/mock"
              className="bg-brand-gradient inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-glow hover:opacity-95"
            >
              <Icon name="mic" size={17} />
              Start a mock interview
            </Link>
            <Link
              to="/resume"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 text-sm font-semibold text-ink hover:border-brand-line hover:bg-brand-soft"
            >
              <Icon name="document" size={17} />
              Add your resume
            </Link>
            <Link
              to="/companies"
              className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Browse companies <Icon name="arrowRight" size={15} />
            </Link>
          </div>
        </div>
      </section>

      {candidate && <Snapshot candidate={candidate} />}

      {/* ---------- the journey ---------- */}
      <section className="mt-12">
        <h2 className="text-section font-semibold text-ink">The journey</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Eight stages from a pasted resume to a study plan. Every live stage is that module's
          own code, mounted here from its own repository.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {JOURNEY.map((stage) => (
            <StageCard key={stage.module} stage={stage} />
          ))}
        </div>
      </section>

      {/* ---------- the rules ---------- */}
      <section className="mt-12 grid gap-4 lg:grid-cols-3">
        {RULES.map((rule) => (
          <div key={rule.title} className="panel p-6">
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-surface-sunken text-ink-soft">
              <Icon name={rule.icon} size={19} />
            </span>
            <h3 className="mt-4 text-section font-semibold text-ink">{rule.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{rule.body}</p>
          </div>
        ))}
      </section>
      <p className="mt-6 text-sm text-ink-faint">
        Want proof?{" "}
        <Link to="/system" className="font-medium text-brand">
          See what each module is missing right now →
        </Link>
      </p>
    </>
  );
}
