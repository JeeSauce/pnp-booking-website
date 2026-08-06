import type { Metadata } from "next";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { requireProfile, isOwner } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fleuron } from "@/components/shared/fleuron";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function DashboardOverviewPage() {
  const profile = await requireProfile();
  const owner = isOwner(profile);
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-taupe">
          {owner ? "Owner dashboard" : "Technician dashboard"}
        </p>
        <h1 className="mt-2 font-serif text-3xl text-primary">Welcome back, {firstName}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {owner
            ? "This is your studio's control center. Booking operations arrive as later phases are completed."
            : "Here you'll manage your schedule and see the appointments assigned to you."}
        </p>
      </header>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's appointments" value="—" hint="Available in Phase 4" />
        <StatCard label="Awaiting payment" value="—" hint="Available in Phase 4" />
        <StatCard label="This week" value="—" hint="Available in Phase 4" />
        <StatCard label="Sync warnings" value="—" hint="Available in Phase 5" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Build progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3 text-sm">
              <PhaseRow state="done" label="Phase 1 — Foundation, auth, schema & RLS" />
              <PhaseRow state="next" label="Phase 2 — Services, team, availability & settings" />
              <PhaseRow state="todo" label="Phase 3 — Client booking flow" />
              <PhaseRow state="todo" label="Phase 4 — Operations & payment verification" />
              <PhaseRow state="todo" label="Phase 5 — Google Calendar, email & reminders" />
              <PhaseRow state="todo" label="Phase 6 — Quality & deployment" />
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What you&rsquo;ll manage here</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              {(owner ? OWNER_POINTS : TECH_POINTS).map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <Fleuron variant="mark" className="mt-1" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const OWNER_POINTS = [
  "Services, pricing, and which technicians offer them",
  "Team members and their roles",
  "All availability, blocked dates, and overrides",
  "Payment verification and booking management",
  "Business settings, MariBank QR, and notifications",
];

const TECH_POINTS = [
  "Your recurring weekly working hours",
  "Your blocked dates and leave",
  "The appointments assigned to you",
  "Marking your appointments completed or no-show",
  "Connecting your own Google Calendar",
];

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-serif text-3xl text-primary">{value}</p>
        <p className="mt-1 text-xs text-taupe">{hint}</p>
      </CardContent>
    </Card>
  );
}

function PhaseRow({ state, label }: { state: "done" | "next" | "todo"; label: string }) {
  const icon =
    state === "done" ? (
      <CheckCircle2 className="h-4 w-4 text-success" />
    ) : state === "next" ? (
      <Clock className="h-4 w-4 text-wine" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground/50" />
    );

  return (
    <li className="flex items-center gap-3">
      <span className="shrink-0">{icon}</span>
      <span className={state === "todo" ? "text-muted-foreground" : "text-foreground"}>
        {label}
      </span>
      {state === "next" ? (
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-wine">
          Next
        </span>
      ) : null}
    </li>
  );
}
