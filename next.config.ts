import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ponytail: Shell (public/start.html) ist die Root, Bauer-Mock lebt unter /klassik
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/start.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
