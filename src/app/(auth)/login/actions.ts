"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

/** Staff sign-in server action. Validates input, then authenticates via Supabase. */
export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return {
      error: "Supabase isn't configured yet. Add your credentials to .env.local to enable sign-in.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") fieldErrors[key] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const redirectParam = formData.get("redirect");
  const target =
    typeof redirectParam === "string" && redirectParam.startsWith("/dashboard")
      ? redirectParam
      : "/dashboard";

  redirect(target);
}
