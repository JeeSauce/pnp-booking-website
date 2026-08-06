import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard page"
      className="flex animate-pulse flex-col gap-6"
    >
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-secondary" />
        <div className="h-9 w-56 rounded bg-secondary" />
        <div className="h-4 w-full max-w-xl rounded bg-muted" />
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="h-11 rounded bg-muted" />
          <div className="h-11 rounded bg-muted" />
          <div className="h-11 rounded bg-muted" />
        </CardContent>
      </Card>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
