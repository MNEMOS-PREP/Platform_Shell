/**
 * What every module is missing, side by side.
 *
 * Each module already answers this about itself at /v1/deps, and each module's
 * own DepsPage renders that answer. What no single module can show is the
 * SHAPE: M04 is down, so three separate modules each lost a different feature
 * and each says so in its own words. That is the connective tissue as an
 * observable fact rather than a claim in a document, and it only exists here.
 *
 * Requests go through /sys/<mod>/... — a per-module proxy prefix — because
 * /v1/deps is the one path every backend serves, so it is the one path a
 * noun-routed proxy cannot disambiguate.
 */
import { useQueries } from "@tanstack/react-query";
import { DependencyTable, type DependencyStatus } from "@ai/core";

import { BACKENDS } from "../lib/journey";

interface Health {
  status: string;
  module: string;
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}

/** /v1/deps returns a bare object when a module declares exactly one upstream. */
function asList(payload: unknown): DependencyStatus[] {
  if (Array.isArray(payload)) return payload as DependencyStatus[];
  if (payload && typeof payload === "object") return [payload as DependencyStatus];
  return [];
}

export function System() {
  const health = useQueries({
    queries: BACKENDS.map((b) => ({
      queryKey: ["sys", b.id, "health"],
      queryFn: () => getJson<Health>(`/sys/${b.id}/health`),
      retry: 0,
      refetchInterval: 15_000,
    })),
  });

  const deps = useQueries({
    queries: BACKENDS.map((b) => ({
      queryKey: ["sys", b.id, "deps"],
      queryFn: () => getJson<unknown>(`/sys/${b.id}/v1/deps`),
      retry: 0,
      refetchInterval: 15_000,
    })),
  });

  const upCount = health.filter((h) => h.data?.status === "ok").length;

  // No container: the frame owns width and padding for every page.
  return (
    <>
      <header className="border-b border-line pb-7">
        <p className="rule-label">System</p>
        <h1 className="mt-2.5 text-title font-semibold text-ink">
          Six services, and what each one needs
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Live, refreshed every fifteen seconds. An upstream marked unavailable is not an
          error &mdash; it removes a feature and names itself. Close a module&rsquo;s
          terminal tab and watch which rows change.
        </p>
        <p className="mt-4 text-sm text-ink-soft">
          <span className="text-2xl font-semibold tracking-tight text-ink" data-numeric>
            {upCount}
          </span>
          <span className="ml-1.5 text-ink-faint">of {BACKENDS.length} responding</span>
        </p>
      </header>

      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {BACKENDS.map((b, i) => {
          const h = health[i];
          const d = deps[i];
          const up = h.data?.status === "ok";

          return (
            <section key={b.id} className="panel p-5">
              <header className="flex flex-wrap items-center gap-3">
                <h2 className="text-section font-semibold text-ink">{b.label}</h2>
                <span className="provenance">:{b.port}</span>
                <span className="ml-auto">
                  {h.isPending ? (
                    <span className="provenance">checking…</span>
                  ) : up ? (
                    <span className="rounded-full border border-confirmed-line bg-confirmed-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-confirmed">
                      up
                    </span>
                  ) : (
                    <span className="rounded-full border border-contested-line bg-contested-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-contested">
                      not running
                    </span>
                  )}
                </span>
              </header>

              <div className="mt-4">
                {d.isPending && <p className="provenance">reading dependencies…</p>}
                {d.isError && (
                  <p className="text-sm text-ink-soft">
                    Cannot ask this module what it needs while it is down.
                  </p>
                )}
                {d.data !== undefined && <DependencyTable statuses={asList(d.data)} />}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
