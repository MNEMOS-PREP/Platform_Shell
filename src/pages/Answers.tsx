/**
 * My answers — what "Evaluation" means to a student.
 *
 * The menu item a student saw as "Evaluation" opened M13's bench: a fixture
 * dropdown, an ensemble picker and regression cases. That is a staff tool and
 * now sits in the Staff menu. A student's evaluation is their own marked
 * answers, so this page lists them — newest interview first, each question
 * with its band (Strong / Partly there / Not yet, from the key points it
 * reached), a link to how it was marked (M13's evidence page) and a way to
 * practise that topic again. Read from M06's notes, which already carry all
 * three; nothing is re-scored here.
 */
import { Link } from "react-router-dom";

import {
  ANSWER_BAND_LABEL,
  Icon,
  PageHeader,
  SkeletonRows,
  relativeDays,
  type AnswerBand,
} from "@ai/core";
import { bandOf, topicName, useHistory, useReport, type SessionSummary } from "@ai/m06";

/** Colour as a dot and a tint, the word in ink (contrast in both themes). */
const BAND_STYLE: Record<AnswerBand, string> = {
  strong: "border-mastery-strong/50 bg-mastery-strong/12",
  partly: "border-mastery-ok/50 bg-mastery-ok/12",
  not_yet: "border-mastery-weak/50 bg-mastery-weak/12",
};
const BAND_DOT: Record<AnswerBand, string> = {
  strong: "bg-mastery-strong",
  partly: "bg-mastery-ok",
  not_yet: "bg-mastery-weak",
};

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
            const band = bandOf(q);
            const name = topicName(q);
            return (
              <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="min-w-0 flex-1 basis-72">
                  <span className="line-clamp-2 text-sm text-ink">{q.question}</span>
                  {name && <span className="mt-0.5 block text-xs text-ink-faint capitalize">{name}</span>}
                </span>
                {band ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold text-ink ${BAND_STYLE[band]}`}
                  >
                    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${BAND_DOT[band]}`} />
                    {ANSWER_BAND_LABEL[band]}
                  </span>
                ) : (
                  <span className="text-xs text-ink-faint">
                    {q.scored ? "Being marked" : "Not marked"}
                  </span>
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
            The band is the share of a strong answer's key points your answer reached: Strong is
            three quarters or more, Partly there is at least two in five. Numerical scores stay
            hidden until they agree with human markers.
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
