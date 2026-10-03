/**
 * A student account that feels like one, before there is a provider.
 *
 * PLATFORM_TODO §1's real sign-in (Google / college SSO behind
 * `ai_core.identity`) is not built. Until it is, the shell asked "who's
 * practising today?" and offered a picker — including Administrator and
 * Placement officer, to anyone. A student signing in now gives their college
 * email, and the id they get is DERIVED from it: the same email gives the same
 * student on any browser that reaches the same backends, which is the part of
 * "an account" a student actually notices (my data follows me).
 *
 * It is still not authentication — anyone who types your email is you — and
 * the sign-in screen does not claim otherwise. When a provider lands, it hands
 * `signIn` a verified subject and this file goes.
 */

/** Lower-case, trimmed: "Asha@College.edu " and "asha@college.edu" are one person. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliseEmail(email));
}

/**
 * A UUID from the email: SHA-256, first 16 bytes, version 8 (RFC 9562's
 * "custom") and the RFC variant bits. Every backend parses candidate ids as
 * UUIDs, so it has to be one; deterministic, so it is the same everywhere.
 */
export async function subjectForEmail(email: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ai-interviewer:student:${normaliseEmail(email)}`)),
  ).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A first name from what the student typed, for the greeting. */
export function firstName(name: string | undefined | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? first[0]!.toUpperCase() + first.slice(1) : null;
}

/* ── the email, kept beside the session so the account card can show it ──── */

const EMAIL_KEY = "ai.email";

export function readEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function writeEmail(email: string | null): void {
  try {
    if (email) localStorage.setItem(EMAIL_KEY, normaliseEmail(email));
    else localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* the session still works without it */
  }
}
