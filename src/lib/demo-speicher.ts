/**
 * Persistenz für die Demo. Ein Eintrag je Datensatz in localStorage.
 *
 * Warum überhaupt: der Store hielt alles nur in `useState`. Für eine begleitete
 * Vorführung ist das richtig (jeder Termin startet sauber), für einen Zugang, den
 * jemand über Tage selbst ausprobiert, verliert er alles beim Neuladen.
 *
 * Bewusst kein State-Management-Paket: sieben Datensätze, zwei Funktionen.
 */

export const SPEICHER_PRAEFIX = "werkflow-demo:";

/**
 * Wiederbelebung von Date-Feldern.
 *
 * `Email.date` ist ein echtes Date; JSON macht daraus einen String, und danach
 * zerlegt `date.toLocaleTimeString()` den Posteingang. Wiederbelebt wird deshalb
 * nur, was **beim Schreiben** ein Date war — markiert über einen Umschlag. Ein
 * pauschales "sieht aus wie ein Datum" würde Anzeigetext wie `datum: "14.08.2026"`
 * in Objekte verwandeln.
 */
const DATUMS_MARKE = "__date__";

function ersetzen(_schluessel: string, wert: unknown): unknown {
  return wert instanceof Date ? { [DATUMS_MARKE]: wert.toISOString() } : wert;
}

function wiederbeleben(_schluessel: string, wert: unknown): unknown {
  if (wert && typeof wert === "object" && DATUMS_MARKE in (wert as Record<string, unknown>)) {
    return new Date((wert as Record<string, string>)[DATUMS_MARKE]);
  }
  return wert;
}

/** `toJSON` auf Date greift vor jedem Replacer — deshalb vorher selbst umschlagen. */
function umschlagen(wert: unknown): unknown {
  if (wert instanceof Date) return { [DATUMS_MARKE]: wert.toISOString() };
  if (Array.isArray(wert)) return wert.map(umschlagen);
  if (wert && typeof wert === "object") {
    return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, umschlagen(v)]));
  }
  return wert;
}

export function lesen<T>(speicher: Storage | null, name: string, start: T): T {
  if (!speicher) return start; // SSR: kein window, also kein Speicher
  try {
    const roh = speicher.getItem(SPEICHER_PRAEFIX + name);
    if (roh === null) return start;
    return JSON.parse(roh, wiederbeleben) as T;
  } catch {
    // Beschädigter Eintrag: zurück auf den Startwert. In einer Vorführung ist ein
    // zurückgesetzter Stand besser als eine weiße Seite.
    return start;
  }
}

export function schreiben(speicher: Storage | null, name: string, wert: unknown): void {
  if (!speicher) return;
  try {
    speicher.setItem(SPEICHER_PRAEFIX + name, JSON.stringify(umschlagen(wert)));
  } catch {
    // Safari im privaten Modus wirft bei setItem. Ein Absturz beim Buchen einer
    // Stunde wäre schlimmer als verlorene Persistenz.
  }
}

/** Löscht nur die eigenen Einträge, nie fremde Schlüssel. */
export function zuruecksetzen(speicher: Storage | null): void {
  if (!speicher) return;
  const eigene = Object.keys(speicher).filter((k) => k.startsWith(SPEICHER_PRAEFIX));
  for (const k of eigene) speicher.removeItem(k);
}

// `ersetzen` bleibt exportiert für Tests der Serialisierung selbst.
export { ersetzen };
