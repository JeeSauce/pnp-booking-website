import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBooking } from "@/lib/bookings/create";
import {
  cancelBookingByAdmin,
  rescheduleBookingByAdmin,
  setBookingOutcome,
  updateBookingPayment,
} from "@/lib/bookings/operations";
import { TIMEZONE } from "@/lib/constants";
import type { BookingSubmission } from "@/lib/validation/booking";
import type { Database, Profile } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isLocalSupabase = supabaseUrl === "http://127.0.0.1:54321" && Boolean(serviceRoleKey);
const describeLocal = isLocalSupabase ? describe : describe.skip;

describeLocal("Phase 4 booking operations (local Supabase)", () => {
  let admin: SupabaseClient<Database>;
  const unique = crypto.randomUUID();
  const technicianIds: string[] = [];
  let serviceId = "";
  let testDate = "";
  let injectedNow = "";
  const bookings = new Map<string, string>();

  const owner: Pick<Profile, "id" | "role"> = {
    id: "90000000-0000-4000-8000-000000000001",
    role: "owner",
  };

  beforeAll(async () => {
    admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const day = DateTime.now().setZone(TIMEZONE).plus({ days: 3 }).startOf("day");
    testDate = day.toFormat("yyyy-MM-dd");
    injectedNow = day.minus({ days: 1 }).toUTC().toISO() ?? "";

    for (const label of ["One", "Two"]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `phase4-tech-${label.toLowerCase()}-${unique}@example.test`,
        password: `Phase4-${unique}!`,
        email_confirm: true,
        user_metadata: { full_name: `Phase 4 Tech ${label}` },
      });
      if (error || !data.user) throw error ?? new Error("Test technician was not created.");
      technicianIds.push(data.user.id);
      const { error: profileError } = await admin
        .from("profiles")
        .update({ full_name: `Phase 4 Tech ${label}`, active: true, role: "technician" })
        .eq("id", data.user.id);
      if (profileError) throw profileError;
    }

    const { data: service, error: serviceError } = await admin
      .from("services")
      .insert({
        name: `Phase 4 Test Service ${unique}`,
        duration_minutes: 120,
        price: 1450,
        active: true,
        sort_order: 9998,
      })
      .select("id")
      .single();
    if (serviceError || !service) throw serviceError ?? new Error("Test service was not created.");
    serviceId = service.id;

    const { error: assignmentError } = await admin.from("technician_services").insert(
      technicianIds.map((technicianId) => ({
        technician_id: technicianId,
        service_id: serviceId,
      })),
    );
    if (assignmentError) throw assignmentError;

    const { error: scheduleError } = await admin.from("availability_rules").insert(
      technicianIds.map((technicianId) => ({
        technician_id: technicianId,
        weekday: day.weekday % 7,
        start_time: "09:00",
        end_time: "21:00",
        active: true,
      })),
    );
    if (scheduleError) throw scheduleError;

    await insertBooking("source", technicianIds[0], "09:00");
    await insertBooking("taken", technicianIds[1], "09:00");
    await insertBooking("cancel", technicianIds[0], "12:00");
    await insertBooking("complete", technicianIds[0], "15:00");
    await insertBooking("no-show", technicianIds[0], "18:00");
  }, 30_000);

  afterAll(async () => {
    if (serviceId) {
      await admin.from("bookings").delete().eq("service_id", serviceId);
      await admin.from("technician_services").delete().eq("service_id", serviceId);
      await admin.from("services").delete().eq("id", serviceId);
    }
    for (const technicianId of technicianIds) {
      await admin.auth.admin.deleteUser(technicianId);
    }
  }, 30_000);

  async function insertBooking(key: string, technicianId: string, time: string) {
    const startsAt = DateTime.fromISO(`${testDate}T${time}:00`, { zone: TIMEZONE });
    const { data, error } = await admin
      .from("bookings")
      .insert({
        service_id: serviceId,
        technician_id: technicianId,
        client_name: `Phase 4 ${key} client`,
        client_email: `phase4-${key}-${unique}@example.test`,
        client_phone: "09170000000",
        starts_at: startsAt.toUTC().toISO() ?? "",
        ends_at: startsAt.plus({ minutes: 120 }).toUTC().toISO() ?? "",
        price_snapshot: 1450,
        duration_snapshot: 120,
        policy_accepted_at: injectedNow,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Test booking was not created.");
    bookings.set(key, data.id);
  }

  function bookingInput(time: string): BookingSubmission {
    const startsAt = DateTime.fromISO(`${testDate}T${time}:00`, { zone: TIMEZONE }).toUTC().toISO();
    if (!startsAt) throw new Error("Test appointment instant is invalid.");
    return {
      service_id: serviceId,
      technician_id: technicianIds[0],
      date: testDate,
      starts_at: startsAt,
      client_name: "Replacement client",
      client_phone: "09171111111",
      client_email: `phase4-replacement-${unique}@example.test`,
      client_notes: null,
      policy_accepted: true,
    };
  }

  it("verifies an unverified payment", async () => {
    const result = await updateBookingPayment(
      { booking_id: bookings.get("source") ?? "", payment_status: "verified" },
      owner,
      { admin },
    );
    const { data } = await admin
      .from("bookings")
      .select("payment_status")
      .eq("id", bookings.get("source") ?? "")
      .single();
    expect(result).toEqual({ ok: true });
    expect(data?.payment_status).toBe("verified");
  });

  it("allows completion and no-show only from confirmed bookings", async () => {
    const technician = { id: technicianIds[0], role: "technician" as const };
    const completed = await setBookingOutcome(
      { booking_id: bookings.get("complete") ?? "", status: "completed" },
      owner,
      { admin },
    );
    const noShow = await setBookingOutcome(
      { booking_id: bookings.get("no-show") ?? "", status: "no_show" },
      technician,
      { admin },
    );
    const invalid = await setBookingOutcome(
      { booking_id: bookings.get("complete") ?? "", status: "no_show" },
      owner,
      { admin },
    );
    expect(completed).toEqual({ ok: true });
    expect(noShow).toEqual({ ok: true });
    expect(invalid).toMatchObject({ ok: false, kind: "invalid_state" });
  });

  it("rejects rescheduling into a taken slot", async () => {
    const startsAt = DateTime.fromISO(`${testDate}T09:00:00`, { zone: TIMEZONE }).toUTC().toISO();
    const result = await rescheduleBookingByAdmin(
      {
        booking_id: bookings.get("source") ?? "",
        technician_id: technicianIds[1],
        date: testDate,
        starts_at: startsAt ?? "",
      },
      owner,
      { admin, now: injectedNow },
    );
    expect(result).toMatchObject({ ok: false, kind: "conflict" });
  });

  it("preserves the booking duration snapshot when the service duration changes", async () => {
    const { error: serviceError } = await admin
      .from("services")
      .update({ duration_minutes: 90 })
      .eq("id", serviceId);
    if (serviceError) throw serviceError;

    const startsAt = DateTime.fromISO(`${testDate}T10:00:00`, { zone: TIMEZONE }).toUTC().toISO();
    const result = await rescheduleBookingByAdmin(
      {
        booking_id: bookings.get("source") ?? "",
        technician_id: technicianIds[0],
        date: testDate,
        starts_at: startsAt ?? "",
      },
      owner,
      { admin, now: injectedNow },
    );
    const { data } = await admin
      .from("bookings")
      .select("starts_at,ends_at,duration_snapshot")
      .eq("id", bookings.get("source") ?? "")
      .single();
    await admin.from("services").update({ duration_minutes: 120 }).eq("id", serviceId);

    expect(result).toEqual({ ok: true });
    expect(data?.duration_snapshot).toBe(120);
    expect(
      DateTime.fromISO(data?.ends_at ?? "").diff(DateTime.fromISO(data?.starts_at ?? ""), "minutes")
        .minutes,
    ).toBe(120);
  });

  it("frees a cancelled booking slot for a new booking", async () => {
    const cancelled = await cancelBookingByAdmin(bookings.get("cancel") ?? "", owner, { admin });
    const replacement = await createBooking(bookingInput("12:00"), { admin, now: injectedNow });
    expect(cancelled).toEqual({ ok: true });
    expect(replacement.ok).toBe(true);
  });
});
