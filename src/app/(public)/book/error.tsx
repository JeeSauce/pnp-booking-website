"use client";

import { Button } from "@/components/ui/button";

export default function BookingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[55vh] w-full max-w-xl items-center px-5 py-16 sm:px-8">
      <div className="w-full rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-taupe">
          Booking unavailable
        </p>
        <h1 className="mt-3 font-serif text-3xl text-primary">We could not load booking</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Please try once more. Your appointment is not reserved until you see a confirmation code.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </section>
  );
}
