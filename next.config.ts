import type { NextConfig } from "next";

// Die generischen werkflow-Demo-Module aus dem Blueprint (Installateur
// "Bauer GmbH" mit erfundenen Rechnungen/Lieferscheinen). Für AGRO-STAHL nie
// gebaut, nur geerbt — vor einer Kunden-Freigabe blockiert, sonst landet ein
// neugierig getippter Pfad bei einer fremden Firma mit Fantasiezahlen.
const GESPERRTE_BLUEPRINT_ROUTEN = [
  "/klassik",
  "/buchhaltung",
  "/lieferscheine",
  "/projekte",
  "/posteingang",
] as const;

const nextConfig: NextConfig = {
  // Die Wurzel führt in die Vorführung. Vorher stand hier ein Rewrite auf
  // public/start.html, die Übersichtsseite der werkflow-Demo — in einer
  // Vorführung für AGRO-STAHL ist die Sprach-Erfassung der Einstieg.
  async redirects() {
    return [
      { source: "/", destination: "/sprache", permanent: false },
      ...GESPERRTE_BLUEPRINT_ROUTEN.map((source) => ({
        source,
        destination: "/sprache",
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
