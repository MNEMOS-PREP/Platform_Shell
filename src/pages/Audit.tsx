/**
 * Audit — why the platform decided what it decided.
 *
 * Platform_Audit keeps a ledger of decisions: which question was picked and
 * what was passed over, which rules fired, which model answered. Every record
 * is hash-chained per trace, so a trace that was edited afterwards says so.
 * This page reads that ledger for staff; it writes nothing.
 *
 * Requests go through /sys/audit/..., and the dev proxy adds the service
 * token, so the browser never holds it.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState, ErrorNote, PageHeader, SkeletonRows, instant } from "@ai/core";

interface TraceSummary {
  trace_id: string;
  kind: string;
  root_module: string;
  status: string;
  started_at: string;
  subject_pseudo_id: string | null;
  decisions: number;
  failed_checks: number;
  records: number;
}

interface LedgerRecord {
  seq: number;
  record: string;
  name?: string;
  module?: string;
  alternatives?: { option: string; rejected_because?: string; score?: number }[];
  chosen?: { value: unknown; method?: string; confidence?: number | null };
  rationale?: { rules_fired?: string[]; free_text?: string | null };
  inputs?: { summary?: Record<string, unknown> };
  output_ref?: { kind: string; id: string };
  model?: string | null;
  code_version?: string;
  cost?: { latency_ms?: number | null; tokens_in?: number | null; tokens_out?: number | null };
  ok?: boolean;
  severity?: string;
}

interface TraceDetail extends Omit<TraceSummary, "records"> {
  env: string;
  chain_breaks: unknown[];
  records: LedgerRecord[];
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status === 401 ? "The audit service refused the token." : `${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}

const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[0.6875rem] text-ink-soft">
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 py-1 text-sm">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

function Decision({ r }: { r: LedgerRecord }) {
  const rules = r.rationale?.rules_fired ?? [];
  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm font-medium text-ink">
        {r.name ?? r.record} <span className="font-normal text-ink-faint">#{r.seq}</span>
      </p>
      <dl className="mt-2">
        {r.chosen && (
          <Row label="Chose">
            <span className="font-medium">{show(r.chosen.value)}</span>
            {r.chosen.method && <span className="ml-2"><Chip>{r.chosen.method}</Chip></span>}
          </Row>
        )}
        {rules.length > 0 && (
          <Row label="Because">
            <span className="flex flex-wrap gap-1.5">{rules.map((x) => <Chip key={x}>{x}</Chip>)}</span>
          </Row>
        )}
        {r.rationale?.free_text && <Row label="Reason">{r.rationale.free_text}</Row>}
        {r.inputs?.summary && <Row label="Looked at"><code className="text-xs">{show(r.inputs.summary)}</code></Row>}
        {(r.alternatives ?? []).length > 0 && (
          <Row label="Passed over">
            <ul>
              {r.alternatives!.map((a) => (
                <li key={a.option}>
                  <code className="text-xs">{a.option}</code>
                  {a.rejected_because && <span className="text-ink-soft"> — {a.rejected_because}</span>}
                </li>
              ))}
            </ul>
          </Row>
        )}
        {r.model && <Row label="Model">{r.model}</Row>}
        {r.cost?.latency_ms != null && (
          <Row label="Took">
            {r.cost.latency_ms} ms
            {r.cost.tokens_in != null && ` · ${r.cost.tokens_in} in / ${r.cost.tokens_out ?? "?"} out`}
          </Row>
        )}
      </dl>
    </li>
  );
}

function Other({ r }: { r: LedgerRecord }) {
  const bad = r.record === "check" && r.ok === false;
  return (
    <li
      className={`rounded-lg border px-4 py-2.5 text-sm ${
        bad ? "border-contested-line bg-contested-soft text-ink" : "border-line bg-surface-sunken text-ink-soft"
      }`}
    >
      {r.record} #{r.seq} {r.name ?? ""} {r.record === "check" ? (r.ok ? "passed" : `failed (${r.severity ?? "?"})`) : ""}
    </li>
  );
}

function Detail({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["audit", "trace", id], queryFn: () => getJson<TraceDetail>(`/sys/audit/v1/traces/${id}`) });
  if (q.isPending) return <SkeletonRows label="Loading the trace" rows={4} />;
  if (q.isError) return <ErrorNote message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  const t = q.data;
  const intact = t.chain_breaks.length === 0;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-medium text-ink capitalize">{t.kind}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
            intact ? "border border-confirmed-line bg-confirmed-soft text-confirmed" : "border border-contested-line bg-contested-soft text-ink"
          }`}
        >
          {intact ? "✓ ledger intact" : `✗ ${t.chain_breaks.length} break(s) in the chain`}
        </span>
        <Chip>{t.env}</Chip>
        <Chip>{t.records.length} records</Chip>
      </div>
      <p className="mt-1 break-all text-xs text-ink-faint">{t.trace_id}</p>
      <ul className="mt-4 space-y-3">
        {t.records.map((r) => (r.record === "decision" ? <Decision key={r.seq} r={r} /> : <Other key={r.seq} r={r} />))}
      </ul>
    </div>
  );
}

export function Audit() {
  const [picked, setPicked] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["audit", "traces"],
    queryFn: () => getJson<TraceSummary[]>("/sys/audit/v1/traces"),
    refetchInterval: 15_000,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Audit"
        subtitle="Why the platform made each decision, with proof the record was not edited afterwards."
      />
      {list.isPending ? (
        <SkeletonRows label="Loading the traces" rows={5} />
      ) : list.isError ? (
        <ErrorNote
          message={`The audit service is not reachable. ${(list.error as Error).message}`}
          detail="Start it with Platform-Audit/start_audit.bat (port 8190)."
          onRetry={() => list.refetch()}
        />
      ) : list.data.length === 0 ? (
        <EmptyState title="Nothing recorded yet" icon="shield">
          Once a module records its decisions, each interview shows up here.
        </EmptyState>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[18rem_1fr]">
          <ul className="space-y-1">
            {list.data.map((t) => (
              <li key={t.trace_id}>
                <button
                  type="button"
                  onClick={() => setPicked(t.trace_id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left ${
                    picked === t.trace_id ? "border-brand-line bg-brand-soft" : "border-line bg-surface hover:bg-surface-sunken"
                  }`}
                >
                  <span className="block text-sm font-medium text-ink capitalize">
                    {t.kind} <span className="font-normal text-ink-faint">{t.root_module}</span>
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {instant(t.started_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    {` · ${t.decisions} decision${t.decisions === 1 ? "" : "s"}`}
                    {t.failed_checks > 0 && ` · ${t.failed_checks} failed check${t.failed_checks === 1 ? "" : "s"}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div>{picked ? <Detail id={picked} /> : <p className="text-sm text-ink-faint">Pick an interview on the left.</p>}</div>
        </div>
      )}
    </div>
  );
}
