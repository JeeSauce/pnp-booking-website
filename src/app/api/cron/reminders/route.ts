import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { runReminders, type ReminderRunSummary } from "@/lib/reminders/run";

export const dynamic = "force-dynamic";

type ReminderRunner = () => Promise<ReminderRunSummary>;

/** Constant-time comparison so a wrong secret can't be probed via response timing. */
function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}

export function createRemindersGetHandler(run: ReminderRunner = runReminders) {
  return async function GET(request: Request): Promise<Response> {
    const authorization = request.headers.get("authorization") ?? "";
    if (!safeEqual(authorization, `Bearer ${serverEnv.cronSecret}`)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await run();
    return Response.json(summary);
  };
}

export const GET = createRemindersGetHandler();
