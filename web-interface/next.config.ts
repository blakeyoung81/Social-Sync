import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from root .env file (single source of truth)
const rootEnvPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: rootEnvPath });

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  env: {
    // Expose environment variables to the Next.js app
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY,
    PIXABAY_API_KEY: process.env.PIXABAY_API_KEY,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
    TOKENIZERS_PARALLELISM: "false",
  },
};

export default nextConfig;
