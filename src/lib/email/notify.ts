import "server-only";

import { createEmailClient, type EmailClient } from "@/lib/email/client";
import { renderBookingEmail, type BookingEmailTemplateData } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

export type BookingEmailRecord = BookingEmailTemplateData & {
  clientEmail: string;
  notificationEmail: string | null;
};

export type NotificationClaim =
  { claimed: true; logId: string } | { claimed: false; reason: "duplicate" };

export interface BookingEmailRepository {
  getBooking(bookingId: string): Promise<BookingEmailRecord | null>;
  claim(bookingId: string, type: NotificationType, recipient: string): Promise<NotificationClaim>;
  markSent(logId: string, providerMessageId: string, sentAt: string): Promise<void>;
  markFailed(logId: string): Promise<void>;
}

export function createBookingEmailRepository(
  admin: AdminClient = createAdminClient(),
): BookingEmailRepository {
  return {
    async getBooking(bookingId) {
      const { data: booking, error } = await admin
        .from("bookings")
        .select(
          "id,booking_code,service_id,technician_id,client_name,client_email,client_phone,starts_at,ends_at,price_snapshot",
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw new Error("Booking could not be loaded for email delivery.");
      if (!booking) return null;

      const [serviceResult, technicianResult, settingsResult] = await Promise.all([
        admin.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
        admin.from("profiles").select("full_name").eq("id", booking.technician_id).maybeSingle(),
        admin
          .from("business_settings")
          .select("business_name,address,facebook_url,payment_amount_note,notification_email")
          .limit(1)
          .maybeSingle(),
      ]);
      if (serviceResult.error || technicianResult.error || settingsResult.error) {
        throw new Error("Booking email details could not be loaded.");
      }

      return {
        bookingCode: booking.booking_code,
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        clientPhone: booking.client_phone,
        serviceName: serviceResult.data?.name ?? "Nail appointment",
        technicianName: technicianResult.data?.full_name ?? "Nail technician",
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        price: booking.price_snapshot,
        businessName: settingsResult.data?.business_name ?? "Poin't & Polish",
        address: settingsResult.data?.address ?? null,
        facebookUrl: settingsResult.data?.facebook_url ?? null,
        paymentAmountNote: settingsResult.data?.payment_amount_note ?? null,
        notificationEmail: settingsResult.data?.notification_email ?? null,
      };
    },

    async claim(bookingId, type, recipient) {
      const { data, error } = await admin
        .from("notification_log")
        .insert({
          booking_id: bookingId,
          notification_type: type,
          recipient,
          status: "pending",
        })
        .select("id")
        .single();
      if (error?.code === "23505") return { claimed: false, reason: "duplicate" };
      if (error || !data) throw new Error("Email notification claim could not be recorded.");
      return { claimed: true, logId: data.id };
    },

    async markSent(logId, providerMessageId, sentAt) {
      const { error } = await admin
        .from("notification_log")
        .update({ status: "sent", provider_message_id: providerMessageId, sent_at: sentAt })
        .eq("id", logId);
      if (error) throw new Error("Successful email delivery could not be recorded.");
    },

    async markFailed(logId) {
      const { error } = await admin
        .from("notification_log")
        .update({ status: "failed" })
        .eq("id", logId);
      if (error) throw new Error("Failed email delivery could not be recorded.");
    },
  };
}

export type BookingEmailDependencies = {
  admin?: AdminClient;
  repository?: BookingEmailRepository;
  client?: EmailClient;
  now?: () => Date;
};

export type BookingEmailResult = { status: "sent" | "skipped" | "failed" };

/** Claims, renders, and sends one booking email without ever throwing into its caller. */
export async function sendBookingEmail(
  bookingId: string,
  type: NotificationType,
  dependencies: BookingEmailDependencies = {},
): Promise<BookingEmailResult> {
  let admin = dependencies.admin;
  let repository = dependencies.repository;
  let logId: string | null = null;
  const getRepository = () => {
    admin ??= createAdminClient();
    repository ??= createBookingEmailRepository(admin);
    return repository;
  };

  try {
    const booking = await getRepository().getBooking(bookingId);
    if (!booking) return { status: "failed" };

    const recipient =
      type === "new_booking_admin" ? booking.notificationEmail?.trim() : booking.clientEmail.trim();
    if (!recipient) {
      console.warn(`Email notification ${type} was skipped because no recipient is configured.`);
      return { status: "skipped" };
    }

    const claim = await getRepository().claim(bookingId, type, recipient);
    if (!claim.claimed) return { status: "skipped" };
    logId = claim.logId;

    const template = renderBookingEmail(type, booking);
    const client = dependencies.client ?? createEmailClient();
    const result = await client.send({ to: recipient, ...template });
    const sentAt = (dependencies.now ?? (() => new Date()))().toISOString();
    await getRepository().markSent(logId, result.messageId, sentAt);
    return { status: "sent" };
  } catch {
    if (logId) {
      try {
        await getRepository().markFailed(logId);
      } catch {
        console.warn("Email delivery failed and its notification status could not be saved.");
      }
    }
    console.warn("Booking email delivery failed; the database operation was kept.");
    return { status: "failed" };
  }
}
