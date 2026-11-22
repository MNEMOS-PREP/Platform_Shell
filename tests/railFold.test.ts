/**
 * The rail's fold (src/lib/railFold.ts): what a new student sees of each
 * labelled group, and that nothing they have used or are on is ever hidden.
 *
 *   npm test
 */
import { ALWAYS_SHOWN, shownWhileFolded } from "../src/lib/railFold.ts";

const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : " want " + JSON.stringify(want)}`);
  if (!ok) process.exitCode = 1;
};

const group = ["/counsel", "/answers", "/mock/library", "/skills", "/roadmap", "/history"].map((to) => ({ to }));
const tos = (r: { shown: { to: string }[] }) => r.shown.map((i) => i.to);

const fresh = shownWhileFolded(group, new Set(), undefined);
check("a new student sees the first two", tos(fresh), group.slice(0, ALWAYS_SHOWN).map((i) => i.to));
check("and how many wait", fresh.folded, group.length - ALWAYS_SHOWN);

const used = shownWhileFolded(group, new Set(["/skills"]), undefined);
check("a page they opened stays, in its place", tos(used), ["/counsel", "/answers", "/skills"]);

const here = shownWhileFolded(group, new Set(), "/history");
check("the page they are on is never folded", tos(here), ["/counsel", "/answers", "/history"]);

const all = shownWhileFolded(group, new Set(group.map((i) => i.to)), undefined);
check("used everything: nothing folds", all.folded, 0);

const short = shownWhileFolded(group.slice(0, 3), new Set(), undefined);
check("a short group is never folded", short.folded, 0);
