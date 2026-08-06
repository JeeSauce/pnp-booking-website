import Link from "next/link";
import { CalendarDays, Clock, Sparkles, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fleuron } from "@/components/shared/fleuron";
import { Monogram } from "@/components/shared/wordmark";
import { getDisplayServices } from "@/lib/data/services";
import { formatPeso } from "@/lib/demo";

export default async function LandingPage() {
  const { services, isDemo } = await getDisplayServices();

  return (
    <>
      <Hero />
      <Steps />
      <Services services={services} isDemo={isDemo} />
      <PolicyStrip />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:py-24">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-taupe">
            <Fleuron variant="mark" /> Luxury nail studio · Asia/Manila
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-[1.05] text-primary sm:text-5xl md:text-6xl">
            Elevated nail experiences,
            <span className="block text-wine">beautifully booked.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Choose your service, your technician, and a two-hour appointment that fits your day.
            Reserved instantly, confirmed on the spot.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/book">Book an appointment</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/#services">View services</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Payment via MariBank QR · Proof sent through Facebook Messenger.
          </p>
        </div>

        <HeroCard />
      </div>
    </section>
  );
}

function HeroCard() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-primary p-8 text-primary-foreground shadow-lg">
        {/* soft radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-wine/40 blur-3xl"
        />
        <div className="relative flex items-center justify-between">
          <Monogram className="h-11 w-11 bg-primary-foreground/10" />
          <span className="text-xs uppercase tracking-widest text-primary-foreground/70">
            By appointment
          </span>
        </div>

        <p className="relative mt-10 font-serif text-2xl leading-snug">
          A calm, considered ritual — from selection to the finishing shine.
        </p>

        <dl className="relative mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
          <Stat label="Appointment" value="2 hours" />
          <Stat label="Studio" value="One location" />
          <Stat label="Booking window" value="4 weeks" />
          <Stat label="Confirmation" value="Instant" />
        </dl>

        <Fleuron className="relative mt-8 text-primary-foreground/40" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-primary-foreground/60">{label}</dt>
      <dd className="mt-1 font-serif text-xl text-primary-foreground">{value}</dd>
    </div>
  );
}

const STEPS = [
  {
    icon: Sparkles,
    title: "Choose a service",
    body: "Pick from our gel, extension, and designer sets — each a full two-hour session.",
  },
  {
    icon: CalendarDays,
    title: "Choose your technician",
    body: "Every technician keeps their own schedule. Book the artist you love.",
  },
  {
    icon: Clock,
    title: "Pick a two-hour slot",
    body: "See only genuinely open times. Your appointment is reserved the moment you confirm.",
  },
  {
    icon: QrCode,
    title: "Pay via MariBank QR",
    body: "Scan the QR, then send your receipt through Facebook Messenger. We verify it for you.",
  },
];

function Steps() {
  return (
    <section id="how-it-works" className="border-y border-border/70 bg-secondary/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <SectionHeading eyebrow="How it works" title="Four steps to a booked appointment" />
        {/* This IS a real ordered sequence, so the numbering carries meaning. */}
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <step.icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="font-serif text-2xl text-blush">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Services({
  services,
  isDemo,
}: {
  services: Awaited<ReturnType<typeof getDisplayServices>>["services"];
  isDemo: boolean;
}) {
  return (
    <section id="services" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 md:py-24">
        <SectionHeading
          eyebrow="Services"
          title="A menu made for a two-hour ritual"
          description={
            isDemo
              ? "Sample menu shown below — prices and services are editable in the dashboard."
              : undefined
          }
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {services.map((service) => (
            <article
              key={service.name}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-xl">{service.name}</h3>
                  <span className="font-serif text-xl text-wine">{formatPeso(service.price)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-widest text-taupe">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {service.durationMinutes} minutes
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/book">Book an appointment</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function PolicyStrip() {
  return (
    <section className="border-t border-border/70 bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-14 text-center sm:px-8">
        <Fleuron variant="mark" className="text-primary-foreground/70" />
        <h2 className="max-w-2xl font-serif text-2xl text-primary-foreground sm:text-3xl">
          Appointments are reserved instantly and cannot be cancelled or rescheduled online.
        </h2>
        <p className="max-w-xl text-sm text-primary-foreground/70">
          You&rsquo;ll review and accept the no-cancellation policy before confirming. Need a
          change? Our team will help you directly.
        </p>
        <Button asChild variant="soft" size="pill" className="mt-2">
          <Link href="/booking-policy">Read the booking policy</Link>
        </Button>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-taupe">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">{title}</h2>
      {description ? <p className="mt-3 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
