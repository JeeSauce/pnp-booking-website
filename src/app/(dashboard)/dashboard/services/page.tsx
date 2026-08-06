import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Plus, Save } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { ConfirmSubmitButton, SubmitButton } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createService, reorderService, toggleService, updateService } from "./actions";

export const metadata: Metadata = { title: "Services" };

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function ServicesPage({ searchParams }: PageProps) {
  await requireRole("owner");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error("Services could not be loaded.");

  const nextOrder = (services.at(-1)?.sort_order ?? 0) + 1;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Studio setup"
        title="Services"
        description="Manage pricing, duration, preparation details, visibility, and the order clients see."
      />
      <ActionNotice success={params.success} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-4 w-4" /> Add a service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createService} className="grid gap-5 md:grid-cols-2">
            <input type="hidden" name="active" value="on" />
            <input type="hidden" name="sort_order" value={nextOrder} />
            <ServiceFields />
            <div className="md:col-span-2">
              <SubmitButton pendingLabel="Creating...">
                <Plus /> Create service
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="service-list-title" className="flex flex-col gap-4">
        <div>
          <h2 id="service-list-title" className="font-serif text-2xl text-primary">
            Current services
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deactivated services stay in the dashboard but disappear from the public site.
          </p>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No services yet. Add the first service above.
            </CardContent>
          </Card>
        ) : (
          services.map((service, index) => (
            <Card key={service.id}>
              <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(Number(service.price))} · {service.duration_minutes} minutes
                  </p>
                </div>
                <span
                  className={
                    service.active
                      ? "w-fit rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                      : "w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {service.active ? "Active" : "Inactive"}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-2">
                  <form action={reorderService}>
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" variant="outline" size="sm" disabled={index === 0}>
                      <ArrowUp /> Move up
                    </Button>
                  </form>
                  <form action={reorderService}>
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={index === services.length - 1}
                    >
                      <ArrowDown /> Move down
                    </Button>
                  </form>
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={service.id} />
                    {service.active ? (
                      <ConfirmSubmitButton
                        variant="outline"
                        size="sm"
                        confirmation={
                          "Deactivate " + service.name + "? It will be hidden from clients."
                        }
                      >
                        Deactivate
                      </ConfirmSubmitButton>
                    ) : (
                      <SubmitButton variant="outline" size="sm">
                        Activate
                      </SubmitButton>
                    )}
                  </form>
                </div>

                <details className="rounded-lg border border-border p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">
                    Edit service details
                  </summary>
                  <form action={updateService} className="mt-5 grid gap-5 md:grid-cols-2">
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="sort_order" value={service.sort_order} />
                    {service.active ? <input type="hidden" name="active" value="on" /> : null}
                    <ServiceFields service={service} />
                    <div className="md:col-span-2">
                      <SubmitButton pendingLabel="Saving...">
                        <Save /> Save changes
                      </SubmitButton>
                    </div>
                  </form>
                </details>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

type ServiceDefaults = {
  name: string;
  description: string | null;
  preparation_instructions: string | null;
  duration_minutes: number;
  price: number;
};

function ServiceFields({ service }: { service?: ServiceDefaults }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={service ? "name-" + service.name : "new-name"}>Name</Label>
        <Input
          id={service ? "name-" + service.name : "new-name"}
          name="name"
          defaultValue={service?.name}
          required
          maxLength={100}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={service ? "duration-" + service.name : "new-duration"}>
            Duration (minutes)
          </Label>
          <Input
            id={service ? "duration-" + service.name : "new-duration"}
            name="duration_minutes"
            type="number"
            min={15}
            max={720}
            step={15}
            defaultValue={service?.duration_minutes ?? 120}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={service ? "price-" + service.name : "new-price"}>Price (PHP)</Label>
          <Input
            id={service ? "price-" + service.name : "new-price"}
            name="price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={service?.price ?? 0}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label htmlFor={service ? "description-" + service.name : "new-description"}>
          Description
        </Label>
        <Textarea
          id={service ? "description-" + service.name : "new-description"}
          name="description"
          defaultValue={service?.description ?? ""}
          maxLength={600}
        />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label htmlFor={service ? "prep-" + service.name : "new-prep"}>
          Preparation instructions
        </Label>
        <Textarea
          id={service ? "prep-" + service.name : "new-prep"}
          name="preparation_instructions"
          defaultValue={service?.preparation_instructions ?? ""}
          maxLength={1000}
        />
      </div>
    </>
  );
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}
