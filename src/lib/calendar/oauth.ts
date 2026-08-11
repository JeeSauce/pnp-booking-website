import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { calendarEncryptionKey } from "@/lib/calendar/crypto";
import { serverEnv } from "@/lib/env";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_MAX_AGE_SECONDS = 10 * 60;

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

const statePayloadSchema = z.object({
  nonce: z.string().min(16),
  technicianId: z.uuid(),
  issuedAt: z.number().int().nonnegative(),
});

export type OAuthStatePayload = z.infer<typeof statePayloadSchema>;

function signature(payload: string, encodedKey?: string): Buffer {
  return createHmac("sha256", calendarEncryptionKey(encodedKey)).update(payload).digest();
}

export function signState(
  technicianId: string,
  options: { now?: number; nonce?: string; encodedKey?: string } = {},
): string {
  const payload: OAuthStatePayload = {
    nonce: options.nonce ?? randomBytes(18).toString("base64url"),
    technicianId,
    issuedAt: Math.floor((options.now ?? Date.now()) / 1000),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return encodedPayload + "." + signature(encodedPayload, options.encodedKey).toString("base64url");
}

export function verifyState(
  state: string,
  options: { now?: number; maxAgeSeconds?: number; encodedKey?: string } = {},
): OAuthStatePayload | null {
  const [encodedPayload, encodedSignature, ...rest] = state.split(".");
  if (!encodedPayload || !encodedSignature || rest.length) return null;

  try {
    const supplied = Buffer.from(encodedSignature, "base64url");
    const expected = signature(encodedPayload, options.encodedKey);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

    const parsed = statePayloadSchema.safeParse(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;

    const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
    const age = nowSeconds - parsed.data.issuedAt;
    if (age < -60 || age > (options.maxAgeSeconds ?? STATE_MAX_AGE_SECONDS)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function buildAuthUrl(state: string): string {
  const oauth = serverEnv.googleOAuth;
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", oauth.clientId);
  url.searchParams.set("redirect_uri", oauth.redirectUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}
