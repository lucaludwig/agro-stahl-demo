import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import { ServiceWorker } from "@/components/ServiceWorker";
import { WerkflowShell } from "@/components/werkflow-shell";
import { ChatWidget } from "@/components/ChatWidget";
import { AppStateProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bauer GmbH | werkflow",
  description: "Installateur Bauer GmbH | werkflow Betriebssystem",
  // Die Demo zeigt einen erfundenen Betrieb mit erfundenen Zahlen (48.200 EUR
  // Umsatz, namentliche Kunden). Ohne noindex ist das frei indexierbar und liest
  // in einem Suchergebnis wie eine echte Firma. Kein robots.txt-Disallow dazu:
  // ein Disallow verhindert das Crawlen und damit auch das Lesen dieses noindex.
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bauer GmbH",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d2d50",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.className}>
      <body className="min-h-dvh flex flex-col">
        <AppStateProvider>
          <WerkflowShell>{children}</WerkflowShell>
          <ChatWidget />
        </AppStateProvider>
        <ToastProvider />
        <ServiceWorker />
      </body>
    </html>
  );
}
