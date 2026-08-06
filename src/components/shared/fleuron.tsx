import { cn } from "@/lib/utils";

/**
 * Signature divider: a diamond fleuron flanked by hairlines — the manicured
 * "point" of Poin't & Polish. Used to separate sections without shouting.
 */
export function Fleuron({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark";
}) {
  if (variant === "mark") {
    return (
      <span aria-hidden className={cn("inline-block text-wine", className)}>
        <Diamond />
      </span>
    );
  }

  return (
    <div aria-hidden className={cn("flex items-center gap-3 text-wine/70", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current" />
      <Diamond />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current" />
    </div>
  );
}

function Diamond() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className="shrink-0"
      role="presentation"
    >
      <path
        d="M5 0.5L9.5 5L5 9.5L0.5 5L5 0.5Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.25"
      />
    </svg>
  );
}
