/**
 * Editable DEMO content used as a graceful fallback before a Supabase project
 * is connected (and while there is no seeded data). These values are for
 * display only and are the same demo services seeded by supabase/seed.sql.
 *
 * DEMO DATA — replace via the dashboard once real business details are set.
 */

export const DEMO_BUSINESS = {
  name: "Poin't & Polish",
  tagline: "Elevated nail experiences. Beautifully booked.",
  address: "123 Example Ave, Makati City, Metro Manila (demo address)",
  facebookUrl: "https://facebook.com/pointandpolish",
  maribankAccountName: "Poin't & Polish (demo account)",
} as const;

export type DemoService = {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
};

export const DEMO_SERVICES: DemoService[] = [
  {
    name: "Gel Manicure",
    description: "A long-wearing, high-shine gel finish with cuticle care and shaping.",
    durationMinutes: 120,
    price: 850,
  },
  {
    name: "Soft Gel Extensions",
    description: "Lightweight soft-gel tips sculpted and finished to your desired length.",
    durationMinutes: 120,
    price: 1400,
  },
  {
    name: "Designer Nail Set",
    description: "A bespoke set with hand-painted art, textures, or embellishments.",
    durationMinutes: 120,
    price: 1800,
  },
  {
    name: "Removal + New Set",
    description: "Gentle removal of previous work followed by a fresh, healthy new set.",
    durationMinutes: 120,
    price: 1600,
  },
];

/** Peso price formatter for display. */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}
