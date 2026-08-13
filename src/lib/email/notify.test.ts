import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeEmailClient } from "@/lib/email/client";
import {
  sendBookingEmail,
  type BookingEmailRecord,
  type BookingEmailRepository,
  type NotificationClaim,
} from "@/lib/email/notify";
import type { NotificationType } from "@/types/database";

const BOOKING_ID = "30000000-0000-4000-8000-000000000001";

type MemoryLog = {
  id: string;
  bookingId: string;
  type: NotificationType;
  recipient: string;
  status: "pending" | "sent" | "failed";
  providerMessageId: string | null;
  sentAt: string | null;
};

class MemoryEmailRepository implements BookingEmailRepository {
  readonly logs = new Map<string, MemoryLog>();

  constructor(public booking: BookingEmailRecord | null = emailBooking()) {}

  async getBooking(bookingId: string) {
    return bookingId === BOOKING_ID ? this.booking : null;
  }

  async claim(
    bookingId: string,
    type: NotificationType,
    recipient: string,
  ): Promise<NotificationClaim> {
    const key = `${bookingId}:${type}`;
    if (this.logs.has(key)) return { claimed: false, reason: "duplicate" };
    this.logs.set(key, {
      id: `log-${this.logs.size + 1}`,
      bookingId,
      type,
      recipient,
      status: "pending",
      providerMessageId: null,
      sentAt: null,
    });
    return { claimed: true, logId: this.logs.get(key)!.id };
  }

  async markSent(logId: string, providerMessageId: string, sentAt: string) {
    const log = this.byId(logId);
    log.status = "sent";
    log.providerMessageId = providerMessageId;
    log.sentAt = sentAt;
  }

  async markFailed(logId: string) {
    this.byId(logId).status = "failed";
  }

  private byId(logId: string): MemoryLog {
    const log = [...this.logs.values()].find((value) => value.id === logId);
    if (!log) throw new Error("Notification log was not found.");
    return log;
  }
}

function emailBooking(): BookingEmailRecord {
  return {
    bookingCode: "PNP-EMAIL1",
    clientName: "Test Client",
    clientEmail: "client@example.test",
    clientPhone: "09170000000",
    serviceName: "Gel Manicure",
    technicianName: "Test Technician",
    startsAt: "2026-08-12T01:00:00.000Z",
    endsAt: "2026-08-12T03:00:00.000Z",
    price: 850,
    businessName: "Poin't & Polish",
    address: "Makati City",
    facebookUrl: "https://facebook.com/pointandpolish",
    paymentAmountNote: "Please pay the full service price.",
    notificationEmail: "studio@example.test",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("booking email delivery", () => {
  it("claims before sending and skips the same booking/type a second time", async () => {
    const repository = new MemoryEmailRepository();
    const client = new FakeEmailClient();

    const first = await sendBookingEmail(BOOKING_ID, "booking_confirmation", {
      repository,
      client,
      now: () => new Date("2026-08-11T00:00:00.000Z"),
    });
    const duplicate = await sendBookingEmail(BOOKING_ID, "booking_confirmation", {
      repository,
      client,
    });

    expect(first).toEqual({ status: "sent" });
    expect(duplicate).toEqual({ status: "skipped" });
    expect(client.calls).toHaveLength(1);
    expect([...repository.logs.values()]).toEqual([
      expect.objectContaining({
        status: "sent",
        recipient: "client@example.test",
        providerMessageId: "fake-email-1",
        sentAt: "2026-08-11T00:00:00.000Z",
      }),
    ]);
  });

  it("records failed and resolves normally when the client throws", async () => {
    const repository = new MemoryEmailRepository();
    const client = new FakeEmailClient(() => {
      throw new Error("Resend unavailable");
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      sendBookingEmail(BOOKING_ID, "payment_verified", { repository, client }),
    ).resolves.toEqual({ status: "failed" });

    expect(client.calls).toHaveLength(1);
    expect([...repository.logs.values()][0]).toMatchObject({
      type: "payment_verified",
      status: "failed",
      providerMessageId: null,
    });
  });

  it("sends the admin notification only to the configured business recipient", async () => {
    const repository = new MemoryEmailRepository();
    const client = new FakeEmailClient();

    const result = await sendBookingEmail(BOOKING_ID, "new_booking_admin", {
      repository,
      client,
    });

    expect(result).toEqual({ status: "sent" });
    expect(client.calls[0].to).toBe("studio@example.test");
    expect([...repository.logs.values()][0].recipient).toBe("studio@example.test");
  });
});
