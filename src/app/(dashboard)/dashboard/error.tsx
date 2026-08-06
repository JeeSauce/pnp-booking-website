"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="font-serif text-2xl text-primary">This page could not be loaded</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check the local connection and try again. Your saved data has not been changed.
          </p>
        </div>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
