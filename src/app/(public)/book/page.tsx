import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Fleuron } from "@/components/shared/fleuron";

export const metadata: Metadata = {
  title: "Book an appointment",
};

/**
 * Phase 1 placeholder. The full booking flow (service → technician → slot →
 * details → policy → payment) is built in Phase 3.
 */
export default function BookPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-24 text-center sm:px-8">
      <Fleuron variant="mark" />
      <h1 className="mt-5 font-serif text-4xl text-primary">Online booking is being set up</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The full booking experience — choosing your service, technician, and a two-hour slot —
        arrives in the next phase. Thank you for your patience.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/#services">View services</Link>
        </Button>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </section>
  );
}
