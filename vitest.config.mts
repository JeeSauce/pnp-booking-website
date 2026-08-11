import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const testEnv = loadEnv(mode, process.cwd(), "");

  return {
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      globals: true,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: testEnv.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: testEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: testEnv.SUPABASE_SERVICE_ROLE_KEY,
        CALENDAR_TOKEN_ENCRYPTION_KEY: testEnv.CALENDAR_TOKEN_ENCRYPTION_KEY,
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
      },
    },
  };
});
