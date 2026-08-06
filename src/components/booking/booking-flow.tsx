"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  LoaderCircle,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { submitBooking } from "@/app/(public)/book/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BookingServiceOption } from "@/lib/data/booking";
import { formatPeso } from "@/lib/demo";
import { cn } from "@/lib/utils";
import {
  availabilityResponseSchema,
  bookingSubmissionSchema,
  clientDetailsSchema,
  dateAndSlotSchema,
  policyAcceptanceSchema,
  referencePhotoSchema,
  serviceSelectionSchema,
  technicianSelectionSchema,
} from "@/lib/validation/booking";

type BookingFlowProps = {
  services: BookingServiceOption[];
  cancellationPolicy: string;
  minimumDate: string;
  maximumDate: string;
};

type Slot = {
  start: string;
  end: string;
  label: string;
};

type BookingFormState = {
  service_id: string;
  technician_id: string;
  date: string;
  starts_at: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_notes: string;
  reference_photo: File | null;
  policy_accepted: boolean;
};

const STEPS = ["Service", "Technician", "Date & time", "Your details", "Policy", "Review"];

const INITIAL_FORM: BookingFormState = {
  service_id: "",
  technician_id: "",
  date: "",
  starts_at: "",
  client_name: "",
  client_phone: "",
  client_email: "",
  client_notes: "",
  reference_photo: null,
  policy_accepted: false,
};

function firstIssue(result: { success: false; error: { issues: { message: string }[] } }) {
  return result.error.issues[0]?.message ?? "Please check your information.";
}

function formatSelectedDate(date: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

export function BookingFlow({
  services,
  cancellationPolicy,
  minimumDate,
  maximumDate,
}: BookingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BookingFormState>(INITIAL_FORM);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedService = useMemo(
    () => services.find((service) => service.id === form.service_id),
    [form.service_id, services],
  );
  const selectedTechnician = selectedService?.technicians.find(
    (technician) => technician.id === form.technician_id,
  );
  const selectedSlot = slots.find((slot) => slot.start === form.starts_at);

  useEffect(() => {
    if (!form.service_id || !form.technician_id || !form.date) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId: form.service_id,
      technicianId: form.technician_id,
      date: form.date,
    });

    async function loadSlots() {
      try {
        const response = await fetch(`/api/availability?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const apiMessage =
            typeof body === "object" && body !== null && "error" in body
              ? String(body.error)
              : "Available times could not be loaded.";
          throw new Error(apiMessage);
        }

        const parsed = availabilityResponseSchema.safeParse(body);
        if (!parsed.success) throw new Error("Available times could not be loaded.");
        setSlots(parsed.data.slots);
        setSlotsLoaded(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSlotsLoaded(true);
        setMessage(error instanceof Error ? error.message : "Available times could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setSlotsLoading(false);
      }
    }

    void loadSlots();
    return () => controller.abort();
  }, [form.date, form.service_id, form.technician_id, refreshKey]);

  function updateField<Key extends keyof BookingFormState>(key: Key, value: BookingFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function chooseService(serviceId: string) {
    const result = serviceSelectionSchema.safeParse({ service_id: serviceId });
    if (!result.success) return setMessage(firstIssue(result));
    setForm({ ...INITIAL_FORM, service_id: result.data.service_id });
    setMessage(null);
    setStep(1);
  }

  function chooseTechnician(technicianId: string) {
    const result = technicianSelectionSchema.safeParse({
      service_id: form.service_id,
      technician_id: technicianId,
    });
    if (!result.success) return setMessage(firstIssue(result));
    setForm((current) => ({
      ...current,
      technician_id: result.data.technician_id,
      date: "",
      starts_at: "",
    }));
    setMessage(null);
    setStep(2);
  }

  function continueFromSlot() {
    const result = dateAndSlotSchema.safeParse({
      service_id: form.service_id,
      technician_id: form.technician_id,
      date: form.date,
      starts_at: form.starts_at,
    });
    if (!result.success) return setMessage(firstIssue(result));
    setMessage(null);
    setStep(3);
  }

  function continueFromDetails() {
    const detailsResult = clientDetailsSchema.safeParse(form);
    if (!detailsResult.success) return setMessage(firstIssue(detailsResult));
    if (form.reference_photo) {
      const photoResult = referencePhotoSchema.safeParse(form.reference_photo);
      if (!photoResult.success) return setMessage(firstIssue(photoResult));
    }
    setMessage(null);
    setStep(4);
  }

  function continueFromPolicy() {
    const result = policyAcceptanceSchema.safeParse({ policy_accepted: form.policy_accepted });
    if (!result.success) return setMessage(firstIssue(result));
    setMessage(null);
    setStep(5);
  }

  function goBack() {
    if (step === 0 || isPending) return;
    setMessage(null);
    setStep((current) => current - 1);
  }

  function confirmBooking() {
    const result = bookingSubmissionSchema.safeParse({
      ...form,
      reference_photo: form.reference_photo ?? undefined,
    });
    if (!result.success) return setMessage(firstIssue(result));

    const formData = new FormData();
    formData.set("service_id", result.data.service_id);
    formData.set("technician_id", result.data.technician_id);
    formData.set("date", result.data.date);
    formData.set("starts_at", result.data.starts_at);
    formData.set("client_name", result.data.client_name);
    formData.set("client_phone", result.data.client_phone);
    formData.set("client_email", result.data.client_email);
    formData.set("client_notes", result.data.client_notes ?? "");
    formData.set("policy_accepted", "true");
    if (result.data.reference_photo) {
      formData.set("reference_photo", result.data.reference_photo);
    }

    setMessage(null);
    startTransition(async () => {
      const response = await submitBooking(formData);
      if (response.ok) {
        router.push(`/book/confirmation/${encodeURIComponent(response.bookingCode)}`);
        return;
      }

      setMessage(response.message);
      if (response.kind === "conflict") {
        setForm((current) => ({ ...current, starts_at: "" }));
        setSlots([]);
        setSlotsLoaded(false);
        setSlotsLoading(true);
        setStep(2);
        setRefreshKey((current) => current + 1);
      }
    });
  }

  return (
    <div className="mt-10">
      <BookingProgress currentStep={step} />

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-secondary/25 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-taupe">
                Step {step + 1} of {STEPS.length}
              </p>
              <CardTitle className="mt-2 text-2xl sm:text-3xl">{STEPS[step]}</CardTitle>
            </div>
            {step > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={goBack} disabled={isPending}>
                <ChevronLeft /> Back
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-7">
          {message ? (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {message}
            </div>
          ) : null}

          {step === 0 ? (
            <fieldset>
              <legend className="sr-only">Choose a service</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <ChoiceButton
                    key={service.id}
                    selected={service.id === form.service_id}
                    onClick={() => chooseService(service.id)}
                    title={service.name}
                    aside={formatPeso(service.price)}
                  >
                    <p>{service.description}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-taupe">
                      <Clock className="h-3.5 w-3.5" /> {service.durationMinutes} minutes
                    </p>
                  </ChoiceButton>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 1 ? (
            <fieldset>
              <legend className="sr-only">Choose a nail technician</legend>
              <p className="mb-5 text-sm text-muted-foreground">
                Showing technicians assigned to <strong>{selectedService?.name}</strong>.
              </p>
              {selectedService?.technicians.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedService.technicians.map((technician) => (
                    <ChoiceButton
                      key={technician.id}
                      selected={technician.id === form.technician_id}
                      onClick={() => chooseTechnician(technician.id)}
                      title={technician.name}
                    >
                      <p className="flex items-center gap-2">
                        <UserRound className="h-4 w-4" /> Nail technician
                      </p>
                    </ChoiceButton>
                  ))}
                </div>
              ) : (
                <EmptyState message="No active technicians are assigned to this service yet." />
              )}
            </fieldset>
          ) : null}

          {step === 2 ? (
            <div>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="booking-date">Appointment date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  min={minimumDate}
                  max={maximumDate}
                  value={form.date}
                  onChange={(event) => {
                    updateField("date", event.target.value);
                    updateField("starts_at", "");
                    setSlots([]);
                    setSlotsLoaded(false);
                    setSlotsLoading(Boolean(event.target.value));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Booking dates are shown in Asia/Manila.
                </p>
              </div>

              <div className="mt-7" aria-live="polite">
                <h3 className="text-lg">Available starts</h3>
                {slotsLoading ? (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Checking the latest schedule…
                  </div>
                ) : null}
                {!slotsLoading && form.date && slotsLoaded && slots.length === 0 ? (
                  <EmptyState message="No times are available on this date. Try another day." />
                ) : null}
                {!slotsLoading && !form.date ? (
                  <p className="mt-3 text-sm text-muted-foreground">Choose a date to see times.</p>
                ) : null}
                {slots.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        aria-pressed={slot.start === form.starts_at}
                        onClick={() => updateField("starts_at", slot.start)}
                        className={cn(
                          "min-h-12 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          slot.start === form.starts_at
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary/50",
                        )}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                size="lg"
                className="mt-7 w-full sm:w-auto"
                onClick={continueFromSlot}
                disabled={!form.starts_at || slotsLoading}
              >
                Continue
              </Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" htmlFor="client-name">
                  <Input
                    id="client-name"
                    autoComplete="name"
                    value={form.client_name}
                    onChange={(event) => updateField("client_name", event.target.value)}
                    required
                  />
                </Field>
                <Field label="Mobile number" htmlFor="client-phone">
                  <Input
                    id="client-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.client_phone}
                    onChange={(event) => updateField("client_phone", event.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Email address" htmlFor="client-email">
                <Input
                  id="client-email"
                  type="email"
                  autoComplete="email"
                  value={form.client_email}
                  onChange={(event) => updateField("client_email", event.target.value)}
                  required
                />
              </Field>
              <Field label="Notes or nail design request (optional)" htmlFor="client-notes">
                <Textarea
                  id="client-notes"
                  value={form.client_notes}
                  onChange={(event) => updateField("client_notes", event.target.value)}
                  placeholder="Tell us about your preferred shape, color, or design."
                  maxLength={1000}
                />
              </Field>
              <Field label="Private reference photo (optional)" htmlFor="reference-photo">
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
                  <Input
                    id="reference-photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="bg-card"
                    onChange={(event) =>
                      updateField("reference_photo", event.target.files?.[0] ?? null)
                    }
                  />
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" /> PNG, JPEG, or WebP · 5 MB maximum ·
                    staff-only
                  </p>
                </div>
              </Field>
              <Button
                type="button"
                size="lg"
                className="w-full sm:w-auto"
                onClick={continueFromDetails}
              >
                Review policy
              </Button>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <div className="rounded-xl border border-border bg-secondary/30 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-wine" />
                  <div>
                    <h3 className="text-lg">No-cancellation policy</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {cancellationPolicy}
                    </p>
                  </div>
                </div>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:bg-secondary/20">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-primary"
                  checked={form.policy_accepted}
                  onChange={(event) => updateField("policy_accepted", event.target.checked)}
                />
                <span className="text-sm leading-relaxed">
                  I understand and accept that I cannot cancel or reschedule this appointment
                  through the website.
                </span>
              </label>
              <Button
                type="button"
                size="lg"
                className="mt-6 w-full sm:w-auto"
                onClick={continueFromPolicy}
              >
                Review booking
              </Button>
            </div>
          ) : null}

          {step === 5 ? (
            <div>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <ReviewRow label="Service" value={selectedService?.name ?? "—"} />
                <ReviewRow label="Price" value={formatPeso(selectedService?.price ?? 0)} />
                <ReviewRow label="Nail technician" value={selectedTechnician?.name ?? "—"} />
                <ReviewRow label="Date" value={form.date ? formatSelectedDate(form.date) : "—"} />
                <ReviewRow label="Time" value={`${selectedSlot?.label ?? "—"} · Asia/Manila`} />
                <ReviewRow
                  label="Duration"
                  value={`${selectedService?.durationMinutes ?? 120} minutes`}
                />
                <ReviewRow label="Client" value={form.client_name} />
                <ReviewRow label="Contact" value={`${form.client_phone} · ${form.client_email}`} />
              </div>
              {form.client_notes ? (
                <div className="mt-5 rounded-lg bg-muted p-4 text-sm">
                  <p className="text-xs uppercase tracking-widest text-taupe">Notes</p>
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">
                    {form.client_notes}
                  </p>
                </div>
              ) : null}
              <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
                Your appointment will be reserved immediately. Payment begins as unverified and is
                checked manually after you send the receipt through Messenger.
              </div>
              <Button
                type="button"
                size="lg"
                className="mt-6 w-full"
                onClick={confirmBooking}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" /> Confirming your appointment…
                  </>
                ) : (
                  "Confirm and reserve"
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                We recheck the slot before reserving it. You will only be booked after a
                confirmation code appears.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function BookingProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol aria-label="Booking progress" className="grid grid-cols-6 gap-1.5 sm:gap-3">
      {STEPS.map((label, index) => (
        <li key={label} className="min-w-0 text-center">
          <span
            aria-current={index === currentStep ? "step" : undefined}
            className={cn(
              "mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
              index < currentStep && "border-success bg-success text-white",
              index === currentStep && "border-primary bg-primary text-primary-foreground",
              index > currentStep && "border-border bg-card text-muted-foreground",
            )}
          >
            {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
          </span>
          <span className="mt-2 hidden truncate text-xs text-muted-foreground sm:block">
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ChoiceButton({
  selected,
  onClick,
  title,
  aside,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-32 rounded-xl border p-5 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-secondary/60 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/40 hover:shadow-md",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-serif text-xl text-primary">{title}</span>
        {aside ? <span className="shrink-0 font-serif text-lg text-wine">{aside}</span> : null}
      </span>
      <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{children}</span>
    </button>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/50 p-5 text-center text-sm text-muted-foreground">
      <CalendarDays className="mx-auto mb-2 h-5 w-5" />
      {message}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/70 pb-3">
      <p className="text-xs uppercase tracking-widest text-taupe">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
