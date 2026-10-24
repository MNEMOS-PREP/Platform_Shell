/**
 * My answers — what "Evaluation" means to a student.
 *
 * The menu item a student saw as "Evaluation" opened M13's bench: a fixture
 * dropdown, an ensemble picker and regression cases. That is a staff tool and
 * now sits in the Staff menu. A student's evaluation is their own marked
 * answers, so this page lists them — newest interview first, each question
 * with its status, a link to how it was marked (M13's evidence page) and a
 * way to practise that topic again. Read from M06's notes, which already
 * carry all three; nothing is re-scored here.
 *
 * 2026-10-24: the status, not the band. The band (Strong / Partly there /
 * Not yet) was M13's key-point share, on scored questions only, and could
 * say "Strong" of an answer the notes call Incorrect. The status is the
 * interview's judgement of the whole conversation, the same badge the notes
 * show (`StatusBadge`), so the two pages cannot disagree.
 */
import { Link } from "react-router-dom";

import { Icon, PageHeader, SkeletonRows, relativeDays } from "@ai/core";
import { StatusBadge, topicName, useHistory, useReport, type SessionSummary } from "@ai/m06";

function SessionAnswers({ s }: { s: SessionSummary }) {
  const report = useReport(s.id);
  const questions = report.data?.questions ?? [];
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <Icon name="mic" size={16} className="text-ink-faint" />
        <span className="flex-1 text-sm font-medium text-ink">
          {new Date(s.created_at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          <span className="font-normal text-ink-faint"> · {relativeDays(s.created_at)}</span>
        </span>
        <Link to={`/mock/${s.id}/report`} className="text-xs font-medium text-brand">
          Full notes →
        </Link>
      </header>
      {report.isLoading ? (
        <SkeletonRows label="Loading this interview's answers" rows={2} className="p-5" />
      ) : questions.length === 0 ? (
        <p className="px-5 py-4 text-sm text-ink-faint">Nothing was asked in this one.</p>
      ) : (
        <ul className="divide-y divide-line">
          {questions.map((q, i) => {
            const name = topicName(q);
            return (
              <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="min-w-0 flex-1 basis-72">
                  <span className="line-clamp-2 text-sm text-ink">{q.question}</span>
                  {name && <span className="mt-0.5 block text-xs text-ink-faint capitalize">{name}</span>}
                </span>
                {q.status ? (
                  <StatusBadge status={q.status} label={q.status_label} />
                ) : (
                  <span className="text-xs text-ink-faint">Not marked</span>
                )}
                <span className="flex items-center gap-1">
                  {q.turn_id && q.feedback.length > 0 && (
                    <Link
                      to={`/turns/${q.turn_id}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
                    >
                      How it was marked
                    </Link>
                  )}
                  {q.concept_id && (
                    <Link
                      to={`/mock?focus=${encodeURIComponent(q.concept_id)}&label=${encodeURIComponent(name ?? "")}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-brand-soft"
                    >
                      Practise again
                    </Link>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function Answers() {
  const history = useHistory(30);
  const finished = (history.data ?? []).filter((s) => s.status === "ended" && s.kind !== "drill").slice(0, 8);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="My answers"
        subtitle="Every question you've answered, how it went, and how it was marked."
        how={
          <p>
            Each answer's status is the interview's judgement of the whole conversation on that
            question — correct, partly correct, too vague, incorrect or not answered — the same one
            your notes show. Numerical scores stay hidden until they agree with human markers.
          </p>
        }
      />
      <div className="mt-8 space-y-5">
        {history.isLoading ? (
          <SkeletonRows label="Loading your answers" rows={5} />
        ) : finished.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-sm text-ink-soft">Your marked answers will be listed here after your first interview.</p>
            <Link to="/mock" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
              <Icon name="mic" size={15} /> Start an interview
            </Link>
          </div>
        ) : (
          finished.map((s) => <SessionAnswers key={s.id} s={s} />)
        )}
      </div>
    </div>
  );
}
