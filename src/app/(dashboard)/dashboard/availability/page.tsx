import type { Metadata } from "next";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { nowInManila } from "@/lib/availability/time";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { ConfirmSubmitButton, SubmitButton } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createAvailabilityOverride,
  createAvailabilityRule,
  deleteAvailabilityOverride,
  deleteAvailabilityRule,
} from "./actions";

export const metadata: Metadata = { title: "Availability" };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type PageProps = {
  searchParams: Promise<{
    technician?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function AvailabilityPage({ searchParams }: PageProps) {
  const profile = await requireProfile();
  const owner = isOwner(profile);
  const params = await searchParams;
  const supabase = await createClient();

  const { data: technicianRows, error: technicianError } = owner
    ? await supabase
        .from("profiles")
        .select("id,full_name,active")
        .eq("role", "technician")
        .order("full_name")
    : await supabase.from("profiles").select("id,full_name,active").eq("id", profile.id);
  if (technicianError) throw new Error("Technicians could not be loaded.");

  const requested = owner ? params.technician : profile.id;
  const selected =
    technicianRows.find((technician) => technician.id === requested) ?? technicianRows[0] ?? null;

  const [rulesResult, overridesResult] = selected
    ? await Promise.all([
        supabase
          .from("availability_rules")
          .select("*")
          .eq("technician_id", selected.id)
          .order("weekday")
          .order("start_time"),
        supabase
          .from("availability_overrides")
          .select("*")
          .eq("technician_id", selected.id)
          .gte("date", nowInManila().toISODate() ?? "")
          .order("date"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (rulesResult.error || overridesResult.error) {
    throw new Error("Availability could not be loaded.");
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={owner ? "Studio setup" : "My schedule"}
        title={owner ? "Availability" : "My availability"}
        description="Set recurring weekly working periods and date-specific exceptions. All times are interpreted in Asia/Manila."
      />
      <ActionNotice success={params.success} error={params.error} />

      {owner && technicianRows.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="technician">Technician</Label>
                <Select id="technician" name="technician" defaultValue={selected?.id}>
                  {technicianRows.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.full_name}
                      {technician.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" variant="outline">
                View schedule
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {!selected ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {owner
              ? "Create a technician before adding availability."
              : "Your technician profile is not available."}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-4 w-4" /> Add weekly hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createAvailabilityRule} className="flex flex-col gap-5">
                  <input type="hidden" name="technician_id" value={selected.id} />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="weekday">Day</Label>
                    <Select id="weekday" name="weekday" defaultValue="1">
                      {WEEKDAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="rule-start">Starts</Label>
                      <Input
                        id="rule-start"
                        name="start_time"
                        type="time"
                        defaultValue="09:00"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="rule-end">Ends</Label>
                      <Input
                        id="rule-end"
                        name="end_time"
                        type="time"
                        defaultValue="17:00"
                        required
                      />
                    </div>
                  </div>
                  <SubmitButton pendingLabel="Adding...">
                    <Plus /> Add period
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly schedule for {selected.full_name}</CardTitle>
              </CardHeader>
              <CardContent>
                {rulesResult.data.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No recurring working hours yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {rulesResult.data.map((rule) => (
                      <li
                        key={rule.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">{WEEKDAYS[rule.weekday]}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                          </p>
                        </div>
                        <form action={deleteAvailabilityRule}>
                          <input type="hidden" name="id" value={rule.id} />
                          <ConfirmSubmitButton
                            variant="ghost"
                            size="icon"
                            confirmation="Remove this recurring working period?"
                            aria-label="Remove working period"
                          >
                            <Trash2 />
                          </ConfirmSubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarPlus className="h-4 w-4" /> Add date override
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createAvailabilityOverride} className="flex flex-col gap-5">
                  <input type="hidden" name="technician_id" value={selected.id} />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="override-date">Date</Label>
                    <Input
                      id="override-date"
                      name="date"
                      type="date"
                      min={nowInManila().toISODate() ?? undefined}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="is-available">Override type</Label>
                    <Select id="is-available" name="is_available" defaultValue="false">
                      <option value="false">Unavailable all day</option>
                      <option value="true">Available during custom hours</option>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      For an unavailable day, the custom time fields are ignored.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="override-start">Starts</Label>
                      <Input id="override-start" name="start_time" type="time" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="override-end">Ends</Label>
                      <Input id="override-end" name="end_time" type="time" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="override-reason">Reason (optional)</Label>
                    <Input id="override-reason" name="reason" maxLength={300} />
                  </div>
                  <SubmitButton pendingLabel="Adding...">
                    <CalendarPlus /> Add override
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming date overrides</CardTitle>
              </CardHeader>
              <CardContent>
                {overridesResult.data.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No upcoming overrides.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {overridesResult.data.map((override) => (
                      <li
                        key={override.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">{formatDate(override.date)}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {override.is_available
                              ? formatTime(override.start_time ?? "") +
                                " - " +
                                formatTime(override.end_time ?? "")
                              : "Unavailable all day"}
                          </p>
                          {override.reason ? (
                            <p className="mt-1 text-xs text-taupe">{override.reason}</p>
                          ) : null}
                        </div>
                        <form action={deleteAvailabilityOverride}>
                          <input type="hidden" name="id" value={override.id} />
                          <ConfirmSubmitButton
                            variant="ghost"
                            size="icon"
                            confirmation="Remove this date override?"
                            aria-label="Remove date override"
                          >
                            <Trash2 />
                          </ConfirmSubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function formatTime(value: string): string {
  const parsed = DateTime.fromFormat(value.slice(0, 5), "HH:mm");
  return parsed.isValid ? parsed.toFormat("h:mm a") : value;
}

function formatDate(value: string): string {
  return DateTime.fromISO(value).toFormat("DDD");
}
