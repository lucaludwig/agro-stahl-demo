/**
 * Die Konten der Vorführung.
 *
 * Kein Prisma und keine Datenbank: die Vorführung speichert nichts, sie zeigt.
 * Aluclip und Xylovans holen dieselbe Struktur aus `prisma.user.findUnique` —
 * wenn AGRO-STAHL zum Kunden wird, tauscht `findeKonto` gegen genau diesen
 * Aufruf, und der Rest der Auth-Kette bleibt, wie er ist.
 *
 * Die Konten stehen in der Umgebungsvariable AGRO_KONTEN als JSON-Liste, die
 * Passwörter ausschließlich als bcrypt-Hash. Nichts davon gehört ins Repo.
 *
 * Bewusst ohne React und ohne Netzwerk, damit es mit `node --test` prüfbar ist.
 * Tests: `src/lib/konten.test.ts`.
 */

export interface Konto {
  id: string;
  email: string;
  name: string;
  role: string;
  /** bcrypt-Hash, nie Klartext. */
  hash: string;
  active: boolean;
}

/** Ein Eintrag ist gültig, wenn alle Pflichtfelder als nicht-leerer Text da sind. */
function alsKonto(eintrag: unknown, istBekannteRolle: (r: unknown) => boolean): Konto | null {
  if (typeof eintrag !== "object" || eintrag === null) return null;
  const e = eintrag as Record<string, unknown>;

  const text = (wert: unknown): string | null =>
    typeof wert === "string" && wert.trim() ? wert.trim() : null;

  const email = text(e.email)?.toLowerCase() ?? null;
  const name = text(e.name);
  const hash = text(e.hash);
  const role = text(e.role);

  if (!email || !name || !hash || !role) return null;

  // Eine unbekannte Rolle bekommt keine Rechte-Map und damit auch keine
  // Berechtigungen — aber sie käme trotzdem durch die Anmeldung. Lieber gar
  // nicht anlegen als ein Konto, das existiert und nichts darf: das sieht im
  // Betrieb wie ein falsches Passwort aus und kostet eine Stunde Suche.
  if (!istBekannteRolle(role)) return null;

  return {
    id: text(e.id) ?? email,
    email,
    name,
    role,
    hash,
    // Nur ein ausdrückliches false deaktiviert. Ein fehlendes Feld heißt aktiv,
    // sonst wäre jede Kontenliste ohne das Feld stillschweigend komplett tot.
    active: e.active !== false,
  };
}

/**
 * Liest die Kontenliste aus einem JSON-String.
 *
 * Wirft nie. Ein kaputter Eintrag fällt einzeln heraus, statt die ganze
 * Anmeldung mit einem Fehler zu beenden — aber er fällt wirklich heraus und
 * wird nicht mit Standardwerten aufgefüllt.
 */
export function kontenLesen(
  roh: string | undefined,
  istBekannteRolle: (r: unknown) => boolean,
): Konto[] {
  if (!roh?.trim()) return [];

  let daten: unknown;
  try {
    daten = JSON.parse(roh);
  } catch {
    return [];
  }
  if (!Array.isArray(daten)) return [];

  const konten: Konto[] = [];
  const gesehen = new Set<string>();
  for (const eintrag of daten) {
    const konto = alsKonto(eintrag, istBekannteRolle);
    if (!konto) continue;
    // Bei doppelter Adresse gewinnt der erste Eintrag. Sonst entscheidet die
    // Reihenfolge in einer Umgebungsvariable darüber, welche Rolle jemand hat.
    if (gesehen.has(konto.email)) continue;
    gesehen.add(konto.email);
    konten.push(konto);
  }
  return konten;
}

/** Sucht ein Konto anhand der Adresse. Gross-/Kleinschreibung egal. */
export function findeKonto(konten: readonly Konto[], email: string): Konto | null {
  const gesucht = email.trim().toLowerCase();
  if (!gesucht) return null;
  return konten.find((k) => k.email === gesucht) ?? null;
}
