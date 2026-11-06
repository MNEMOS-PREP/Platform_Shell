/**
 * The page a visitor meets before signing in: the product first, the form
 * beside it. The conversation card on the right answers back — pick a question
 * and the panel's next move, and the note it leaves you, change with it — so
 * the page shows what a session feels like instead of describing it.
 *
 * The form is SignIn's own (`signInBlock`), unchanged: this file only gives it
 * a place to live.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True once the element has scrolled into view (and stays true). Reduced motion: true at once. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(prefersReducedMotion);
  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

/** Characters typed so far; restarts whenever `text` changes. Idle until `run`. */
function useTyped(text: string, run: boolean, ms = 22) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!run) return;
    const id = window.setInterval(() => {
      setN((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [text, run, ms]);
  return n;
}

const CARD_LIFT =
  "rounded-[20px] p-8 transition duration-300 motion-safe:hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(22,59,39,0.10)]";

/** A number that counts up once, the first time it scrolls into view. */
function CountUp({ to }: { to: number }) {
  const reduced = prefersReducedMotion();
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!seen || reduced) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduced, to]);
  return (
    <span ref={ref} className="inline-block min-w-[2ch] tabular-nums" aria-label={String(to)}>
      {n}
    </span>
  );
}

const PANEL = [
  { t: "MR", c: "#c9f4c8", n: "Meera", r: "Campus recruiter, opens the conversation" },
  { t: "AN", c: "#eae5f6", n: "Ananya", r: "Software engineer, explores your approach" },
  { t: "AR", c: "#f0ecdd", n: "Arjun", r: "Bar raiser, tests the trade-offs" },
];

/** The panel arrives one member at a time, then the turn passes down the list. */
function PanelList() {
  const reduced = prefersReducedMotion();
  const [ref, seen] = useInView<HTMLUListElement>();
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (!seen || reduced) return;
    let k = 0;
    const start = window.setTimeout(() => setActive(0), 900);
    const id = window.setInterval(() => {
      k = (k + 1) % PANEL.length;
      setActive(k);
    }, 2400);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [seen, reduced]);

  return (
    <ul ref={ref} className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-4 text-xs">
      {PANEL.map((m, k) => (
        <li
          key={m.n}
          className={`flex items-center gap-3 transition duration-500 ${
            seen ? "opacity-100" : "motion-safe:translate-y-3 motion-safe:opacity-0"
          }`}
          style={{ transitionDelay: seen ? `${k * 180}ms` : "0ms" }}
        >
          <span
            className={`relative grid size-8 place-items-center rounded-full text-[0.6875rem] transition-shadow duration-300 ${
              active === k ? "shadow-[0_0_0_2px_#fff,0_0_0_4px_#176b55]" : ""
            }`}
            style={{ background: m.c }}
          >
            {m.t}
            {active === k && (
              <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[#176b55] motion-safe:animate-pulse" />
            )}
          </span>
          <span>
            <span className="flex items-center gap-2 font-semibold">
              {m.n}
              {active === k && <span className="text-[0.625rem] font-medium text-[#176b55]">speaking</span>}
            </span>
            <span className="text-[#68766e]">{m.r}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const PEOPLE = ["Kavya, assertive", "Neel, quiet", "Rohan, off-topic", "Sana, supportive"];
const TURNS = [
  { p: 0, line: "Students already use AI every day. Banning it only tests who hides it best." },
  { p: 1, line: "Maybe it depends on what the assessment is meant to measure." },
  { p: 2, line: "Random thought: has anyone tried the new canteen menu?" },
  { p: 0, line: "Let's bring it back. Should AI tools be allowed in assessments at all?" },
  { p: 3, line: "Building on your point about fairness, could we separate learning from evaluation?" },
];

/** The group discussion plays: each participant lights up and types their line. */
function GroupDiscussionCard() {
  const reduced = prefersReducedMotion();
  const [ref, seen] = useInView<HTMLDivElement>();
  const [turn, setTurn] = useState(reduced ? TURNS.length - 1 : 0);
  const t = TURNS[turn]!;
  const typed = useTyped(t.line, seen && !reduced);
  const n = reduced ? t.line.length : typed;

  useEffect(() => {
    if (reduced || !seen || n < t.line.length) return;
    const id = window.setTimeout(() => setTurn((c) => (c + 1) % TURNS.length), 1800);
    return () => window.clearTimeout(id);
  }, [reduced, seen, n, t.line.length]);

  return (
    <div ref={ref} className="mt-6 rounded-xl bg-white p-4">
      <p className="text-[0.8125rem] font-semibold leading-snug">Should AI tools be allowed in campus assessments?</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PEOPLE.map((p, k) => (
          <span
            key={p}
            className={`rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors duration-300 ${
              t.p === k && seen
                ? "border-[#176b55] bg-[#176b55] text-white"
                : "border-[#dde5dc] text-[#176b55] hover:bg-[#e8f3ec]"
            }`}
          >
            {p}
          </span>
        ))}
      </div>
      <p className="mt-3 min-h-[3.25rem] text-xs leading-relaxed text-[#68766e]" aria-live="off">
        <span className="text-[#192d28]">{PEOPLE[t.p]!.split(",")[0]}: </span>“{t.line.slice(0, n)}
        {seen && n < t.line.length && (
          <span aria-hidden className="ml-px inline-block h-[1em] w-px translate-y-[2px] bg-[#176b55] motion-safe:animate-pulse" />
        )}
        <span className="opacity-0">{t.line.slice(n)}</span>”
      </p>
    </div>
  );
}

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

/**
 * The "You" answer, typed out as if live. The untyped rest stays in the layout
 * but invisible, so the card never changes height while it types. Reduced
 * motion shows the whole answer at once.
 */
function TypedAnswer({ parts }: { parts: readonly string[] }) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(reduced ? total : 0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setN((c) => {
        if (c >= total) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [total, reduced]);

  let start = 0;
  const nodes = parts.map((p, k) => {
    const shown = p.slice(0, Math.max(0, Math.min(n - start, p.length)));
    const hidden = p.slice(shown.length);
    const typing = n < total && n >= start && n < start + p.length;
    start += p.length;
    return (
      <span key={k} className={k === 1 ? "font-semibold text-[#c9f4c8]" : undefined}>
        {shown}
        {typing && (
          <span aria-hidden className="ml-px inline-block h-[1em] w-px translate-y-[2px] bg-[#c9f4c8] motion-safe:animate-pulse" />
        )}
        <span className="opacity-0">{hidden}</span>
      </span>
    );
  });

  return (
    <p className="mt-1.5 text-[0.8125rem] leading-relaxed" aria-label={`“${parts.join("")}”`}>
      <span aria-hidden>“{nodes}”</span>
    </p>
  );
}

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
          <TypedAnswer key={i} parts={s.answer} />
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

/** Fades and rises into place the first time it scrolls into view. */
function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "span";
}) {
  const [ref, seen] = useInView<HTMLDivElement & HTMLSpanElement>();
  return (
    <Tag
      ref={ref}
      className={`block transition duration-700 ease-out ${
        seen ? "translate-y-0 opacity-100" : "motion-safe:translate-y-4 motion-safe:opacity-0"
      }`}
      style={{ transitionDelay: seen ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}

/** "How a session runs": the lines draw across in order, then the steps take turns. */
function HowSection() {
  const reduced = prefersReducedMotion();
  const [ref, seen] = useInView<HTMLOListElement>();
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (!seen || reduced) return;
    let id = 0;
    const start = window.setTimeout(() => {
      let k = 0;
      setActive(0);
      id = window.setInterval(() => {
        k = (k + 1) % STAGES.length;
        setActive(k);
      }, 2600);
    }, STAGES.length * 450 + 800);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [seen, reduced]);

  return (
    <section id="how" className="relative overflow-hidden bg-[#142d27] text-white">
      <div aria-hidden className="landing-grid-dark pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-20">
        <h2 className="max-w-[36rem] text-[2rem] font-medium leading-[1.15] tracking-[-0.04em] lg:text-[2.75rem]">
          <Reveal as="span">It doesn’t just ask.</Reveal>
          <Reveal as="span" delay={160}>
            <span className="font-[Lora,Georgia,serif] font-normal italic tracking-[-0.045em] text-[#c9f4c8]">
              It pays attention.
            </span>
          </Reveal>
        </h2>
        <ol ref={ref} className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STAGES.map((s, k) => {
            const on = active === k;
            const delay = `${k * 450}ms`;
            return (
              <li key={s.title} className="relative pt-4">
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#2c473d]" />
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-px bg-[#6fae94] transition-[width] duration-[900ms] ease-out"
                  style={{ width: seen ? "100%" : "0%", transitionDelay: delay }}
                />
                <span
                  aria-hidden
                  className={`absolute left-0 top-0 h-px w-full bg-[#c9f4c8] transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`}
                />
                <span
                  aria-hidden
                  className={`absolute -top-[2.5px] left-0 size-[6px] rounded-full bg-[#c9f4c8] transition duration-500 ${
                    seen ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  } ${on ? "shadow-[0_0_0_4px_rgb(201_244_200/0.15)]" : ""}`}
                  style={{ transitionDelay: seen ? delay : "0ms" }}
                />
                <div
                  className={`transition duration-700 ease-out ${
                    seen ? "translate-y-0 opacity-100" : "motion-safe:translate-y-3 motion-safe:opacity-0"
                  }`}
                  style={{ transitionDelay: seen ? `${k * 450 + 250}ms` : "0ms" }}
                >
                  <span className={`text-xs transition-colors duration-500 ${on ? "text-[#c9f4c8]" : "text-[#adc4b8]"}`} data-numeric>
                    {k + 1}
                  </span>
                  <h3 className={`mt-3 text-[1.0625rem] leading-snug transition-colors duration-500 ${on ? "text-[#c9f4c8]" : "text-white"}`}>
                    {s.title}
                  </h3>
                  <p className={`mt-2.5 text-[0.8125rem] leading-[1.65] transition-colors duration-500 ${on ? "text-[#dcebe3]" : "text-[#adc4b8]"}`}>
                    {s.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

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

      <main id="top" className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] overflow-hidden">
          <div className="landing-grid absolute inset-0" />
          <span className="landing-cell" style={{ left: 176, top: 88 }} />
          <span className="landing-cell" style={{ left: 44, top: 220, opacity: 0.7 }} />
          <span className="landing-cell" style={{ left: 264, top: 308 }} />
          <span className="landing-cell" style={{ left: 396, top: 44, opacity: 0.6 }} />
        </div>
        <section className="relative mx-auto grid max-w-[1280px] gap-12 px-5 pb-16 pt-10 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-16 lg:pb-24 lg:pt-14">
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
              <article className={`${CARD_LIFT} border border-[#dde5dc] bg-[#f7f8f4]`}>
                <h3 className="text-[1.625rem] tracking-[-0.03em]">A panel, not a question bank.</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.65] text-[#68766e]">
                  A live interview with a small panel drawn from <CountUp to={39} /> AI interviewers. Recruiters,
                  engineers and professors bring different lenses to the same answer.
                </p>
                <PanelList />
              </article>
              <article className={`${CARD_LIFT} bg-[#e8f3ec]`}>
                <h3 className="text-[1.625rem] tracking-[-0.03em]">Make a point. Make space, too.</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.65] text-[#68766e]">
                  Join three to five AI participants with distinct personalities. Learn when to enter, how to build
                  on a point, and when to bring the room back.
                </p>
                <GroupDiscussionCard />
                <p className="mt-5 text-xs leading-relaxed text-[#176b55]">
                  We look beyond speaking time: starting, structuring, listening, building on others and closing.
                </p>
              </article>
            </div>
          </div>
        </section>

        <HowSection />

        <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 lg:py-20">
          <Reveal>
            <div className="flex flex-col gap-8 rounded-[20px] bg-[#c9f4c8] p-8 md:flex-row md:items-center md:justify-between md:p-12">
              <div>
                <p className="font-[Lora,Georgia,serif] text-[2rem] leading-[1.15] tracking-[-0.03em] lg:text-[2.625rem]">
                  Get the first awkward answer out of the way.
                </p>
                <Reveal as="span" delay={350}>
                  <span className="mt-3 block text-[0.8125rem] text-[#176b55]">
                    Your next round can start with a little less unknown.
                  </span>
                </Reveal>
              </div>
              <button
                type="button"
                onClick={toForm}
                className="group relative h-12 shrink-0 overflow-hidden rounded-lg bg-[#176b55] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#115240]"
              >
                <span className="relative inline-flex items-center gap-2">
                  Start practising
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
                <span aria-hidden className="landing-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-white/20" />
              </button>
            </div>
          </Reveal>
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
