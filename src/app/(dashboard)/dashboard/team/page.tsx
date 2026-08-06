import type { Metadata } from "next";
import { Plus, Save, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { ConfirmSubmitButton, SubmitButton } from "@/components/dashboard/form-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTechnician, updateTechnician } from "./actions";

export const metadata: Metadata = { title: "Team" };

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function TeamPage({ searchParams }: PageProps) {
  await requireRole("owner");
  const params = await searchParams;
  const supabase = await createClient();
  const [profilesResult, servicesResult, assignmentsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "technician").order("full_name"),
    supabase.from("services").select("id,name,active").order("sort_order"),
    supabase.from("technician_services").select("technician_id,service_id"),
  ]);
  if (profilesResult.error || servicesResult.error || assignmentsResult.error) {
    throw new Error("Team data could not be loaded.");
  }

  const technicians = profilesResult.data;
  const services = servicesResult.data;
  const assignments = assignmentsResult.data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Studio setup"
        title="Team"
        description="Create technician sign-ins, control account access, and choose the services each technician offers."
      />
      <ActionNotice success={params.success} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-4 w-4" /> Add a technician
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTechnician} className="grid gap-5 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-technician-name">Full name</Label>
              <Input id="new-technician-name" name="full_name" required maxLength={100} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-technician-email">Email</Label>
              <Input
                id="new-technician-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-technician-password">Temporary password</Label>
              <Input
                id="new-technician-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="md:col-span-3">
              <SubmitButton pendingLabel="Creating account...">
                <Plus /> Create technician
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="team-list-title" className="flex flex-col gap-4">
        <div>
          <h2 id="team-list-title" className="font-serif text-2xl text-primary">
            Technicians
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inactive technicians cannot sign in and should not be offered for new bookings.
          </p>
        </div>

        {technicians.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No technicians yet. Create the first account above.
            </CardContent>
          </Card>
        ) : (
          technicians.map((technician) => {
            const assigned = new Set(
              assignments
                .filter((item) => item.technician_id === technician.id)
                .map((item) => item.service_id),
            );

            return (
              <Card key={technician.id}>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg">{technician.full_name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{technician.email}</p>
                    </div>
                  </div>
                  <span
                    className={
                      technician.active
                        ? "w-fit rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                        : "w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {technician.active ? "Active" : "Inactive"}
                  </span>
                </CardHeader>
                <CardContent>
                  <form action={updateTechnician} className="grid gap-5 md:grid-cols-2">
                    <input type="hidden" name="id" value={technician.id} />
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={"name-" + technician.id}>Full name</Label>
                      <Input
                        id={"name-" + technician.id}
                        name="full_name"
                        defaultValue={technician.full_name}
                        required
                        maxLength={100}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={"status-" + technician.id}>Account status</Label>
                      <Select
                        id={"status-" + technician.id}
                        name="active"
                        defaultValue={String(technician.active)}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Select>
                    </div>

                    <fieldset className="md:col-span-2">
                      <legend className="text-sm font-medium text-foreground">
                        Services offered
                      </legend>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {services.map((service) => (
                          <label
                            key={service.id}
                            className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              name="service_ids"
                              value={service.id}
                              defaultChecked={assigned.has(service.id)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>
                              {service.name}
                              {!service.active ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (inactive)
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="md:col-span-2">
                      <ConfirmSubmitButton
                        confirmation={
                          "Save changes for " +
                          technician.full_name +
                          "? Setting the account inactive will prevent sign-in."
                        }
                        pendingLabel="Saving..."
                      >
                        <Save /> Save technician
                      </ConfirmSubmitButton>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
