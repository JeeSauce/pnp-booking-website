import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { Fleuron } from "@/components/shared/fleuron";
import { DEMO_BUSINESS } from "@/lib/demo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 bg-secondary/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Wordmark size="md" href={null} />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {DEMO_BUSINESS.tagline}
            </p>
            <Fleuron className="mt-5 max-w-[8rem]" />
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <FooterCol title="Booking">
              <FooterLink href="/book">Book an appointment</FooterLink>
              <FooterLink href="/#services">Services</FooterLink>
              <FooterLink href="/#how-it-works">How it works</FooterLink>
            </FooterCol>
            <FooterCol title="Policies">
              <FooterLink href="/booking-policy">Booking policy</FooterLink>
              <FooterLink href="/privacy">Privacy</FooterLink>
            </FooterCol>
            <FooterCol title="Studio">
              <FooterLink href="/login">Staff sign in</FooterLink>
              <FooterLink href={DEMO_BUSINESS.facebookUrl}>Facebook</FooterLink>
            </FooterCol>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-1 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>Asia/Manila · One studio · By appointment only.</p>
          <p>&copy; {year} Poin&rsquo;t &amp; Polish. Demo content — editable in the dashboard.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-taupe">{title}</p>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-muted-foreground transition-colors hover:text-primary">
        {children}
      </Link>
    </li>
  );
}
