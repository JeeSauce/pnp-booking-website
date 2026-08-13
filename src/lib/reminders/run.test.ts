import { DateTime } from "luxon";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TIMEZONE } from "@/lib/constants";
import { FakeEmailClient } from "@/lib/email/client";
import type {
  BookingEmailRecord,
  BookingEmailRepository,
  NotificationClaim,
  NotificationClaimOptions,
} from "@/lib/email/notify";
import type { ReminderCandidateRow } from "@/lib/reminders/due";
import { runReminders, type CandidateRange, type ReminderRepository } from "@/lib/reminders/run";
import type { NotificationType } from "@/types/database";

const NOW = DateTime.fromISO("2026-08-13T09:00:00", { zone: TIMEZONE });
const FAIL_ID = "30000000-0000-4000-8000-000000000011";
const SENT_ID = "30000000-0000-4000-8000-000000000012";
const SKIP_ID = "30000000-0000-4000-8000-000000000013";

type MemoryLog = {
  id: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
};

class MemoryEmailRepository implements BookingEmailRepository {
  readonly logs = new Map<string, MemoryLog>();

  constructor(private readonly bookings: ReadonlyMap<string, BookingEmailRecord>) {}

  async getBooking(bookingId: string) {
    return this.bookings.get(bookingId) ?? null;
  }

  async claim(
    bookingId: string,
    type: NotificationType,
    _recipient: string,
    options: NotificationClaimOptions = {},
  ): Promise<NotificationClaim> {
    const key = `${bookingId}:${type}`;
    const existing = this.logs.get(key);
    const claimedAt = options.now ?? new Date();
    if (existing) {
      const stale =
        existing.status === "pending" &&
        new Date(existing.createdAt).getTime() < claimedAt.getTime() - 30 * 60 * 1_000;
      if (!options.allowRetry || (existing.status !== "failed" && !stale)) {
        return { claimed: false, reason: "duplicate" };
      }
      existing.status = "pending";
      existing.createdAt = claimedAt.toISOString();
      return { claimed: true, logId: existing.id };
    }

    const log = {
      id: `log-${this.logs.size + 1}`,
      status: "pending" as const,
      createdAt: claimedAt.toISOString(),
    };
    this.logs.set(key, log);
    return { claimed: true, logId: log.id };
  }

  async markSent(logId: string) {
    this.byId(logId).status = "sent";
  }

  async markFailed(logId: string) {
    this.byId(logId).status = "failed";
  }

  seedPending(bookingId: string, type: NotificationType, createdAt: string) {
    this.logs.set(`${bookingId}:${type}`, {
      id: `log-${this.logs.size + 1}`,
      status: "pending",
      createdAt,
    });
  }

  private byId(logId: string) {
    const log = [...this.logs.values()].find((entry) => entry.id === logId);
    if (!log) throw new Error("Notification log was not found.");
    return log;
  }
}

function candidate(id: string): ReminderCandidateRow {
  return {
    id,
    starts_at: NOW.plus({ hours: 2 }).toUTC().toISO()!,
    status: "confirmed",
    notification_log: [],
  };
}

function booking(id: string, email: string): BookingEmailRecord {
  return {
    bookingCode: `PNP-${id.slice(-4)}`,
    clientName: "Reminder Client",
    clientEmail: email,
    clientPhone: "09170000000",
    serviceName: "Gel Manicure",
    technicianName: "Test Technician",
    startsAt: NOW.plus({ hours: 2 }).toUTC().toISO()!,
    endsAt: NOW.plus({ hours: 4 }).toUTC().toISO()!,
    price: 850,
    businessName: "Poin't & Polish",
    address: null,
    facebookUrl: null,
    paymentAmountNote: null,
    notificationEmail: "studio@example.test",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reminder batch", () => {
  it("isolates one send failure and reports considered, sent, skipped, and failed", async () => {
    const candidates = [
      candidate(FAIL_ID),
      candidate(SENT_ID),
      {
        ...candidate(SKIP_ID),
        notification_log: [{ notification_type: "reminder_2h" as const, status: "pending" }],
      },
    ];
    let loadedRange: CandidateRange | undefined;
    const repository: ReminderRepository = {
      async loadCandidates(range) {
        loadedRange = range;
        return candidates;
      },
    };
    const emailRepository = new MemoryEmailRepository(
      new Map([
        [FAIL_ID, booking(FAIL_ID, "fail@example.test")],
        [SENT_ID, booking(SENT_ID, "sent@example.test")],
        [SKIP_ID, booking(SKIP_ID, "skip@example.test")],
      ]),
    );
    emailRepository.seedPending(SKIP_ID, "reminder_2h", NOW.minus({ minutes: 5 }).toUTC().toISO()!);
    const client = new FakeEmailClient((message) => {
      if (message.to === "fail@example.test") throw new Error("Resend unavailable");
      return { messageId: "sent-message" };
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const summary = await runReminders({
      now: NOW,
      repository,
      emailRepository,
      emailClient: client,
    });

    expect(summary).toEqual({ considered: 3, sent: 1, skipped: 1, failed: 1 });
    expect(client.calls.map((message) => message.to)).toEqual([
      "fail@example.test",
      "sent@example.test",
    ]);
    expect(loadedRange).toEqual({
      from: NOW.plus({ minutes: 90 }).toUTC().toISO(),
      to: NOW.plus({ hours: 25 }).toUTC().toISO(),
    });
  });
});
