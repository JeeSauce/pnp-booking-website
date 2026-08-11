import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Link2, Link2Off, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { formatManilaDateTime } from "@/lib/bookings/format";
import { getConnectionStatus } from "@/lib/calendar/connections";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmSubmitButton } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { disconnectCalendarAction } from "./actions";

export const metadata: Metadata = { title: "Google Calendar" };

type PageProps = {
  searchParams: Promise<{
    connected?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function CalendarConnectionsPage({ searchParams }: PageProps) {
  const profile = await requireProfile();
  const [status, messages] = await Promise.all([getConnectionStatus(profile.id), searchParams]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Integrations"
        title="Google Calendar"
        description="Block personal busy time from public availability and keep booking events in sync."
      />

      <ActionNotice
        success={messages.connected === "1" ? "Google Calendar connected." : messages.success}
        error={messages.error}
      />

      <Card className={status.connected ? "border-success/30" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5" />
            {status.connected ? "Calendar connected" : "Connect your calendar"}
          </CardTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {status.connected
              ? "Google busy periods now block appointment slots, and booking changes sync after the database is safely updated."
              : "Connect one Google Calendar to prevent clients from booking over your busy events."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {status.connected ? (
            <>
              <dl className="grid gap-4 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-taupe">
                    Calendar
                  </dt>
                  <dd className="mt-1 text-foreground">{status.calendarId}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-taupe">
                    Connected
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {status.connectedAt
                      ? formatManilaDateTime(status.connectedAt)
                      : "Connection active"}
                  </dd>
                </div>
              </dl>
              <form action={disconnectCalendarAction}>
                <ConfirmSubmitButton
                  variant="outline"
                  pendingLabel="Disconnecting..."
                  confirmation="Disconnect Google Calendar? Google busy periods will no longer block new slots."
                >
                  <Link2Off /> Disconnect
                </ConfirmSubmitButton>
              </form>
            </>
          ) : (
            <div>
              <Button asChild>
                <Link href="/api/google/connect">
                  <Link2 /> Connect Google Calendar
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">Private by design</p>
            <p className="mt-1 text-sm text-muted-foreground">
              OAuth tokens are encrypted at rest and stay on the server. The booking database
              remains authoritative if Google is temporarily unavailable.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
