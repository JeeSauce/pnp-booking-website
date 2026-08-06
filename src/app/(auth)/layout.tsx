import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { Fleuron } from "@/components/shared/fleuron";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Wordmark size="lg" />
          <Fleuron className="mt-4 w-40" />
        </div>
        <div className="mt-8">{children}</div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">
            ← Back to the studio site
          </Link>
        </p>
      </div>
    </div>
  );
}
