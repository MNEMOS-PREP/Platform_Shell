/**
 * Sign-in that proves who is signing in (good_and_bads #14, 2026-11-22).
 *
 * Until now the shell's sign-in was a college email with nothing behind it: the
 * browser sent `X-Role` and `X-Candidate-Id`, and every module believed them, so
 * typing another student's email showed their interviews, answers and skill
 * graph. Every backend listens on 127.0.0.1; the shell's proxy is the one door a
 * student's browser comes through. So the door checks, and nothing behind it
 * has to change:
 *
 *   POST /auth/code    {email}        a six-digit code to that address
 *   POST /auth/verify  {email, code}  a signed, HttpOnly session cookie
 *   GET  /auth/me                      who the cookie says, and the mode
 *   POST /auth/signout                 the cookie cleared
 *
 * and, on every proxied request, `identityFor()` is the ONLY source of the
 * identity headers: whatever the browser sent is removed, and the cookie's
 * identity (or none) is put in its place.
 *
 * `AUTH_MODE=email` turns it on. The default is `demo` — the open sign-in, the
 * demo student and the staff role buttons, as before — so a laptop demo and
 * every module's own tests are unchanged. Staff roles come only from
 * `AUTH_STAFF` ("email:role,email:role"); anyone else proving an email is a
 * student. The code goes through `deliver`: the console and a file until a
 * mail transport is configured — a real pilot needs one (see the README).
 *
 * Node only (node:crypto, node:fs): vite.config.ts imports it, and the tests
 * run it directly.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { dirname } from "node:path";

export type AuthMode = "demo" | "email";
export type Role = "student" | "placement_officer" | "reviewer" | "admin";

export interface Identity {
  role: Role;
  subject: string;
  email: string;
  /** Seconds since the epoch. */
  exp: number;
}

export const COOKIE = "ai_session";
export const CODE_TTL_MS = 10 * 60_000;
export const CODE_TRIES = 5;
export const RESEND_AFTER_MS = 30_000;
export const SESSION_TTL_S = 12 * 3600;
/** Headers only the door may set. A browser that sends them is ignored. */
export const IDENTITY_HEADERS = ["x-role", "x-candidate-id", "x-service-secret", "x-identity"] as const;

const ROLES: readonly Role[] = ["student", "placement_officer", "reviewer", "admin"];

export function authMode(env: Record<string, string | undefined> = process.env): AuthMode {
  return (env.AUTH_MODE ?? "").trim().toLowerCase() === "email" ? "email" : "demo";
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliseEmail(email));
}

/** The same id the browser derives (src/lib/account.ts): SHA-256, first 16
 *  bytes, RFC 9562 version 8 and variant bits. */
export function subjectForEmail(email: string): string {
  const bytes = createHash("sha256").update(`ai-interviewer:student:${normaliseEmail(email)}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** `AUTH_STAFF` as {email: role}. A malformed entry or an unknown role is skipped. */
export function staffList(raw: string | undefined): Map<string, Role> {
  const out = new Map<string, Role>();
  for (const pair of (raw ?? "").split(",")) {
    const [email, role] = pair.split(":").map((s) => s?.trim() ?? "");
    if (email && role && ROLES.includes(role as Role) && role !== "student" && looksLikeEmail(email)) {
      out.set(normaliseEmail(email), role as Role);
    }
  }
  return out;
}

export function identityOf(email: string, staff: Map<string, Role>, now = Date.now()): Identity {
  const clean = normaliseEmail(email);
  const role = staff.get(clean) ?? "student";
  return {
    role,
    subject: role === "student" ? subjectForEmail(clean) : `${role}:${clean}`,
    email: clean,
    exp: Math.floor(now / 1000) + SESSION_TTL_S,
  };
}

/* ── the session token: base64url(payload).base64url(hmac) ─────────────── */

const b64 = (buf: Buffer) => buf.toString("base64url");

export function sign(identity: Identity, secret: string): string {
  const body = b64(Buffer.from(JSON.stringify(identity)));
  return `${body}.${b64(createHmac("sha256", secret).update(body).digest())}`;
}

export function verify(token: string | undefined, secret: string, now = Date.now()): Identity | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", secret).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const identity = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Identity;
    if (!ROLES.includes(identity.role) || !identity.subject || identity.exp * 1000 < now) return null;
    return identity;
  } catch {
    return null;
  }
}

export function cookieValue(header: string | undefined, name = COOKIE): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/* ── the codes ─────────────────────────────────────────────────────────── */

interface Pending {
  hash: string;
  expires: number;
  tries: number;
  sentAt: number;
}

export type CodeResult = { ok: true } | { ok: false; status: number; message: string };

export class CodeBook {
  private pending = new Map<string, Pending>();
  private readonly secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  private hash(email: string, code: string): string {
    return createHmac("sha256", this.secret).update(`${normaliseEmail(email)}:${code}`).digest("hex");
  }

  /** A fresh code for this address, or why not. The caller delivers it. */
  issue(email: string, now = Date.now()): { code: string } | { ok: false; status: number; message: string } {
    const clean = normaliseEmail(email);
    if (!looksLikeEmail(clean)) return { ok: false, status: 422, message: "That doesn't look like an email address." };
    const was = this.pending.get(clean);
    if (was && now - was.sentAt < RESEND_AFTER_MS) {
      return { ok: false, status: 429, message: "A code was just sent. Wait a moment before asking for another." };
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    this.pending.set(clean, { hash: this.hash(clean, code), expires: now + CODE_TTL_MS, tries: 0, sentAt: now });
    return { code };
  }

  check(email: string, code: string, now = Date.now()): CodeResult {
    const clean = normaliseEmail(email);
    const entry = this.pending.get(clean);
    if (!entry || entry.expires < now) {
      this.pending.delete(clean);
      return { ok: false, status: 401, message: "That code has expired. Ask for a new one." };
    }
    entry.tries += 1;
    if (entry.tries > CODE_TRIES) {
      this.pending.delete(clean);
      return { ok: false, status: 429, message: "Too many wrong codes. Ask for a new one." };
    }
    const want = Buffer.from(entry.hash, "hex");
    const got = Buffer.from(this.hash(clean, (code ?? "").trim()), "hex");
    if (!timingSafeEqual(want, got)) return { ok: false, status: 401, message: "That code isn't right." };
    this.pending.delete(clean);
    return { ok: true };
  }
}

/* ── the door: identity headers come from the cookie, and only from it ── */

/** What to set on a proxied request: the cookie's identity, or nothing. Every
 *  identity header the browser sent is removed first, by the caller. */
export function identityFor(cookieHeader: string | undefined, secret: string, now = Date.now()): Record<string, string> {
  const who = verify(cookieValue(cookieHeader), secret, now);
  return who ? { "X-Role": who.role, "X-Candidate-Id": who.subject } : {};
}

/* ── delivery ──────────────────────────────────────────────────────────── */

/** Until a mail transport is configured: the server's console and a file the
 *  person running the platform can read. Never the HTTP response. */
export function deliverToOutbox(file: string): (email: string, code: string) => void {
  return (email, code) => {
    const line = `${new Date().toISOString()}  ${normaliseEmail(email)}  sign-in code ${code}\n`;
    try {
      mkdirSync(dirname(file), { recursive: true });
      appendFileSync(file, line, "utf8");
    } catch {
      /* the console still has it */
    }
    console.log(`[auth] sign-in code for ${normaliseEmail(email)}: ${code}`);
  };
}

/** The signing secret: AUTH_SECRET, or a fresh one each start (sessions then
 *  end when the shell restarts, which is the safe direction). */
export function authSecret(env: Record<string, string | undefined> = process.env): string {
  return env.AUTH_SECRET?.trim() || randomBytes(32).toString("hex");
}
