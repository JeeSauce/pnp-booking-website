import { redirect } from "next/navigation";

export function redirectWithMessage(
  path: string,
  kind: "success" | "error",
  message: string,
): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(path + separator + kind + "=" + encodeURIComponent(message));
}
