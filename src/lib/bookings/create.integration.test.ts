import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBooking } from "@/lib/bookings/create";
import { TIMEZONE } from "@/lib/constants";
import type { BookingSubmission } from "@/lib/validation/booking";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isLocalSupabase = supabaseUrl === "http://127.0.0.1:54321" && Boolean(serviceRoleKey);
const describeLocal = isLocalSupabase ? describe : describe.skip;

describeLocal("atomic booking creation (local Supabase)", () => {
  let admin: SupabaseClient<Database>;
  const unique = crypto.randomUUID();
  const email = `phase3-${unique}@example.test`;
  let technicianId = "";
  let serviceId = "";
  let testDate = "";
  let injectedNow = "";

  beforeAll(async () => {
    admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const day = DateTime.now().setZone(TIMEZONE).plus({ days: 2 }).startOf("day");
    testDate = day.toFormat("yyyy-MM-dd");
    injectedNow = day.minus({ days: 1 }).toUTC().toISO() ?? "";

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: `Phase3-${unique}!`,
      email_confirm: true,
      user_metadata: { full_name: "Phase 3 Test Technician" },
    });
    if (userError || !userData.user) throw userError ?? new Error("Test user was not created.");
    technicianId = userData.user.id;

    const { error: profileError } = await admin
      .from("profiles")
      .update({ full_name: "Phase 3 Test Technician", active: true, role: "technician" })
      .eq("id", technicianId);
    if (profileError) throw profileError;

    const { data: service, error: serviceError } = await admin
      .from("services")
      .insert({
        name: `Phase 3 Test Service ${unique}`,
        duration_minutes: 120,
        price: 1250,
        active: true,
        sort_order: 9999,
      })
      .select("id")
      .single();
    if (serviceError || !service) throw serviceError ?? new Error("Test service was not created.");
    serviceId = service.id;

    const { error: assignmentError } = await admin.from("technician_services").insert({
      technician_id: technicianId,
      service_id: serviceId,
    });
    if (assignmentError) throw assignmentError;

    const { error: scheduleError } = await admin.from("availability_rules").insert({
      technician_id: technicianId,
      weekday: day.weekday % 7,
      start_time: "09:00",
      end_time: "17:00",
      active: true,
    });
    if (scheduleError) throw scheduleError;
  }, 30_000);

  afterAll(async () => {
    if (serviceId) {
      await admin.from("bookings").delete().eq("service_id", serviceId);
      await admin.from("technician_services").delete().eq("service_id", serviceId);
      await admin.from("services").delete().eq("id", serviceId);
    }
    if (technicianId) await admin.auth.admin.deleteUser(technicianId);
  }, 30_000);

  function inputAt(time: string, suffix: string): BookingSubmission {
    const startsAt = DateTime.fromISO(`${testDate}T${time}:00`, { zone: TIMEZONE }).toUTC().toISO();
    if (!startsAt) throw new Error("Test appointment instant is invalid.");

    return {
      service_id: serviceId,
      technician_id: technicianId,
      date: testDate,
      starts_at: startsAt,
      client_name: `Phase 3 Client ${suffix}`,
      client_phone: `0917000${suffix.padStart(4, "0")}`,
      client_email: `phase3-client-${suffix}@example.test`,
      client_notes: null,
      policy_accepted: true,
    };
  }

  it("rechecks and rejects a stale slot after the first booking succeeds", async () => {
    const first = await createBooking(inputAt("09:00", "1"), { admin, now: injectedNow });
    const stale = await createBooking(inputAt("09:00", "2"), { admin, now: injectedNow });

    expect(first.ok).toBe(true);
    expect(stale).toMatchObject({ ok: false, kind: "conflict" });
    if (!first.ok) throw new Error("The first booking was not created.");
    const { data: booking } = await admin
      .from("bookings")
      .select("id")
      .eq("booking_code", first.bookingCode)
      .single();
    const { data: notifications } = await admin
      .from("notification_log")
      .select("notification_type,status")
      .eq("booking_id", booking?.id ?? "");

    expect(notifications).toEqual(
      expect.arrayContaining([
        { notification_type: "booking_confirmation", status: "sent" },
        { notification_type: "new_booking_admin", status: "sent" },
      ]),
    );
  });

  it("allows exactly one success for simultaneous overlapping requests", async () => {
    const results = await Promise.all([
      createBooking(inputAt("12:00", "3"), { admin, now: injectedNow }),
      createBooking(inputAt("12:00", "4"), { admin, now: injectedNow }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.kind === "conflict")).toHaveLength(1);
  });
});
