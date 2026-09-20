import { timingSafeEqual } from "node:crypto";

/**
 * Zugangsschranke der Demo. Ein gemeinsames Passwort, ein Cookie, kein Konto.
 *
 * Bewusst keine Auth-Bibliothek und keine Datenbank: es gibt einen einzigen
 * fiktiven Betrieb und einen einzigen Zugang. Die Schranke soll verhindern, dass
 * Fremde und Crawler in der Vorführung landen — sie ist keine Rechteverwaltung.
 * Die Next-Doku sagt zu Proxy ausdrücklich, es sei kein Ersatz für echte
 * Sitzungsverwaltung; genau deshalb bleibt hier alles bei einem Vorab-Check.
 */

export const COOKIE_NAME = "demo_zugang";

/** Ein Jahr. Der Zugang soll nicht mitten in einem Betriebsbesuch ablaufen. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Pfade, die ohne Cookie erreichbar bleiben müssen. Exakte Treffer, kein
 * startsWith: sonst öffnet ein Pfad wie /zugangsdaten-export die ganze App.
 */
const OFFEN = new Set([
  "/zugang",
  "/api/zugang",
  // Der ServiceWorker muss ohne Cookie ladbar sein. Umgeleitet quittiert der Browser mit
  // "The script resource is behind a redirect, which is disallowed" und registriert ihn
  // nicht — die Demo wäre auf dem iPad nicht mehr installierbar. Er liefert nur Assets
  // aus, keine Daten.
  "/sw.js",
  "/manifest.json",
  "/favicon.ico",
  "/favicon-32.png",
  "/icon.svg",
  "/apple-touch-icon.png",
]);

export function istOeffentlich(pfad: string): boolean {
  return OFFEN.has(pfad);
}

export function zugangNoetig(a: {
  pfad: string;
  hatCookie: boolean;
  passwortGesetzt: boolean;
}): boolean {
  // Ohne gesetztes Passwort ist die Schranke aus. Ein vergessener Env-Eintrag
  // darf die Demo nicht unbenutzbar machen — dieselbe Entscheidung wie beim
  // Turnstile in Chamelion, wo fail-closed echte Nutzer ausgesperrt hätte.
  if (!a.passwortGesetzt) return false;
  if (istOeffentlich(a.pfad)) return false;
  return !a.hatCookie;
}

/**
 * Vergleich in konstanter Zeit. Bei ungleicher Länge wirft `timingSafeEqual`,
 * das fängt die Längenprüfung vorher ab — sonst wäre ein 500 auf der
 * Login-Route ein Orakel für die Passwortlänge.
 */
export function passwortStimmt(eingabe: string, erwartet: string): boolean {
  if (!eingabe || !erwartet) return false;
  const a = Buffer.from(eingabe);
  const b = Buffer.from(erwartet);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
