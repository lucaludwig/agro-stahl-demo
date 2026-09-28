/**
 * Das Anfrageformular von AGRO-STAHL (Angebot + Auftrag).
 *
 * Felder und Zuweisungsregeln stammen wörtlich aus der Mail von Martina Schlögl
 * vom 18.09.2026. Nichts hier ist erfunden — wo die Mail eine Regel nennt
 * ("sonst Standard 2-3 Wochen"), steht sie als Regel im Code, und die Herkunft
 * des Werts bleibt am Feld sichtbar.
 *
 * Bewusst ohne React, ohne zod und ohne Netzwerk, damit es mit `node --test`
 * direkt prüfbar ist. Tests: `src/lib/anfrage.test.ts`.
 */

export type Vorgangsart = "angebot" | "auftrag";
export type Kundentyp = "neu" | "bestand";

/** Was der Kunde möchte — die fünf Unterpunkte aus der Mail. */
export interface Anliegen {
  material: string | null;
  anfertigung: string | null;
  reparatur: string | null;
  produkt: string | null;
  infos: string | null;
}

export interface Anfrage {
  vorgangsart: Vorgangsart;
  name: string | null;
  telefonnummer: string | null;
  kundentyp: Kundentyp | null;
  /** Laut Mail nur bei Neukunden relevant, und auch dort nur "wenn vorhanden". */
  adresse: string | null;
  anliegen: Anliegen;
  /** Wörtlich extrahierter Termin; eindeutige relative Fristen werden angezeigt als Datum. */
  fertigstellung: string | null;
  /** Nur gesetzt, wenn in der Nachricht ein Mitarbeiter genannt wurde. */
  mitarbeiter: string | null;
}

export const STANDARD_FERTIGSTELLUNG = "2-3 Wochen (Standard)";

/**
 * Fertigstellung: das Gesagte, sonst die Standardfrist aus der Mail.
 *
 * Die Herkunft bleibt im Rückgabewert sichtbar. Ohne `istStandard` sähe eine
 * vom System gesetzte Frist in der Maske genauso aus wie eine vom Chef
 * genannte — und genau dieser Unterschied entscheidet, ob das Büro nachfragen
 * muss oder nicht.
 */
export function fertigstellungMit(
  genannt: string | null,
  jetzt: Date = new Date(),
): { wert: string; istStandard: boolean } {
  const sauber = genannt?.trim();
  if (!sauber) return { wert: STANDARD_FERTIGSTELLUNG, istStandard: true };
  if (/\bEnde\s+(?:der\s+)?(?:nächsten|nächster|kommenden|kommender)\s+Woche\b/i.test(sauber)) {
    const teile = Object.fromEntries(
      new Intl.DateTimeFormat("de-AT", {
        timeZone: "Europe/Vienna",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(jetzt).map(({ type, value }) => [type, value]),
    );
    const freitag = new Date(Date.UTC(
      Number(teile.year), Number(teile.month) - 1, Number(teile.day),
    ));
    const tageSeitMontag = (freitag.getUTCDay() + 6) % 7;
    freitag.setUTCDate(freitag.getUTCDate() + 11 - tageSeitMontag);
    const datum = [
      String(freitag.getUTCDate()).padStart(2, "0"),
      String(freitag.getUTCMonth() + 1).padStart(2, "0"),
      String(freitag.getUTCFullYear()),
    ].join(".");
    return { wert: `Freitag, ${datum} (Ende nächster Woche)`, istStandard: false };
  }
  return { wert: sauber, istStandard: false };
}

/**
 * Zuweisung wörtlich nach der Mail:
 *   "Angebot an Martina"
 *   "Auftrag – an Martina & Klemens (zum Auftrag erstellen) und an einen
 *    Mitarbeiter, der die Arbeit macht (falls schon gekannt)"
 *
 * Das "falls schon gekannt" ist der Grund, warum der Mitarbeiter optional
 * bleibt: ein erfundener dritter Empfänger wäre schlimmer als einer zu wenig.
 */
export function zuweisungFuer(
  vorgangsart: Vorgangsart,
  mitarbeiter: string | null,
): string[] {
  if (vorgangsart === "angebot") return ["Martina"];
  const empfaenger = ["Martina", "Klemens"];
  const person = mitarbeiter?.trim();
  if (person) empfaenger.push(person);
  return empfaenger;
}

/**
 * Welche Pflichtfelder fehlen. In der Mail sind Name und Kundentyp mit `*`
 * markiert, alles andere ist optional.
 *
 * Die Lücken werden gemeldet statt gefüllt. Eine Maske, die vollständig
 * aussieht, weil das Modell geraten hat, kostet das Büro mehr Zeit als eine,
 * die ehrlich zwei rote Felder zeigt.
 */
export function fehlendePflichtfelder(anfrage: Anfrage): string[] {
  const fehlt: string[] = [];
  if (!anfrage.name?.trim()) fehlt.push("Name");
  if (!anfrage.kundentyp) fehlt.push("Neu- oder Bestandskunde");
  return fehlt;
}

/** Hat der Kunde überhaupt ein erkennbares Anliegen genannt? */
export function anliegenLeer(anliegen: Anliegen): boolean {
  return (
    [
      anliegen.material,
      anliegen.anfertigung,
      anliegen.reparatur,
      anliegen.produkt,
      anliegen.infos,
    ].every((wert) => !wert?.trim())
  );
}

/** Datum der Anfrage — laut Mail "sollte vl. Automatisch gehen". */
export function datumHeute(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString("de-AT", {
    timeZone: "Europe/Vienna",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
