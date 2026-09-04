import type { NextConfig } from "next";

// Static export so the site can be served straight from the repository via GitHub Pages.
// NEXT_PUBLIC_BASE_PATH is "/<repo-name>" on project pages and empty for a custom domain or local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
