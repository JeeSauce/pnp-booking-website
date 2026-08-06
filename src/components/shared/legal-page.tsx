import { Fleuron } from "@/components/shared/fleuron";

/** Shared shell for simple long-form legal/policy pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-taupe">
        Poin&rsquo;t &amp; Polish
      </p>
      <h1 className="mt-3 font-serif text-4xl text-primary">{title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated {updated} · Demo content</p>
      <Fleuron className="mt-6 max-w-[10rem]" />
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:text-primary [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
        {children}
      </div>
    </article>
  );
}
