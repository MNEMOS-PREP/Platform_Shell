/**
 * `/roadmap/checkpoint/:id` — the checkpoint interview, as a part of learning.
 *
 * A short check on ONE roadmap topic, asked one question at a time: no panel, no plan page, no mock-interview room.
 * M06's engine runs it underneath (the questions, the follow-ups, the judging); this screen is its own. When it ends,
 * the result and what to work on come from M06's report, and the roadmap reads the same result to cover the topic.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button, ErrorNote, Icon, SkeletonRows, api } from "@ai/core";

import { INTERVIEW_TO_COVER, pending, scoreOf, stopById } from "../roadmap";

interface Turn {
  turn_id: string;
  role: "interviewer" | "candidate" | "system";
  text: string;
  question_text?: string | null;
}

interface Session {
  id: string;
  status: string;
  questions_asked: number;
  open_turn_id: string | null;
  in_closing: boolean;
  transcript: Turn[];
  plan: { segments: { kind: string; title?: string; question_budget: number; dropped_reason?: string | null }[] } | null;
}

interface Point {
  point: string;
  fix?: string;
}

interface QuestionReport {
  question: string;
  status?: string | null;
  status_label?: string | null;
  status_detail?: string | null;
  went_well?: string[];
  study?: string[];
  writeup?: { headline: string; gaps: Point[]; next_steps: string[] } | null;
}

interface Report {
  status: string;
  writeups?: string;
  questions: QuestionReport[];
  summary?: { status_counts?: Record<string, number>; held?: string[]; gaps?: string[]; focus?: string[] };
}

const FINAL = new Set(["ended", "aborted"]);

const BADGE: Record<string, string> = {
  correct: "border-confirmed-line bg-confirmed-soft text-confirmed",
  partial: "border-line bg-surface-sunken text-ink-soft",
  vague: "border-line bg-surface-sunken text-ink-soft",
  incorrect: "border-contested-line bg-contested-soft text-ink",
  unanswered: "border-line bg-surface-sunken text-ink-faint",
};

/** The line the interviewer is waiting on: the last thing they said. */
function openLine(s: Session): string {
  for (let i = s.transcript.length - 1; i >= 0; i--) {
    const t = s.transcript[i]!;
    if (t.role === "interviewer") return t.question_text || t.text;
  }
  return "";
}

export function Checkpoint() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  // The topic is in the plan ("Focus: Arrays"), so it is still there once the result has been saved and the memory cleared.
  const topic =
    session?.plan?.segments.find((s) => s.kind !== "warmup" && s.kind !== "closing")?.title?.replace(/^Focus:\s*/, "") ||
    stopById(pending()?.stopId ?? "")?.name ||
    "this topic";
  const [report, setReport] = useState<Report | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      setSession(await api.get<Session>(`/v1/interviews/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // A turn the interviewer has not finished: ask again until there is a line to answer.
  const waiting = session !== null && !FINAL.has(session.status) && !session.open_turn_id;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => void load(), 1500);
    return () => clearInterval(t);
  }, [waiting, load]);

  const final = session !== null && FINAL.has(session.status);
  // The report, and again while its write-ups are still being written.
  useEffect(() => {
    if (!final) return;
    let stop = false;
    const get = async () => {
      try {
        const r = await api.get<Report>(`/v1/interviews/${id}/report`);
        if (stop) return;
        setReport(r);
        if (r.writeups === "pending") setTimeout(() => void get(), 3000);
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
    };
    void get();
    return () => {
      stop = true;
    };
  }, [final, id]);

  const act = async (fn: () => Promise<Session>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setSession(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!session?.open_turn_id || !answer.trim()) return;
    const text = answer.trim();
    void act(async () => {
      const next = await api.post<Session>(`/v1/interviews/${id}/answer`, { question_turn_id: session.open_turn_id, text });
      setAnswer("");
      return next;
    });
  };
  const skip = () => session?.open_turn_id && void act(() => api.post<Session>(`/v1/interviews/${id}/skip`, { question_turn_id: session.open_turn_id }));
  const end = () => void act(() => api.post<Session>(`/v1/interviews/${id}/end`, { reason: "ended_by_student" }));

  const total = session?.plan?.segments.filter((s) => s.kind !== "warmup" && s.kind !== "closing" && !s.dropped_reason).reduce((n, s) => n + s.question_budget, 0) ?? 0;

  if (error && !session) return <ErrorNote message="The checkpoint could not be opened." detail={error} onRetry={() => void load()} />;
  if (!session) return <SkeletonRows label="Opening your checkpoint" rows={3} className="mx-auto mt-10 max-w-xl" />;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/roadmap" aria-label="Back to the roadmap" className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-sunken">
          <Icon name="arrowLeft" size={18} />
        </Link>
        <span className="rounded-full border border-brand-line bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">Checkpoint</span>
        <h1 className="text-lg font-semibold text-ink">{topic}</h1>
        {!final && (
          <button type="button" onClick={end} disabled={busy} className="ml-auto text-sm text-ink-soft hover:text-ink disabled:opacity-50">
            End checkpoint
          </button>
        )}
      </div>

      {!final && (
        <div className="mt-6">
          <p className="text-xs text-ink-faint">
            {session.in_closing ? "Last step" : `Question ${Math.max(session.questions_asked, 1)}${total ? ` of about ${total}` : ""}`}
          </p>
          <div className="mt-2 rounded-2xl border border-line bg-surface p-5">
            {waiting ? (
              <p className="text-sm text-ink-soft">Thinking about your answer…</p>
            ) : (
              <p className="text-lg leading-relaxed text-ink">{openLine(session)}</p>
            )}
          </div>

          {!waiting && session.in_closing && (
            <div className="mt-4">
              <p className="text-sm text-ink-soft">That is the last question. Finish to see how it went.</p>
              <div className="mt-3">
                <Button onClick={end} disabled={busy}>
                  Finish and see the result
                </Button>
              </div>
            </div>
          )}

          {!waiting && !session.in_closing && (
            <div className="mt-4">
              <textarea
                ref={box}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
                rows={5}
                placeholder="Type your answer. Say what you would say out loud."
                aria-label="Your answer"
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-brand"
              />
              <div className="mt-3 flex items-center gap-3">
                <Button onClick={submit} disabled={busy || !answer.trim()}>
                  Submit answer
                </Button>
                <button type="button" onClick={skip} disabled={busy} className="text-sm text-ink-soft hover:text-ink disabled:opacity-50">
                  Skip this one
                </button>
                <span className="ml-auto text-xs text-ink-faint">Ctrl + Enter submits</span>
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-contested">{error}</p>}
        </div>
      )}

      {final && (
        <Result report={report} topic={topic} onBack={() => navigate("/roadmap")} />
      )}
    </div>
  );
}

function Result({ report, topic, onBack }: { report: Report | null; topic: string; onBack: () => void }) {
  if (!report) return <SkeletonRows label="Writing up your result" rows={4} className="mt-8" />;
  const score = scoreOf(report.summary?.status_counts ?? {});
  const strong = score !== undefined && score >= INTERVIEW_TO_COVER;
  const asked = report.questions.filter((q) => q.status && q.status !== "not_reached" && q.status !== "not_judged");
  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-line bg-surface p-5">
        {score === undefined ? (
          <>
            <p className="text-lg font-medium text-ink">No answer was judged</p>
            <p className="mt-1 text-sm text-ink-soft">The checkpoint ended before there was anything to mark, so nothing changes on your roadmap. Have another go when you are ready.</p>
          </>
        ) : (
          <>
            <p className="text-3xl font-semibold text-ink">{Math.round(score * 100)}%</p>
            <p className="mt-1 text-sm text-ink-soft">
              {strong
                ? `A strong result on ${topic}. Finish its core concepts and the next topic opens.`
                : `Not quite there on ${topic} yet. Work through what is below, then try again.`}
            </p>
          </>
        )}
      </div>

      {(report.summary?.held?.length ?? 0) > 0 && (
        <Section title="What held up" items={report.summary!.held!} />
      )}
      {(report.summary?.gaps?.length ?? 0) > 0 && <Section title="To work on" items={report.summary!.gaps!} />}

      {asked.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Question by question</h2>
          <ul className="mt-2 space-y-3">
            {asked.map((q, i) => (
              <li key={i} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-sm font-medium text-ink">{q.question}</p>
                  {q.status && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${BADGE[q.status] ?? BADGE.vague}`}>{q.status_label || q.status}</span>}
                </div>
                {q.status_detail && <p className="mt-1.5 text-sm text-ink-soft">{q.status_detail}</p>}
                {q.writeup?.headline && <p className="mt-1.5 text-sm text-ink">{q.writeup.headline}</p>}
                {(q.writeup?.next_steps?.length ? q.writeup.next_steps : q.study ?? []).slice(0, 3).map((s) => (
                  <p key={s} className="mt-1 text-xs text-ink-soft">
                    Study: {s}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {report.writeups === "pending" && <p className="mt-3 text-xs text-ink-faint">Writing the detailed feedback…</p>}
        </div>
      )}

      <div className="mt-6">
        <Button onClick={onBack}>Back to the roadmap</Button>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
