import type { Metadata } from "next";

// Die Seite selbst ist eine Client-Komponente (Mikrofon-Zugriff) und kann
// deshalb keine Metadata exportieren. Ohne dieses Layout erbt sie den Titel des
// Root-Layouts — in einer Vorfuehrung fuer AGRO-STAHL stuende dann "Bauer GmbH"
// im Browser-Tab.
export const metadata: Metadata = {
  title: "Spracherfassung | AGRO-STAHL",
  description:
    "Kundenanfragen per Sprachnachricht erfassen und als Anfrageformular aufbereiten.",
  robots: { index: false, follow: false },
};

export default function SpracheLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
