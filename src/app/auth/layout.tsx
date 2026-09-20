import type { Metadata } from "next";

// Wie bei /sprache: die Anmeldeseite ist eine Client-Komponente und kann keine
// Metadata exportieren. Ohne dieses Layout erbt sie den Titel des Root-Layouts,
// und im Browser-Tab stuende "Bauer GmbH" — der Demo-Betrieb der werkflow-Demo.
export const metadata: Metadata = {
  title: "Anmelden — AGRO-STAHL x werkflow",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
