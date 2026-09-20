/**
 * The overview - the screen PORTS.txt has always described as "the shell:
 * every built module UI mounted", and the first one in the platform that shows
 * the journey as a journey rather than as a pile of repositories.
 *
 * It renders planned stages too, dashed and unlinked. That is the platform's
 * standing rule applied one level up: absent, not stubbed, and said out loud.
 * A student who can see that the mock interview is step 4 and is not built yet
 * understands the product better than one shown seven steps and no gap.
 *
 * No container of its own: the frame owns width and padding for every page, so
 * a page that re-declares them gets double gutters and a column narrower than
 * the one beside it.
 */
import { Link } from "react-router-dom";

import { JOURNEY, type Stage } from "../lib/journey";

function KindBadge({ kind }: { kind: Stage["kind"] }) {
  if (kind === "ui") {
    return (
      <span className="rounded-full border border-confirmed-line bg-confirmed-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-confirmed">
        Open
      </span>
    );
  }
  if (kind === "headless") {
    return (
      <span className="rounded-full border border-line-strong bg-surface-sunken px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-soft">
        Service
      </span>
    );
  }
  return (
    <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-faint">
      Not built
    </span>
  );
}

function StageBody({ stage }: { stage: Stage }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-sunken text-xs font-bold text-ink-soft"
        >
          {stage.step}
        </span>
        <span className="provenance">{stage.module}</span>
        <span className="ml-auto">
          <KindBadge kind={stage.kind} />
        </span>
      </div>

      <h3 className="mt-3.5 text-section font-semibold text-ink">{stage.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{stage.blurb}</p>
      <p className="mt-3.5 border-t border-line pt-3.5 text-xs leading-relaxed text-ink-faint">
        {stage.mechanism}
      </p>
    </>
  );
}

function StageCard({ stage }: { stage: Stage }) {
  if (stage.to) {
    return (
      <Link
        to={stage.to}
        className="panel group flex flex-col p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-raised"
      >
        <StageBody stage={stage} />
        <span className="mt-4 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
          Open {stage.title.toLowerCase()} &rarr;
        </span>
      </Link>
    );
  }

  return (
    <div
      className={
        stage.kind === "planned"
          ? "flex flex-col rounded-panel border border-dashed border-line-strong bg-surface/50 p-5"
          : "panel flex flex-col p-5"
      }
    >
      <StageBody stage={stage} />
      {stage.api && (
        <p className="provenance mt-4 truncate">
          no UI &middot; {stage.api}
        </p>
      )}
    </div>
  );
}

export function Home() {
  const live = JOURNEY.filter((s) => s.kind === "ui").length;
  const headless = JOURNEY.filter((s) => s.kind === "headless").length;
  const planned = JOURNEY.filter((s) => s.kind === "planned").length;

  return (
    <>
      {/* ---------- hero ---------- */}
      <header className="border-b border-line pb-9">
        <p className="rule-label">The platform</p>
        <h1 className="mt-2.5 max-w-4xl text-display font-semibold text-ink">
          One profile. Every module reads it before it acts.
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Eight stages from a pasted resume to a study plan. Nothing below is a mock-up:
          every linked stage is that module&rsquo;s own code, mounted here from its own
          repository.
        </p>

        <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
          {[
            { n: live, label: "with a screen you can open" },
            { n: headless, label: "running as services, no UI" },
            { n: planned, label: "specified, not built yet" },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-2xl font-semibold tracking-tight text-ink" data-numeric>
                {s.n}
              </dt>
              <dd className="mt-0.5 text-xs text-ink-faint">{s.label}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ---------- the journey ---------- */}
      <section className="mt-9">
        <h2 className="rule-label">The journey, in order</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {JOURNEY.map((stage) => (
            <StageCard key={stage.module} stage={stage} />
          ))}
        </div>
      </section>

      {/* ---------- the argument ---------- */}
      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-2">
          <h2 className="text-section font-semibold text-ink">
            Where the connection is visible
          </h2>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Stop M04 and reload a company page: the preparation section drops out and names
            the module it needed, while the rest of the page renders unchanged. That is the
            platform rule &mdash; a missing input narrows the scope of what we show, never
            the quality, and never silently.
          </p>
          <Link
            to="/system"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            See what each module is missing &rarr;
          </Link>
        </div>

        <div className="panel p-6">
          <h2 className="text-section font-semibold text-ink">Two rules, everywhere</h2>
          <ul className="mt-3 space-y-3 text-sm text-ink-soft">
            <li className="border-l-2 border-confirmed pl-3 leading-relaxed">
              Every fact shows its source, retrieval date and corroboration count.
            </li>
            <li className="border-l-2 border-line-strong pl-3 leading-relaxed">
              <span className="font-medium text-ink">Not measured is never zero.</span> A
              state with no evidence renders as absent, not as 0.0.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
