/**
 * `/code` — live coding (M07), inside the shell.
 *
 * The screen, its editor themes, the test panel and the interviewer card are M07's (`LiveCoding` in @ai/m07), the
 * same component the mock interview opens. What this page owns is the round: it asks M07's backend for a problem
 * (`/v1/coding`, proxied by noun like every other module), runs the student's code in that backend's sandbox and
 * sends the final answer to be scored. Hidden tests never reach the browser; the backend only counts them.
 *
 * A stand-in for M05's question bank: the backend ships six problems of its own, and this page lists them. When M05
 * serves coding questions the list comes from there; nothing below changes but the source of the ids.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button, EmptyState, ErrorNote, PageHeader, SkeletonRows } from "@ai/core";
import { LiveCoding, listProblems, openRemoteRound, type ProblemSummary, type RemoteRound, type SubmitResult } from "@ai/m07";

type Report = {
  total?: number;
  max?: number;
  breakdown?: Record<string, number>;
  weights?: Record<string, number>;
  expected_complexity?: string;
  hints_used?: unknown[];
  execution_unavailable?: boolean;
};

const PARTS: [string, string][] = [
  ["correctness", "Correctness"],
  ["efficiency", "Efficiency"],
  ["quality", "Code quality"],
  ["process", "How you worked"],
];

function Result({ result, onAgain }: { result: SubmitResult; onAgain: () => void }) {
  if (result.status === "compile_error") {
    return (
      <p className="panel mt-4 p-4 text-sm text-ink-soft" role="status">
        That did not compile, so nothing was scored. Fix it and submit again.
      </p>
    );
  }
  const r = (result.report ?? {}) as Report;
  return (
    <section className="panel mt-4 p-5" aria-label="Your result" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Your result</h2>
        <p className="text-2xl font-semibold tracking-tight text-ink" data-numeric>
          {r.total ?? 0}
          <span className="text-sm font-normal text-ink-faint"> / {r.max ?? 100}</span>
        </p>
      </div>
      {r.execution_unavailable && (
        <p className="mt-2 text-sm text-ink-soft">Your language could not be run here, so this was scored by reading the code.</p>
      )}
      <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {PARTS.map(([key, label]) => (
          <div key={key} className="flex items-baseline justify-between border-t border-line pt-2 text-sm">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="text-ink" data-numeric>
              {r.breakdown?.[key] ?? 0} <span className="text-ink-faint">/ {r.weights?.[key] ?? "–"}</span>
            </dd>
          </div>
        ))}
      </dl>
      {r.expected_complexity && <p className="mt-3 text-xs text-ink-faint">The expected solution is {r.expected_complexity}.</p>}
      <div className="mt-4">
        <Button onClick={onAgain}>Try another problem</Button>
      </div>
    </section>
  );
}

export function LiveCodingPage() {
  const [params, setParams] = useSearchParams();
  const problemId = params.get("problem");
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [round, setRound] = useState<RemoteRound | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listProblems()
      .then((p) => alive && setProblems(p))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  // One round per chosen problem; picking another (or going back to the list) starts clean.
  useEffect(() => {
    setRound(null);
    setResult(null);
    if (!problemId) return;
    let alive = true;
    openRemoteRound("", problemId)
      .then((r) => alive && setRound(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [problemId]);

  const chosen = useMemo(() => problems?.find((p) => p.id === problemId), [problems, problemId]);

  return (
    <>
      <PageHeader
        eyebrow="Practise"
        title="Live coding"
        subtitle={chosen ? chosen.title : "Write the code, run it against tests, and see how you did."}
        actions={problemId ? <Button variant="secondary" onClick={() => setParams({})}>All problems</Button> : undefined}
      />

      {error && <ErrorNote message={`${error} The coding service may not be running.`} />}

      {!problemId &&
        (problems === null ? (
          !error && <SkeletonRows label="Loading problems" rows={4} className="mx-auto mt-6 max-w-xl" />
        ) : problems.length === 0 ? (
          <EmptyState title="No problems yet">The coding service has no problems to set.</EmptyState>
        ) : (
          <ul className="mx-auto mt-4 grid max-w-3xl gap-2">
            {problems.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setParams({ problem: p.id })}
                  className="panel flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:border-line-strong"
                >
                  <span className="font-medium text-ink">{p.title}</span>
                  <span className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-ink-soft">{p.difficulty}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {problemId && !round && !error && <SkeletonRows label="Starting your round" rows={3} className="mx-auto mt-6 max-w-xl" />}

      {problemId && round && (
        <>
          <LiveCoding
            key={round.turnId}
            request={round.request}
            judge={round.judge}
            onSubmit={({ language, code }) => {
              setError(null);
              round
                .submit(language, code)
                .then(setResult)
                .catch((e: Error) => setError(e.message));
            }}
          />
          {result && <Result result={result} onAgain={() => setParams({})} />}
        </>
      )}
    </>
  );
}
