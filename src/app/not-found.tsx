import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/shared/wordmark";
import { Fleuron } from "@/components/shared/fleuron";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-24 text-center">
      <Wordmark size="lg" />
      <Fleuron className="mt-5 w-40" />
      <p className="mt-8 font-serif text-6xl text-primary">404</p>
      <h1 className="mt-2 text-xl">This page couldn&rsquo;t be found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&rsquo;re looking for may have moved. Let&rsquo;s get you back on track.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
