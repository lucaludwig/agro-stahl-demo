import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Anmeldeschranke vor der Vorführung. In Next 16 heißt Middleware "Proxy", die
 * Konvention ist eine einzige Datei auf Höhe von `app` (also hier src/proxy.ts).
 *
 * Hier stand vorher eine eigene Schranke mit einem gemeinsamen Passwort und
 * einem Cookie `demo_zugang=1`. Dieses Cookie war nicht signiert und sein Wert
 * zu erraten — wer ihn setzte, war drin, ohne das Passwort je zu kennen.
 * Jetzt trägt dieselbe Kette wie bei aluclip und xylovans: eine mit
 * AUTH_SECRET signierte Sitzung, die sich nicht nachbauen lässt.
 *
 * Wie in aluclip bewusst `getToken` statt des `auth`-Wrappers: der Wrapper zöge
 * die Anmelde-Logik samt bcrypt in die Edge-Laufzeit.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Die Anmeldung selbst und ihre API müssen ohne Sitzung erreichbar sein,
  // sonst leitet die Schranke den Login auf den Login.
  if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // secureCookie muss zu useSecureCookies der Auth-Config passen: in Produktion
  // heißt das Cookie __Secure-authjs.session-token. Ohne das Flag sucht getToken
  // den unpräfixierten Namen, findet nichts und schickt jede angemeldete Person
  // zurück auf den Login — nur in Produktion, nicht in der Entwicklung.
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token?.role) {
    const ziel = new URL("/auth/login", request.url);
    // Nur der Pfad, damit die Anmeldung keine offene Weiterleitung wird.
    ziel.searchParams.set("weiter", pathname);
    return NextResponse.redirect(ziel);
  }

  return NextResponse.next();
}

export const config = {
  // Alles außer den Next-Interna und statischen Dateien.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
