"use client";

import { useState, useTransition } from "react";
import { CalendarSearch, Save } from "lucide-react";
import { rescheduleBookingAction } from "@/app/(dashboard)/dashboard/bookings/actions";
import { SubmitButton } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { availableSlotSchema, availabilityResponseSchema } from "@/lib/validation/booking";
import type { z } from "zod";

type AvailableSlot = z.infer<typeof availableSlotSchema>;

type TechnicianOption = { id: string; name: string; active: boolean };

export function RescheduleForm({
  bookingId,
  technicians,
  initialTechnicianId,
  initialDate,
  minimumDate,
  maximumDate,
}: {
  bookingId: string;
  technicians: TechnicianOption[];
  initialTechnicianId: string;
  initialDate: string;
  minimumDate: string;
  maximumDate: string;
}) {
  const [technicianId, setTechnicianId] = useState(initialTechnicianId);
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedStart, setSelectedStart] = useState("");
  const [loading, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  function resetSlots() {
    setSlots([]);
    setSelectedStart("");
    setLoaded(false);
    setError("");
  }

  function loadSlots() {
    setLoaded(false);
    setError("");
    setSelectedStart("");
    startTransition(async () => {
      try {
        const query = new URLSearchParams({ bookingId, technicianId, date });
        const response = await fetch(`/api/dashboard/reschedule-availability?${query}`, {
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload
              ? String(payload.error)
              : "Available times could not be loaded.";
          throw new Error(message);
        }
        const parsed = availabilityResponseSchema.safeParse(payload);
        if (!parsed.success) throw new Error("Available times could not be loaded.");
        setSlots(parsed.data.slots);
        setLoaded(true);
      } catch (caught) {
        setSlots([]);
        setError(caught instanceof Error ? caught.message : "Available times could not be loaded.");
      }
    });
  }

  return (
    <form action={rescheduleBookingAction} className="flex flex-col gap-5">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="reschedule-technician">Technician</Label>
          <Select
            id="reschedule-technician"
            name="technician_id"
            value={technicianId}
            onChange={(event) => {
              setTechnicianId(event.target.value);
              resetSlots();
            }}
          >
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id} disabled={!technician.active}>
                {technician.name}
                {technician.active ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reschedule-date">Date</Label>
          <Input
            id="reschedule-date"
            name="date"
            type="date"
            min={minimumDate}
            max={maximumDate}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              resetSlots();
            }}
            required
          />
        </div>
      </div>

      <Button type="button" variant="outline" onClick={loadSlots} disabled={loading || !date}>
        <CalendarSearch /> {loading ? "Checking..." : "Check available times"}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loaded && slots.length === 0 ? (
        <p className="rounded-md bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
          No times are available on this date.
        </p>
      ) : null}
      {slots.length > 0 ? (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-primary">Available times</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <label key={slot.start} className="cursor-pointer">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="starts_at"
                  value={slot.start}
                  checked={selectedStart === slot.start}
                  onChange={() => setSelectedStart(slot.start)}
                  required
                />
                <span className="flex min-h-11 items-center justify-center rounded-md border border-border px-3 py-2 text-sm transition-colors peer-checked:border-primary peer-checked:bg-secondary peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  {slot.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <SubmitButton pendingLabel="Rescheduling..." disabled={!selectedStart}>
        <Save /> Save new schedule
      </SubmitButton>
    </form>
  );
}
