/** Nur ein belegtes Fehlwort korrigieren; echte Materialarten bleiben erhalten. */
export function normalisiereFachwoerter(text: string): string {
  return text.replace(/\bStreibblech\b/gi, (wort) =>
    wort === wort.toUpperCase()
      ? "STAHLBLECH"
      : wort[0] === wort[0]?.toUpperCase()
        ? "Stahlblech"
        : "stahlblech",
  );
}
