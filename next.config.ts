import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site tamamen statik: `next build` çıktısı `out/` klasörüne yazılır ve
  // Cloudflare Workers statik varlık olarak sunar (bkz. wrangler.jsonc).
  output: "export",
};

export default nextConfig;
