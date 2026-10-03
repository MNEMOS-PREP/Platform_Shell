/**
 * History — every interview, and how the student has changed across them.
 *
 * Today shows the last four sessions; there was no page with all of them and
 * no way to see change over time. This one reads M06's session list (up to the
 * backend's 200) and M04's trajectory, and says what moved in words: a topic
 * "moved up" when its latest estimate is above its first. Counts and
 * directions, never a readiness score.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Icon, PageHeader, SkeletonRows, candidateIdOf, relativeDays, useSession } from "@ai/core";
import { useTrajectory } from "@ai/m04";
import { useHistory, type SessionSummary } from "@ai/m06";

const MODE_LABEL: Record<string, string> = {
  practice: "Practice",
  mock: "Mock",
  real_drive: "Real drive",
  final_boss: "Final boss",
};

function monthOf(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function Row({ s }: { s: SessionSummary }) {
  const finished = s.status === "ended" || s.status === "aborted";
  const minutes =
    s.started_at && s.ended_at
      ? Math.max(1, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000))
      : null;
  return (
    <li>
      <Link
        to={finished ? `/mock/${s.id}/report` : `/mock/${s.id}`}
        className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-surface-sunken"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-ink-soft">
          <Icon name={s.kind === "drill" ? "zap" : "mic"} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {s.kind === "drill" ? "Defend drill" : `${MODE_LABEL[s.mode] ?? s.mode} interview`}
          </span>
          <span className="block text-xs text-ink-faint">
            {new Date(s.created_at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
            {minutes !== null ? ` · ${minutes} of ${s.requested_minutes} min` : ` · ${s.requested_minutes} min planned`}
          </span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
            finished ? "bg-surface-sunken text-ink-soft" : "border border-brand-line bg-brand-soft text-brand"
          }`}
        >
          {finished ? "Notes" : s.status === "planned" ? "Planned" : "Continue"}
        </span>
      </Link>
    </li>
  );
}

export function History() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const history = useHistory(200);
  const trajectory = useTrajectory(candidate);

  const groups = useMemo(() => {
    const out = new Map<string, SessionSummary[]>();
    for (const s of history.data ?? []) out.set(monthOf(s.created_at), [...(out.get(monthOf(s.created_at)) ?? []), s]);
    return [...out.entries()];
  }, [history.data]);

  const movers = useMemo(() => {
    const rows = (trajectory.data?.series ?? [])
      .map((series) => {
        const pts = series.points.filter((p) => p.theta !== null);
        if (pts.length < 2) return null;
        const delta = pts[pts.length - 1]!.theta! - pts[0]!.theta!;
        return { name: series.name, id: series.concept_id, delta, answers: pts.length, since: pts[0]!.observed_at };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    return {
      up: rows.filter((r) => r.delta > 0.15).sort((a, b) => b.delta - a.delta),
      down: rows.filter((r) => r.delta < -0.15).sort((a, b) => a.delta - b.delta),
      held: rows.filter((r) => Math.abs(r.delta) <= 0.15).length,
    };
  }, [trajectory.data]);

  const started = (history.data ?? []).filter((s) => s.started_at).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="History"
        subtitle="Every interview you've taken, and which topics have moved since you started."
      >
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-2xl font-semibold tracking-tight text-ink" data-numeric>
              {history.data ? started : "—"}
            </dt>
            <dd className="text-xs text-ink-faint">interviews started</dd>
          </div>
          <div>
            <dt className="text-2xl font-semibold tracking-tight text-ink" data-numeric>
              {trajectory.data ? movers.up.length : "—"}
            </dt>
            <dd className="text-xs text-ink-faint">topics moved up</dd>
          </div>
        </dl>
      </PageHeader>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Your interviews">
          {history.isLoading ? (
            <SkeletonRows label="Loading your interviews" rows={6} />
          ) : groups.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="text-sm text-ink-soft">No interviews yet.</p>
              <Link to="/mock" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                <Icon name="mic" size={15} /> Take your first
              </Link>
            </div>
          ) : (
            groups.map(([month, rows]) => (
              <div key={month} className="mb-6">
                <h2 className="px-3 text-xs font-medium text-ink-faint">{month}</h2>
                <ul className="mt-1">
                  {rows.map((s) => (
                    <Row key={s.id} s={s} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-ink">How you've changed</h2>
            <p className="mt-1 text-xs text-ink-faint">Topics answered more than once, first answer against latest.</p>
            {trajectory.isLoading ? (
              <SkeletonRows label="Loading your progress" rows={3} className="mt-4" />
            ) : movers.up.length + movers.down.length + movers.held === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">
                Answer a topic twice and its change shows here.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {movers.up.slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="text-confirmed" aria-hidden>▲</span>
                    <Link to={`/skills?concept=${encodeURIComponent(m.id)}`} className="flex-1 truncate text-ink hover:text-brand">
                      {m.name}
                    </Link>
                    <span className="text-xs text-ink-faint">{m.answers} answers</span>
                  </li>
                ))}
                {movers.down.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="text-contested" aria-hidden>▼</span>
                    <Link to={`/skills?concept=${encodeURIComponent(m.id)}`} className="flex-1 truncate text-ink hover:text-brand">
                      {m.name}
                    </Link>
                    <span className="text-xs text-ink-faint">since {relativeDays(m.since)}</span>
                  </li>
                ))}
                {movers.held > 0 && (
                  <li className="text-xs text-ink-faint">
                    {movers.held} more held steady.
                  </li>
                )}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
