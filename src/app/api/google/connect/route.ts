import { requireProfile } from "@/lib/auth/session";
import { buildAuthUrl, signState } from "@/lib/calendar/oauth";

export async function GET(): Promise<Response> {
  const profile = await requireProfile();
  const state = signState(profile.id);
  return Response.redirect(buildAuthUrl(state), 307);
}
