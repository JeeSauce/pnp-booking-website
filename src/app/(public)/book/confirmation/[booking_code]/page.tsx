import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fleuron } from "@/components/shared/fleuron";
import { getBookingConfirmation } from "@/lib/data/booking";
import { formatPeso } from "@/lib/demo";
import { toManila } from "@/lib/availability/time";
import { bookingCodeSchema } from "@/lib/validation/booking";

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ booking_code: string }> };

export default async function BookingConfirmationPage({ params }: Props) {
  const parsedCode = bookingCodeSchema.safeParse((await params).booking_code);
  if (!parsedCode.success) notFound();

  const booking = await getBookingConfirmation(parsedCode.data);
  if (!booking) notFound();

  const start = toManila(booking.startsAt);
  const end = toManila(booking.endsAt);
  const dateLabel = start.toFormat("cccc, LLLL d, yyyy");
  const timeLabel = `${start.toFormat("h:mm a")}–${end.toFormat("h:mm a")}`;

  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" strokeWidth={1.5} />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-success">
          Appointment reserved
        </p>
        <h1 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">You&rsquo;re booked</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Your appointment is confirmed and reserved. Payment is awaiting manual verification.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-wine" /> Appointment details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <Detail label="Booking code" value={booking.bookingCode} mono />
              <Detail label="Service" value={booking.serviceName} />
              <Detail label="Nail technician" value={booking.technicianName} />
              <Detail label="Date" value={dateLabel} />
              <Detail label="Time" value={`${timeLabel} · Asia/Manila`} />
              <Detail label="Amount" value={formatPeso(booking.price)} />
            </dl>
            <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
              <p className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" /> Reserved · payment awaiting verification
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Sending a receipt does not verify payment automatically. The studio will review it
                manually.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <Fleuron variant="mark" className="mx-auto" />
            <CardTitle className="mt-2 text-2xl">Pay through MariBank</CardTitle>
            <p className="text-sm text-muted-foreground">
              Scan the QR, then send your receipt through Messenger.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {booking.maribankQrUrl ? (
              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-border bg-white p-6 shadow-sm">
                <Image
                  src={booking.maribankQrUrl}
                  alt={`${booking.businessName} MariBank payment QR code`}
                  fill
                  sizes="(max-width: 640px) 85vw, 384px"
                  className="object-contain p-6"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <div className="w-full max-w-sm rounded-xl border border-dashed border-border bg-muted p-8 text-center text-sm text-muted-foreground">
                The studio&rsquo;s MariBank QR has not been uploaded. Contact the studio before
                sending payment.
              </div>
            )}

            <div className="mt-5 text-center">
              <p className="text-xs uppercase tracking-widest text-taupe">Account name</p>
              <p className="mt-1 font-medium text-primary">
                {booking.maribankAccountName ?? booking.businessName}
              </p>
              <p className="mt-3 font-serif text-3xl text-wine">{formatPeso(booking.price)}</p>
              {booking.paymentNote ? (
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {booking.paymentNote}
                </p>
              ) : null}
            </div>

            {booking.facebookUrl ? (
              <Button asChild size="lg" className="mt-6 w-full max-w-sm">
                <a href={booking.facebookUrl} target="_blank" rel="noreferrer">
                  Send receipt via Messenger <ExternalLink />
                </a>
              </Button>
            ) : (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Contact the studio directly to send your payment receipt.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link href="/">Return to home</Link>
        </Button>
      </div>
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
      <dt className="text-xs uppercase tracking-widest text-taupe">{label}</dt>
      <dd className={`mt-1 text-foreground ${mono ? "font-mono font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
