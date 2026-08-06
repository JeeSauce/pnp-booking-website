"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function ConfirmSubmitButton({
  children,
  confirmation,
  pendingLabel = "Working...",
  ...props
}: ButtonProps & { confirmation: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
