import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, zugangNoetig } from "@/lib/demo-zugang";

/**
 * Zugangsschranke vor der Demo. In Next 16 heißt Middleware "Proxy", die
 * Konvention ist eine einzige Datei auf Höhe von `app` (also hier src/proxy.ts).
 *
 * Die Entscheidung selbst liegt in `lib/demo-zugang.ts` und ist dort mit
 * `node --test` geprüft. Hier bleibt nur das Umleiten.
 */
export function proxy(request: NextRequest) {
  const noetig = zugangNoetig({
    pfad: request.nextUrl.pathname,
    hatCookie: request.cookies.get(COOKIE_NAME)?.value === "1",
    passwortGesetzt: Boolean(process.env.DEMO_PASSWORT),
  });
  if (!noetig) return NextResponse.next();

  const ziel = new URL("/zugang", request.url);
  // Wohin es nach dem Anmelden weitergeht. Nur der Pfad, damit niemand die
  // Demo als offene Weiterleitung auf eine fremde Domain missbrauchen kann.
  ziel.searchParams.set("weiter", request.nextUrl.pathname);
  return NextResponse.redirect(ziel);
}

export const config = {
  // Alles außer den Next-Interna und Dateien mit Endung. Die inhaltliche
  // Ausnahmeliste steht in demo-zugang.ts, nicht hier — doppelte Wahrheit wäre
  // genau die Stelle, an der eine Schranke still aufgeht.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
