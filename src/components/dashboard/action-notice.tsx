import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ActionNotice({ success, error }: { success?: string; error?: string }) {
  const message = error ?? success;
  if (!message) return null;
  const isError = Boolean(error);
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          : "flex items-start gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success"
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
