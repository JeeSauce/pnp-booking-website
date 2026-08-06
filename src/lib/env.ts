/**
 * Centralised, validated access to environment variables.
 *
 * Client-safe values (NEXT_PUBLIC_*) are read eagerly. Server-only secrets are
 * read lazily through getters so that importing this module in a client bundle
 * never touches — or leaks — them.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example for setup.`);
  }
  return value;
}

/** Public config, safe to reference in client components. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/** Server-only secrets. Never import the returned values into client code. */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get cronSecret() {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
  get resendApiKey() {
    return required("RESEND_API_KEY", process.env.RESEND_API_KEY);
  },
  get emailFrom() {
    return required("EMAIL_FROM", process.env.EMAIL_FROM);
  },
  get googleOAuth() {
    return {
      clientId: required("GOOGLE_OAUTH_CLIENT_ID", process.env.GOOGLE_OAUTH_CLIENT_ID),
      clientSecret: required("GOOGLE_OAUTH_CLIENT_SECRET", process.env.GOOGLE_OAUTH_CLIENT_SECRET),
      redirectUrl: required("GOOGLE_OAUTH_REDIRECT_URL", process.env.GOOGLE_OAUTH_REDIRECT_URL),
    };
  },
};
