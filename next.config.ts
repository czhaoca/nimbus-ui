import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  // CI runners are small LXC containers; parallel static-gen workers get
  // OOM-killed there (pipeline #3). One worker fits; local builds keep
  // full parallelism.
  ...(process.env.CI ? { experimental: { cpus: 1 } } : {}),
  // Image builds skip lint + type-check: the CI pipeline gates both as
  // dedicated steps before publish, and re-running them inside docker
  // build OOM-kills the runner (pipeline #7). Never set outside CI images.
  ...(process.env.NIMBUS_IMAGE_BUILD
    ? {
        eslint: { ignoreDuringBuilds: true },
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: [{ loader: "@svgr/webpack", options: { svgo: false } }],
    });
    return config;
  },
  async rewrites() {
    // Server-side proxy to the Nimbus engine (ADR-0008/DEC-10: the API is
    // never directly browser-exposed). Target comes from the environment;
    // localhost:8000 is the engine's documented internal container port.
    const apiBase = process.env.NIMBUS_API_URL || "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/health", destination: `${apiBase}/health` },
      { source: "/ws", destination: `${apiBase}/ws` },
    ];
  },
};

export default nextConfig;
