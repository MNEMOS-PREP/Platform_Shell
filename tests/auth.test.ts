/**
 * The door (server/auth.ts, good_and_bads #14, 2026-11-22): codes, the signed
 * session, and the one rule everything rests on — the identity a module sees
 * comes from the cookie, never from what the browser sent.
 *
 *   npm test
 */
import { createHash } from "node:crypto";

import {
  CODE_TRIES,
  CodeBook,
  RESEND_AFTER_MS,
  authMode,
  identityFor,
  identityOf,
  sign,
  staffList,
  subjectForEmail,
  verify,
} from "../server/auth.ts";

const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : " want " + JSON.stringify(want)}`);
  if (!ok) process.exitCode = 1;
};

const SECRET = "test-secret";
const now = Date.UTC(2026, 10, 22, 10);

check("off unless asked for", authMode({}), "demo");
check("on", authMode({ AUTH_MODE: "email" }), "email");

// The same id the browser derives, so a proven email lands on the same record.
const bytes = createHash("sha256").update("ai-interviewer:student:riya@am.students.amrita.edu").digest();
check("the id is the browser's derivation", subjectForEmail(" Riya@AM.students.amrita.edu ").slice(0, 8), bytes.subarray(0, 4).toString("hex"));

// Codes.
const book = new CodeBook(SECRET);
const issued = book.issue("riya@x.edu", now);
check("a six-digit code", "code" in issued && /^\d{6}$/.test(issued.code), true);
check("not again at once", "code" in book.issue("riya@x.edu", now + 1000), false);
check("again after the wait", "code" in book.issue("riya@x.edu", now + RESEND_AFTER_MS + 1), true);
const fresh = book.issue("asha@x.edu", now) as { code: string };
check("a wrong code fails", book.check("asha@x.edu", "000000" === fresh.code ? "111111" : "000000", now).ok, false);
check("the right one works once", book.check("asha@x.edu", fresh.code, now).ok, true);
check("and not twice", book.check("asha@x.edu", fresh.code, now).ok, false);
const guessed = book.issue("ravi@x.edu", now) as { code: string };
for (let i = 0; i < CODE_TRIES; i++) book.check("ravi@x.edu", "999999" === guessed.code ? "888888" : "999999", now);
check("guessing ends the code", book.check("ravi@x.edu", guessed.code, now).ok, false);
const late = book.issue("late@x.edu", now) as { code: string };
check("an old code is refused", book.check("late@x.edu", late.code, now + 11 * 60_000).ok, false);

// The session.
const staff = staffList("tpo@amrita.edu:placement_officer, bad, x@y.z:wizard, admin@amrita.edu:admin");
check("staff only from the list", [...staff.entries()], [["tpo@amrita.edu", "placement_officer"], ["admin@amrita.edu", "admin"]]);
const riya = identityOf("riya@x.edu", staff, now);
check("anyone else is a student", riya.role, "student");
check("the tpo is staff", identityOf("TPO@amrita.edu", staff, now).role, "placement_officer");
const token = sign(riya, SECRET);
check("a signed session verifies", verify(token, SECRET, now)?.subject, riya.subject);
check("a forged one does not", verify(token.replace(/.$/, (c) => (c === "A" ? "B" : "A")), SECRET, now), null);
check("nor one signed elsewhere", verify(sign(riya, "other"), SECRET, now), null);
check("nor an expired one", verify(token, SECRET, now + 13 * 3600_000), null);

// The door: the cookie decides, whatever the browser claims.
check("signed in", identityFor(`theme=dark; ai_session=${token}`, SECRET, now), { "X-Role": "student", "X-Candidate-Id": riya.subject });
check("no cookie, nobody", identityFor("theme=dark", SECRET, now), {});
check("a forged cookie, nobody", identityFor(`ai_session=${sign({ ...riya, role: "admin" }, "guess")}`, SECRET, now), {});
