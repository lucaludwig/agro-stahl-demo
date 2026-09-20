import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Die Wurzel führt in die Vorführung. Vorher stand hier ein Rewrite auf
  // public/start.html, die Übersichtsseite der werkflow-Demo — in einer
  // Vorführung für AGRO-STAHL ist die Sprach-Erfassung der Einstieg.
  async redirects() {
    return [{ source: "/", destination: "/sprache", permanent: false }];
  },
};

export default nextConfig;
