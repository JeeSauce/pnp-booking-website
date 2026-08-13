import "server-only";

import type { DateTime } from "luxon";
import { nowInManila, toUtcIso } from "@/lib/availability/time";
import type { EmailClient } from "@/lib/email/client";
import {
  sendBookingEmail,
  type BookingEmailRepository,
  type BookingEmailResult,
} from "@/lib/email/notify";
import {
  selectDueReminders,
  type ReminderCandidateRow,
  type ReminderType,
} from "@/lib/reminders/due";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const CANDIDATE_LIMIT = 500;
const EARLIEST_WINDOW_MINUTES = 90;
const LATEST_WINDOW_MINUTES = 25 * 60;

export type ReminderRunSummary = {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
};

export type CandidateRange = { from: string; to: string };

export interface ReminderRepository {
  loadCandidates(range: CandidateRange): Promise<ReminderCandidateRow[]>;
}

export function createReminderRepository(
  admin: AdminClient = createAdminClient(),
): ReminderRepository {
  return {
    async loadCandidates(range) {
      const { data, error } = await admin
        .from("bookings")
        .select("id,starts_at,status,notification_log(notification_type,status)")
        .eq("status", "confirmed")
        .gte("starts_at", range.from)
        .lte("starts_at", range.to)
        .order("starts_at", { ascending: true })
        .limit(CANDIDATE_LIMIT);

      if (error) throw new Error("Reminder candidates could not be loaded.");
      return data ?? [];
    },
  };
}

export type RunRemindersDependencies = {
  now?: DateTime;
  admin?: AdminClient;
  repository?: ReminderRepository;
  emailClient?: EmailClient;
  emailRepository?: BookingEmailRepository;
};

async function sendReminder(
  bookingId: string,
  type: ReminderType,
  now: DateTime,
  dependencies: RunRemindersDependencies,
): Promise<BookingEmailResult> {
  try {
    return await sendBookingEmail(bookingId, type, {
      client: dependencies.emailClient,
      repository: dependencies.emailRepository,
      now: () => now.toJSDate(),
      allowRetry: true,
    });
  } catch {
    console.warn(`Reminder ${type} failed for booking ${bookingId}; continuing the batch.`);
    return { status: "failed" };
  }
}

export async function runReminders(
  dependencies: RunRemindersDependencies = {},
): Promise<ReminderRunSummary> {
  const now = dependencies.now ?? nowInManila();
  const repository =
    dependencies.repository ?? createReminderRepository(dependencies.admin ?? createAdminClient());
  const candidates = await repository.loadCandidates({
    from: toUtcIso(now.plus({ minutes: EARLIEST_WINDOW_MINUTES })),
    to: toUtcIso(now.plus({ minutes: LATEST_WINDOW_MINUTES })),
  });
  const due = selectDueReminders(now, candidates);
  const summary: ReminderRunSummary = {
    considered: due.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const reminder of due) {
    const result = await sendReminder(reminder.bookingId, reminder.type, now, dependencies);
    summary[result.status] += 1;
  }

  return summary;
}
