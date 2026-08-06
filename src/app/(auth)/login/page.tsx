import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff sign in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo = typeof params.redirect === "string" ? params.redirect : undefined;
  const inactive = params.error === "inactive";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Staff sign in</CardTitle>
        <CardDescription>Access the Poin&rsquo;t &amp; Polish dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        {inactive ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5 text-sm text-warning"
          >
            Your account is inactive. Please contact the studio owner.
          </p>
        ) : null}
        <LoginForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  );
}
