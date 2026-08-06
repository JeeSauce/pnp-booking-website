import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Typographic wordmark. Set in Cormorant Garamond per the brand guidelines.
 * The apostrophe in "Poin't" is intentional — it is the brand's signature.
 */
export function Wordmark({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  } as const;

  const content = (
    <span
      className={cn(
        "font-serif font-semibold tracking-tight text-primary leading-none",
        sizes[size],
        className,
      )}
    >
      Poin&rsquo;t <span className="text-wine">&amp;</span> Polish
    </span>
  );

  if (href === null) return content;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-sm"
      aria-label="Poin't & Polish — home"
    >
      {content}
    </Link>
  );
}

/**
 * Compact monogram badge (the "PP" mark) for tight spaces like the dashboard
 * sidebar collapsed state or the favicon area.
 */
export function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary font-serif text-lg font-semibold text-primary-foreground",
        className,
      )}
    >
      P
    </span>
  );
}
