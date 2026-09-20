/**
 * Kennzahlen eines Projekts: kalkulierte gegen gebuchte Stunden.
 *
 * Bewusst ohne React und ohne Store-Import, damit es mit `node --test` direkt
 * prüfbar ist. Tests: `src/lib/projekt-kennzahlen.test.ts`.
 */

export type Ampel = "gruen" | "gelb" | "rot";

/**
 * Unter 80 % im Plan, ab 80 % bis einschließlich 100 % knapp, erst darüber
 * über Budget. Die Grenze liegt absichtlich BEI 1 noch auf gelb: ein punktgenau
 * aufgebrauchtes Budget ist nicht überschritten.
 */
export function ampelFuer(quote: number): Ampel {
  if (quote > 1) return "rot";
  if (quote >= 0.8) return "gelb";
  return "gruen";
}

interface ProjektBasis {
  id: string;
  budgetStunden: number;
  stundensatz: number;
}

interface BuchungBasis {
  projektId: string;
  stunden: number;
}

export interface Kennzahlen {
  gebucht: number;
  quote: number;
  ampel: Ampel;
  restStunden: number;
  /** Nur die Stunden über Plan, mal Stundensatz. Ohne Überschreitung 0. */
  mehrkosten: number;
}

export function projektKennzahlen(
  projekt: ProjektBasis,
  buchungen: readonly BuchungBasis[],
): Kennzahlen {
  const gebucht = buchungen
    .filter((b) => b.projektId === projekt.id)
    .reduce((summe, b) => summe + b.stunden, 0);
  const quote = projekt.budgetStunden > 0 ? gebucht / projekt.budgetStunden : 0;
  const restStunden = projekt.budgetStunden - gebucht;
  return {
    gebucht,
    quote,
    ampel: ampelFuer(quote),
    restStunden,
    mehrkosten: restStunden < 0 ? Math.abs(restStunden) * projekt.stundensatz : 0,
  };
}
