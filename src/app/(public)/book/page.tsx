import type { Metadata } from "next";
import Link from "next/link";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fleuron } from "@/components/shared/fleuron";
import { getBookingCatalog } from "@/lib/data/booking";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Choose your service, nail technician, and available appointment.",
};

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const catalog = await getBookingCatalog();

  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="text-center">
        <Fleuron variant="mark" className="mx-auto" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-taupe">
          Online booking · Asia/Manila
        </p>
        <h1 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">
          Reserve your appointment
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choose your service, your nail technician, and a time that works. Your appointment is
          reserved instantly when you confirm.
        </p>
      </div>

      {!catalog.configured || catalog.services.length === 0 ? (
        <Card className="mx-auto mt-10 max-w-xl">
          <CardContent className="p-7 text-center">
            <h2 className="font-serif text-2xl text-primary">Booking is not available yet</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The studio is finishing its service and technician schedule. Please check again soon
              or contact Poin&rsquo;t &amp; Polish through Facebook.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <BookingFlow
          services={catalog.services}
          cancellationPolicy={catalog.cancellationPolicy}
          minimumDate={catalog.minimumDate}
          maximumDate={catalog.maximumDate}
        />
      )}
    </section>
  );
}
