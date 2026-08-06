import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl) : undefined;

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't infer it from a stray parent lockfile.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Allow serving reference photos / QR images from Supabase Storage.
    remotePatterns: supabaseOrigin
      ? [
          {
            protocol: supabaseOrigin.protocol === "http:" ? "http" : "https",
            hostname: supabaseOrigin.hostname,
            port: supabaseOrigin.port,
            pathname: "/storage/v1/object/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
