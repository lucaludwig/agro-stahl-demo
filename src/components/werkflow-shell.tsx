"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState, demoZuruecksetzen } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  badgeKey?: "unreadCount";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/klassik", label: "Dashboard" },
  { href: "/lieferscheine", label: "Lieferscheine" },
  { href: "/projekte", label: "Projekte" },
  { href: "/posteingang", label: "Posteingang", badgeKey: "unreadCount" },
  { href: "/buchhaltung", label: "Buchhaltung" },
];

const BREADCRUMB_LABELS: Record<string, string> = {
  "/lieferscheine": "Lieferscheine",
  "/projekte": "Projekte",
  "/posteingang": "Posteingang",
  "/buchhaltung": "Buchhaltung",
};

export function WerkflowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { unreadCount } = useAppState();

  const isActive = (href: string): boolean =>
    href === "/klassik" ? pathname === "/klassik" : pathname.startsWith(href);

  function linkClasses(href: string): string {
    const active = isActive(href);
    return [
      "relative shrink-0 whitespace-nowrap px-2 py-1.5 text-xs sm:px-3 sm:text-sm transition-all",
      active
        ? "text-white font-semibold"
        : "text-white/80 hover:text-white",
    ].join(" ");
  }

  // Breadcrumb: nur auf Nicht-Dashboard-Seiten
  const breadcrumbLabel = BREADCRUMB_LABELS[pathname] ?? null;

  // Auf der Zugangsseite ist noch niemand angemeldet. Eine Kopfleiste mit
  // Betriebsnamen, Nutzer und Modul-Links würde dort Zugang vortäuschen und
  // hätte nur tote Ziele — das Root-Layout kann man nicht ersetzen, also hält
  // sich die Shell selbst heraus.
  //
  // /sprache aus demselben Grund: die Seite geht als eigenständige Vorführung
  // an AGRO-STAHL. Eine Kopfleiste mit "Bauer GmbH" und Modulen eines
  // Installateurs hätte dort nichts zu suchen.
  if (pathname.startsWith("/auth") || pathname === "/sprache") {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header className="sticky top-0 z-30 bg-zinc-900 text-white shadow-md">
        <div className="flex h-14 items-center gap-1 px-3 sm:px-4">
          {/* Logo */}
          <Link href="/klassik" className="mr-2 flex items-center gap-2 shrink-0 focus-ring">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-xs font-bold">
              B
            </div>
            <span className="hidden text-sm font-semibold sm:block">
              Bauer GmbH
            </span>
          </Link>

          {/*
            Nav scrollt bei Bedarf in sich selbst statt die Seite zu verbreitern.
            Gemessen bei 390 px: vier Einträge ergaben schon 460 px scrollWidth, mit dem
            fünften ("Projekte") 524 px — die ganze Seite lief quer, inklusive Kopfzeile
            und Inhalt. `min-w-0` ist dabei nicht optional: ohne das wächst ein Flex-Kind
            über seinen Container hinaus und `overflow-x` greift nie.
          */}
          <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((n) => (
              <Link key={n.href} href={n.href} className={linkClasses(n.href)}>
                <span className="flex items-center gap-1.5">
                  {n.label}
                  {/* Unread count als Text */}
                  {n.badgeKey === "unreadCount" && unreadCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      {unreadCount}
                    </span>
                  )}
                  {/* Notification dot auf Posteingang */}
                  {n.badgeKey === "unreadCount" && unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--red)]"
                      style={{ animation: "notifPulse 2s ease-in-out infinite" }}
                    />
                  )}
                </span>
                {/* Active indicator: bottom border */}
                {isActive(n.href) && (
                  <span className="absolute bottom-0 left-1 right-1 h-[3px] rounded-t-full bg-[var(--blue)]" />
                )}
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/*
              Ohne diesen Knopf kann niemand einen sauberen Vorführstand herstellen:
              seit die Daten einen Neuladen überleben, trägt die Demo die Eingaben
              des letzten Termins mit. Reload danach ist Absicht — der Store liest
              seinen Startwert nur beim Montieren.
            */}
            <button
              onClick={() => {
                demoZuruecksetzen();
                window.location.reload();
              }}
              className="hidden rounded px-2 py-1 text-[11px] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 focus-ring sm:block"
              title="Alle Eingaben verwerfen und mit den Ausgangsdaten neu starten"
            >
              Demo zurücksetzen
            </button>
            <span className="hidden text-xs text-white/60 sm:block">
              Thomas Bauer
            </span>
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #0d2d50, #0078d4)",
              }}
            >
              TB
            </div>
          </div>
        </div>

        {/* Breadcrumb auf Unterseiten */}
        {breadcrumbLabel && (
          <div className="border-t border-white/10 px-3 py-1.5 sm:px-4">
            <div className="flex items-center gap-1.5 text-[11px] text-white/50">
              <Link href="/klassik" className="hover:text-white/80 transition-colors focus-ring">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-white/80 font-medium">{breadcrumbLabel}</span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
