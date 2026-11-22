/**
 * The shell's proxy key for one `/v1` noun (vite.config.ts, OWNER).
 *
 * Vite treats a plain key as a PREFIX and takes the first key that matches, so
 * `/v1/coding` (M07's) also matched `/v1/coding-profiles` (M03's) — until
 * 2026-11-22 no student could link a Codeforces or LeetCode profile through the
 * shell. A key that starts with `^` is a regular expression instead: this one
 * matches the noun only when the path ends there or carries on with `/` or `?`,
 * so no noun can swallow another, whatever order the table is in.
 */
export function proxyRoute(noun: string): string {
  return `^/v1/${noun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[/?]|$)`;
}

/** Which key Vite would pick for `path`: the first one that matches, as Vite does. */
export function firstMatch(keys: readonly string[], path: string): string | undefined {
  return keys.find((key) => (key.startsWith("^") ? new RegExp(key).test(path) : path.startsWith(key)));
}
