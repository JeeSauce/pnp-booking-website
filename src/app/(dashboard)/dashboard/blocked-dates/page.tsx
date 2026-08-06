import type { Metadata } from "next";
import { CalendarOff, Trash2 } from "lucide-react";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { nowInManila, toManila } from "@/lib/availability/time";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { ConfirmSubmitButton, SubmitButton } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createBlockedPeriod, deleteBlockedPeriod } from "./actions";

export const metadata: Metadata = { title: "Blocked dates" };

type PageProps = {
  searchParams: Promise<{
    technician?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function BlockedDatesPage({ searchParams }: PageProps) {
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

  const { data: blockedPeriods, error: blocksError } = selected
    ? await supabase
        .from("blocked_periods")
        .select("*")
        .eq("technician_id", selected.id)
        .gte("ends_at", nowInManila().toUTC().toISO() ?? "")
        .order("starts_at")
    : { data: [], error: null };
  if (blocksError) throw new Error("Blocked periods could not be loaded.");

  const tomorrow = nowInManila().plus({ days: 1 }).startOf("day");
  const tomorrowDate = tomorrow.toFormat("yyyy-MM-dd");
  const partialStart = tomorrow.set({ hour: 9 }).toFormat("yyyy-MM-dd'T'HH:mm");
  const partialEnd = tomorrow.set({ hour: 11 }).toFormat("yyyy-MM-dd'T'HH:mm");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={owner ? "Studio setup" : "My schedule"}
        title={owner ? "Blocked dates" : "My blocked dates"}
        description="Block leave, holidays, appointments, or other unavailable periods. Times are entered and displayed in Asia/Manila."
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
                View blocked dates
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {!selected ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {owner
              ? "Create a technician before adding blocked dates."
              : "Your technician profile is not available."}
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarOff className="h-4 w-4" /> Add blocked period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createBlockedPeriod} className="flex flex-col gap-5">
                <input type="hidden" name="technician_id" value={selected.id} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="block-type">Type</Label>
                  <Select id="block-type" name="block_type" defaultValue="full_day">
                    <option value="full_day">Full day</option>
                    <option value="partial">Partial day or time range</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    For a full-day block, the partial start and end fields are ignored.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="block-date">Full-day date</Label>
                  <Input
                    id="block-date"
                    name="date"
                    type="date"
                    min={nowInManila().toFormat("yyyy-MM-dd")}
                    defaultValue={tomorrowDate}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="block-start">Partial start</Label>
                    <Input
                      id="block-start"
                      name="starts_at_local"
                      type="datetime-local"
                      defaultValue={partialStart}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="block-end">Partial end</Label>
                    <Input
                      id="block-end"
                      name="ends_at_local"
                      type="datetime-local"
                      defaultValue={partialEnd}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="block-reason">Reason (optional)</Label>
                  <Input id="block-reason" name="reason" maxLength={300} />
                </div>
                <SubmitButton pendingLabel="Blocking...">
                  <CalendarOff /> Add blocked period
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming blocks for {selected.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              {blockedPeriods.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No upcoming blocked periods.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {blockedPeriods.map((period) => {
                    const start = toManila(period.starts_at);
                    const end = toManila(period.ends_at);
                    const fullDay =
                      start.hour === 0 &&
                      start.minute === 0 &&
                      end.hour === 0 &&
                      end.minute === 0 &&
                      end.diff(start, "days").days === 1;
                    return (
                      <li
                        key={period.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {fullDay
                              ? start.toFormat("DDD") + " · Full day"
                              : start.toFormat("DDD, h:mm a") + " - " + end.toFormat("DDD, h:mm a")}
                          </p>
                          {period.reason ? (
                            <p className="mt-1 text-xs text-taupe">{period.reason}</p>
                          ) : null}
                        </div>
                        <form action={deleteBlockedPeriod}>
                          <input type="hidden" name="id" value={period.id} />
                          <ConfirmSubmitButton
                            variant="ghost"
                            size="icon"
                            confirmation="Remove this blocked period?"
                            aria-label="Remove blocked period"
                          >
                            <Trash2 />
                          </ConfirmSubmitButton>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
