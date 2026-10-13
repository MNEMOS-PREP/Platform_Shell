/**
 * The semester and course logic (src/lib/courses.ts), pinned. Each answer is a
 * promise to a student — "ticking Operating Systems gives you an Operating
 * Systems interview" — that nothing else on the page checks.
 *
 *   npm test
 */
import {
  chosenElectives,
  coversLine,
  defaultCourses,
  electiveSlots,
  practisable,
  practiseCourseLink,
  programmeLabel,
  semesterOf,
  yearForSemester,
} from "../src/lib/courses.ts";

const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : " want " + JSON.stringify(want)}`);
  if (!ok) process.exitCode = 1;
};

const concept = (id: string, name: string) => ({ id: `concept:${id}`, name, hits: 1, matched: [id] });
const course = (code: string, title: string, concepts: ReturnType<typeof concept>[] = []) => ({
  code,
  title,
  category: "ENGG",
  ltp: "2-0-3",
  credits: "3",
  concepts,
});
const os = course("22AIE202", "Operating Systems", [
  concept("deadlocks", "Deadlocks"),
  concept("virtual_memory", "Virtual Memory"),
  concept("paging_and_segmentation", "Paging and Segmentation"),
  concept("page_replacement", "Page Replacement"),
  ...Array.from({ length: 6 }, (_, i) => concept(`c${i}`, `C${i}`)),
]);
const soft = course("19SSK211", "Soft Skills I");
const dl = course("22AIE304", "Deep Learning", [concept("convolutional_networks", "Convolutional Neural Networks")]);
const crypto = course("22AIE431", "Applied Cryptography", [concept("https_and_tls", "HTTPS and TLS")]);
const curriculum = {
  id: "x",
  name: "B.Tech X",
  short: "AIE",
  institution: "A",
  curriculum_year: 2022,
  source: { file: "x.pdf", sha256: "0", pages: 1 },
  ontology_version: "1.0",
  semesters: [
    { number: 3, courses: [os, soft], slots: [{ kind: "free" as const, title: "Free Elective 1", credits: "2" }] },
    { number: 5, courses: [dl], slots: [{ kind: "professional" as const, title: "Professional Elective 1", credits: "3" }] },
  ],
  electives: [{ name: "Professional electives", kind: "professional" as const, courses: [crypto] }],
};

check("semesters 1-2 are first year, 7-8 final", [1, 2, 3, 5, 6, 7, 8].map(yearForSemester), [
  "1st year",
  "1st year",
  "2nd year",
  "3rd year",
  "3rd year",
  "Final year",
  "Final year",
]);
check("no semester, no year", yearForSemester(null), "");
check("a semester starts with every course it lists ticked", defaultCourses(semesterOf(curriculum, 3)), [
  "22AIE202",
  "19SSK211",
]);
check("free slots are not elective pickers", electiveSlots(semesterOf(curriculum, 3)), []);
check("professional slots are", electiveSlots(semesterOf(curriculum, 5)), ["Professional Elective 1"]);
check(
  "an elective is a selected code the semester does not list",
  chosenElectives(semesterOf(curriculum, 5), ["22AIE304", "22AIE431"]),
  ["22AIE431"],
);
check(
  "only courses that teach something are offered to practise, electives included",
  practisable(curriculum, ["19SSK211", "22AIE202", "22AIE431", "nope"]).map((c) => c.code),
  ["22AIE202", "22AIE431"],
);
const link = new URL(practiseCourseLink(os), "http://x");
check("a course's practice is its concepts, capped at eight", link.searchParams.get("focus")?.split(",").length, 8);
check("named for the course", link.searchParams.get("label"), "Operating Systems");
check("the first concept is the most taught", link.searchParams.get("focus")?.split(",")[0], "concept:deadlocks");
check(
  "a programme is named the way students name it",
  [
    programmeLabel({ name: "B.Tech Computer Science and Engineering", curriculum_year: 2023 }),
    programmeLabel({
      name: "B.Tech Computer Science and Engineering (Artificial Intelligence)",
      curriculum_year: 2022,
    }),
    programmeLabel({ name: "Integrated MSc Physics", curriculum_year: null }),
  ],
  [
    "B.Tech CSE · 2023 curriculum",
    "B.Tech CSE (Artificial Intelligence) · 2022 curriculum",
    "Integrated MSc Physics",
  ],
);
check("covers line", coversLine(os), "Deadlocks, Virtual Memory, Paging and Segmentation and 7 more");
check("covers line, short", coversLine(dl), "Convolutional Neural Networks");
