/**
 * The page a visitor meets before signing in: the product first, the form
 * beside it. The conversation card on the right answers back — pick a question
 * and the panel's next move, and the note it leaves you, change with it — so
 * the page shows what a session feels like instead of describing it.
 *
 * The form is SignIn's own (`signInBlock`), unchanged: this file only gives it
 * a place to live.
 */
import { useState, type ReactNode } from "react";

const SAMPLES = [
  {
    ask: "Tell us about a project you built.",
    answer: ["I added Redis caching to our placement portal. API response time fell from ", "800 ms to 200 ms."],
    handover: "Meera hands over to Vikram to dig deeper",
    who: { initials: "VK", name: "Vikram", role: "Staff engineer, follows your answer", tone: "#f0ecdd" },
    followup: "You mentioned 800 ms to 200 ms. How did you measure that, and what happened when cached data went stale?",
    good: "A clear result. Missing: how you measured it, and the freshness trade-off.",
    next: "explain p95 latency, load testing and cache invalidation. Keep what you measured apart from what you assumed.",
    queue: "Added to your practice queue: defend a project metric",
  },
  {
    ask: "When would you use a hash map?",
    answer: ["I'd reach for one when I need ", "constant-time lookups", " by key, like counting word frequencies."],
    handover: "Meera hands over to Ananya to explore your approach",
    who: { initials: "AN", name: "Ananya", role: "Software engineer, explores your approach", tone: "#eae5f6" },
    followup: "Lookups are constant on average. What happens when many keys collide, and how would you size the table?",
    good: "The right use case. Missing: worst-case behaviour and resizing.",
    next: "explain collisions, load factor, and when a sorted structure is the better choice.",
    queue: "Added to your practice queue: explain complexity trade-offs",
  },
  {
    ask: "Tell us about a team disagreement.",
    answer: ["Two of us disagreed on the API design, so I proposed we ", "prototype both", " and compare them on Friday."],
    handover: "Meera hands over to Arjun to test the trade-offs",
    who: { initials: "AR", name: "Arjun", role: "Bar raiser, tests the trade-offs", tone: "#f0ecdd" },
    followup: "Prototyping is a fair call. What if your teammate still disagreed after seeing the results?",
    good: "You took the initiative. Missing: what you did when it still didn't resolve.",
    next: "describe the outcome, what you'd change, and how you kept the working relationship.",
    queue: "Added to your practice queue: close a disagreement",
  },
];

function ConversationCard() {
  const [i, setI] = useState(0);
  const s = SAMPLES[i]!;
  return (
    <section
      aria-label="A sample interview"
      className="rounded-[20px] bg-[#142d27] p-6 text-white shadow-[0_16px_48px_rgba(22,59,39,0.12)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <span aria-hidden className="size-1.5 rounded-full bg-[#c9f4c8] motion-safe:animate-pulse" />A panel that listens
        </p>
        <span className="rounded-full border border-[#3c574b] bg-[#203e35] px-2.5 py-1 text-[0.6875rem] font-medium text-[#c9f4c8]">
          Try it
        </span>
      </div>

      <div role="radiogroup" aria-label="Pick a question" className="mt-5 flex flex-col gap-2">
        {SAMPLES.map((q, k) => {
          const on = k === i;
          return (
            <button
              key={q.ask}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setI(k)}
              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs leading-snug ${
                on
                  ? "border-[#c9f4c8] bg-[#c9f4c8] font-semibold text-[#192d28]"
                  : "border-[#3c574b] bg-[#203e35] font-normal text-[#adc4b8] hover:border-[#adc4b8]"
              }`}
            >
              <span
                aria-hidden
                className={`grid size-3.5 shrink-0 place-items-center rounded-full border ${on ? "border-[#176b55] bg-[#176b55]" : "border-[#adc4b8]"}`}
              >
                {on && <span className="size-1 rounded-full bg-[#c9f4c8]" />}
              </span>
              {q.ask}
            </button>
          );
        })}
      </div>

      {/* Keyed on the question so the reply arrives when it changes. */}
      <div key={i} className="landing-swap mt-5 flex flex-col gap-4">
        <div className="rounded-xl bg-[#203e35] px-3.5 py-3">
          <p className="text-[0.6875rem] font-semibold text-[#adc4b8]">You</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed">
            “{s.answer[0]}
            <span className="font-semibold text-[#c9f4c8]">{s.answer[1]}</span>
            {s.answer[2]}”
          </p>
        </div>

        <div>
          <p className="text-[0.6875rem] text-[#c9f4c8]">{s.handover}</p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-full text-[0.6875rem] font-semibold text-[#192d28]"
              style={{ background: s.who.tone }}
            >
              {s.who.initials}
            </span>
            <div>
              <p className="text-xs font-semibold">{s.who.name}</p>
              <p className="text-[0.6875rem] text-[#adc4b8]">{s.who.role}</p>
            </div>
          </div>
          <p className="mt-3 text-[1.1875rem] leading-snug">“{s.followup}”</p>
        </div>

        <div className="rounded-xl bg-[#f7f8f4] p-4 text-[#192d28]">
          <p className="text-xs font-semibold text-[#176b55]">Your note afterwards</p>
          <p className="mt-2 text-xs leading-relaxed">{s.good}</p>
          <p className="mt-2 text-xs leading-relaxed text-[#68766e]">
            <span className="text-[#192d28]">Try next:</span> {s.next}
          </p>
          <p className="mt-3 text-[0.6875rem] font-semibold text-[#176b55]">{s.queue}</p>
        </div>
      </div>
      <p className="mt-4 text-[0.6875rem] leading-snug text-[#adc4b8]">
        An example. In your session, the next question comes from your answer.
      </p>
    </section>
  );
}

const STAGES = [
  { title: "A plan before the first question", body: "Your topic, your time and an optional job description or resume set how the minutes are split." },
  { title: "Your answer sets the route", body: "The panel picks up your exact words, probes the gaps and hands over to the right interviewer." },
  { title: "Notes on every answer", body: "Every question in an interview, and every contribution in a discussion, comes back with what held and what didn't." },
  { title: "A next step, not just a score", body: "Weak spots become short drills. Work on one small thing, then try the room again." },
];

export function Landing({ signInBlock }: { signInBlock: ReactNode }) {
  const toForm = () => {
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("signin-email")?.focus({ preventScroll: true }), 350);
  };

  return (
    <div className="min-h-dvh bg-[#f7f8f4] text-[#192d28]">
      <header className="sticky top-0 z-20 border-b border-[#dde5dc] bg-[#f7f8f4]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-5 md:px-10 lg:h-[72px]">
          <a href="#top" className="flex items-center gap-2.5" aria-label="AI Interviewer">
            <img src="/logo.png" alt="" className="h-9 w-auto" />
            <span className="hidden text-[0.9375rem] font-semibold tracking-tight sm:inline">AI Interviewer</span>
          </a>
          <nav aria-label="Sections" className="hidden gap-8 text-[0.8125rem] text-[#68766e] md:flex">
            <a href="#formats" className="hover:text-[#192d28]">Interview or discussion</a>
            <a href="#how" className="hover:text-[#192d28]">How a session runs</a>
          </nav>
          <button
            type="button"
            onClick={toForm}
            className="h-10 rounded-lg bg-[#176b55] px-4 text-[0.8125rem] font-semibold text-white hover:bg-[#115240]"
          >
            Sign in
          </button>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-[1280px] gap-12 px-5 pb-16 pt-10 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-16 lg:pb-24 lg:pt-14">
          <div className="landing-in min-w-0">
            <h1 className="text-[2.75rem] font-medium leading-[1.06] tracking-[-0.055em] sm:text-[3.5rem] lg:text-[3.875rem]">
              Your next interview.
              <span className="block font-[Lora,Georgia,serif] font-normal italic tracking-[-0.045em] text-[#176b55]">
                Not your first time.
              </span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-[1.65] text-[#68766e]">
              Practise with AI interviewers and discussion partners who listen to what you say, ask a better
              follow-up, and leave you a clear next step.
            </p>

            <div id="start" className="mt-9 max-w-md scroll-mt-28">
              {signInBlock}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex" aria-hidden>
                {[
                  ["MR", "#c9f4c8"],
                  ["AN", "#eae5f6"],
                  ["VK", "#f0ecdd"],
                ].map(([t, c]) => (
                  <span
                    key={t}
                    className="-mr-1.5 grid size-9 place-items-center rounded-full border-[3px] border-[#f7f8f4] text-[0.6875rem] font-semibold"
                    style={{ background: c }}
                  >
                    {t}
                  </span>
                ))}
                <span className="grid size-9 place-items-center rounded-full border-[3px] border-[#f7f8f4] bg-white text-[0.625rem] font-semibold text-[#176b55]">
                  +36
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#68766e]">
                <span className="text-[#192d28]">39 AI interviewers, each with a different view.</span>
                <br />A small panel for every session, never all 39.
              </p>
            </div>
          </div>

          <div className="landing-in min-w-0 lg:pt-2" style={{ animationDelay: "120ms" }}>
            <ConversationCard />
          </div>
        </section>

        <section id="formats" className="bg-white">
          <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-20">
            <h2 className="max-w-[40rem] text-[2rem] font-medium leading-[1.15] tracking-[-0.04em] lg:text-[2.625rem]">
              Find your voice, in more than one kind of room.
            </h2>
            <p className="mt-4 max-w-[36rem] text-[0.9375rem] leading-[1.65] text-[#68766e]">
              Think out loud, work through the awkward pause, and practise the conversations campus placements
              actually ask of you.
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <article className="rounded-[20px] border border-[#dde5dc] bg-[#f7f8f4] p-8">
                <h3 className="text-[1.625rem] tracking-[-0.03em]">A panel, not a question bank.</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.65] text-[#68766e]">
                  A live interview with a small panel drawn from 39 AI interviewers. Recruiters, engineers and
                  professors bring different lenses to the same answer.
                </p>
                <ul className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-4 text-xs">
                  {[
                    ["MR", "#c9f4c8", "Meera", "Campus recruiter, opens the conversation"],
                    ["AN", "#eae5f6", "Ananya", "Software engineer, explores your approach"],
                    ["AR", "#f0ecdd", "Arjun", "Bar raiser, tests the trade-offs"],
                  ].map(([t, c, n, r]) => (
                    <li key={n} className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full text-[0.6875rem]" style={{ background: c }}>
                        {t}
                      </span>
                      <span>
                        <span className="block font-semibold">{n}</span>
                        <span className="text-[#68766e]">{r}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-[20px] bg-[#e8f3ec] p-8">
                <h3 className="text-[1.625rem] tracking-[-0.03em]">Make a point. Make space, too.</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.65] text-[#68766e]">
                  Join three to five AI participants with distinct personalities. Learn when to enter, how to build
                  on a point, and when to bring the room back.
                </p>
                <div className="mt-6 rounded-xl bg-white p-4">
                  <p className="text-[0.8125rem] font-semibold leading-snug">Should AI tools be allowed in campus assessments?</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["Kavya, assertive", "Neel, quiet", "Rohan, off-topic", "Sana, supportive"].map((p) => (
                      <span key={p} className="rounded-full border border-[#dde5dc] px-2.5 py-1 text-[0.6875rem] font-medium text-[#176b55]">
                        {p}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#68766e]">
                    Sana: “Building on your point about fairness, could we separate learning from evaluation?”
                  </p>
                </div>
                <p className="mt-5 text-xs leading-relaxed text-[#176b55]">
                  We look beyond speaking time: starting, structuring, listening, building on others and closing.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="bg-[#142d27] text-white">
          <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-20">
            <h2 className="max-w-[36rem] text-[2rem] font-medium leading-[1.15] tracking-[-0.04em] lg:text-[2.75rem]">
              It doesn’t just ask. It pays attention.
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {STAGES.map((s, k) => (
                <li key={s.title} className="border-t border-[#3c574b] pt-4">
                  <span className="text-xs text-[#adc4b8]" data-numeric>
                    {k + 1}
                  </span>
                  <h3 className="mt-3 text-[1.0625rem] leading-snug">{s.title}</h3>
                  <p className="mt-2.5 text-[0.8125rem] leading-[1.65] text-[#adc4b8]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-20">
          <div className="flex flex-col gap-8 rounded-[20px] bg-[#c9f4c8] p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <p className="font-[Lora,Georgia,serif] text-[2rem] leading-[1.15] tracking-[-0.03em] lg:text-[2.625rem]">
                Get the first awkward answer out of the way.
              </p>
              <p className="mt-3 text-[0.8125rem] text-[#176b55]">Your next round can start with a little less unknown.</p>
            </div>
            <button
              type="button"
              onClick={toForm}
              className="h-12 shrink-0 rounded-lg bg-[#176b55] px-6 text-sm font-semibold text-white hover:bg-[#115240]"
            >
              Start practising
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dde5dc]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-8 text-xs text-[#68766e] md:px-10">
          <img src="/logo.png" alt="" className="h-7 w-auto" />
          <p>A little more prepared, one conversation at a time.</p>
        </div>
      </footer>
    </div>
  );
}
