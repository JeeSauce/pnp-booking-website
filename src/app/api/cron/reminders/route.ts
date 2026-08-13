import { serverEnv } from "@/lib/env";
import { runReminders, type ReminderRunSummary } from "@/lib/reminders/run";

export const dynamic = "force-dynamic";

type ReminderRunner = () => Promise<ReminderRunSummary>;

export function createRemindersGetHandler(run: ReminderRunner = runReminders) {
  return async function GET(request: Request): Promise<Response> {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authorization !== `Bearer ${serverEnv.cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await run();
    return Response.json(summary);
  };
}

export const GET = createRemindersGetHandler();
