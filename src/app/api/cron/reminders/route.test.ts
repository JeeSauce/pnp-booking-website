import { describe, expect, it, vi } from "vitest";
import { createRemindersGetHandler } from "@/app/api/cron/reminders/route";

const SUMMARY = { considered: 2, sent: 1, skipped: 0, failed: 1 };

describe("GET /api/cron/reminders", () => {
  it("rejects a missing authorization header", async () => {
    const run = vi.fn(async () => SUMMARY);
    const handler = createRemindersGetHandler(run);

    const response = await handler(new Request("http://localhost/api/cron/reminders"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects the wrong bearer secret", async () => {
    const run = vi.fn(async () => SUMMARY);
    const handler = createRemindersGetHandler(run);
    const request = new Request("http://localhost/api/cron/reminders", {
      headers: { Authorization: "Bearer wrong-secret" },
    });

    const response = await handler(request);

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("runs the reminder batch and returns its summary for the configured secret", async () => {
    const run = vi.fn(async () => SUMMARY);
    const handler = createRemindersGetHandler(run);
    const request = new Request("http://localhost/api/cron/reminders", {
      headers: { Authorization: "Bearer test-cron-secret" },
    });

    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(SUMMARY);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
