/**
 * The proxy table, walked the way Vite walks it: every `/v1` noun in OWNER
 * (vite.config.ts) must reach its own module, whatever else is in the table.
 *
 * Until 2026-11-22 the keys were prefixes, so `/v1/coding` (M07) answered
 * `/v1/coding-profiles` (M03) and no student could link a coding profile.
 * Read from vite.config.ts itself, as M02's suite does: a copy is one change
 * behind the day it is taken.
 *
 *   npm test
 */
import { readFileSync } from "node:fs";

import { firstMatch, proxyRoute } from "../src/lib/proxyRoute.ts";

const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : " want " + JSON.stringify(want)}`);
  if (!ok) process.exitCode = 1;
};

const text = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const start = text.indexOf("const OWNER");
const table = text.slice(start, text.indexOf("};", start));
const owner = Object.fromEntries(
  [...table.matchAll(/^\s*"?([a-z-]+)"?:\s*"(m\d\d)"/gm)].map((m) => [m[1], m[2]] as const),
);
const nouns = Object.keys(owner);
const keys = nouns.map(proxyRoute);
const moduleOf = (key: string | undefined) => (key ? owner[nouns[keys.indexOf(key)]!] : "nobody");

check("the table was read", nouns.length > 30, true);
check("coding-profiles is M03's", owner["coding-profiles"], "m03");

const wrong: string[] = [];
for (const noun of nouns) {
  for (const path of [`/v1/${noun}`, `/v1/${noun}/x/y`, `/v1/${noun}?a=1`]) {
    const got = moduleOf(firstMatch(keys, path));
    if (got !== owner[noun]) wrong.push(`${path} -> ${got} (owner ${owner[noun]})`);
  }
}
check("every noun reaches its own module", wrong, []);

// The case that broke, and its mirror: a noun that is a prefix of another.
check("/v1/coding-profiles goes to M03", moduleOf(firstMatch(keys, "/v1/coding-profiles/refresh")), "m03");
check("/v1/coding/problems goes to M07", moduleOf(firstMatch(keys, "/v1/coding/problems")), "m07");
check("an unknown noun is nobody's", firstMatch(keys, "/v1/codingx"), undefined);
// Order no longer matters: M07's key first, as the old table had it, still routes M03's noun to M03.
const m07First = [proxyRoute("coding"), proxyRoute("coding-profiles")];
check("order-proof", firstMatch(m07First, "/v1/coding-profiles"), proxyRoute("coding-profiles"));
