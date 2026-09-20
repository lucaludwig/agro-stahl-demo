import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { lesen, schreiben, SPEICHER_PRAEFIX } from "./demo-speicher.ts";

// Lauf: npm test

/** Minimaler localStorage-Ersatz — node:test hat kein DOM. */
function speicherAttrappe(): Storage {
  const daten = new Map<string, string>();
  return {
    get length() { return daten.size; },
    clear: () => daten.clear(),
    getItem: (k: string) => daten.get(k) ?? null,
    key: (i: number) => [...daten.keys()][i] ?? null,
    removeItem: (k: string) => void daten.delete(k),
    setItem: (k: string, v: string) => void daten.set(k, v),
  } as Storage;
}

describe("Rundlauf", () => {
  test("einfache Daten kommen unverändert zurück", () => {
    const s = speicherAttrappe();
    schreiben(s, "lieferscheine", [{ id: "ls-1", nr: "LS-2026-0001", status: "Erstellt" }]);
    assert.deepEqual(lesen(s, "lieferscheine", []), [{ id: "ls-1", nr: "LS-2026-0001", status: "Erstellt" }]);
  });

  test("ohne gespeicherten Stand kommt der Startwert", () => {
    const s = speicherAttrappe();
    assert.deepEqual(lesen(s, "projekte", [{ id: "seed" }]), [{ id: "seed" }]);
  });

  test("der Schlüssel trägt einen Präfix, damit fremde Einträge unberührt bleiben", () => {
    const s = speicherAttrappe();
    s.setItem("theme", "dark");
    schreiben(s, "emails", []);
    assert.equal(s.getItem("theme"), "dark");
    assert.ok(s.getItem(`${SPEICHER_PRAEFIX}emails`) !== null);
  });
});

describe("Datumsfelder", () => {
  // Der eigentliche Fallstrick: Email.date ist ein echtes Date. JSON.stringify macht
  // daraus einen String, und nach dem Neuladen würde date.toLocaleTimeString() den
  // Posteingang mit "date.getTime is not a function" zerlegen.
  test("ein Date kommt als Date zurück, nicht als String", () => {
    const s = speicherAttrappe();
    const wann = new Date("2026-08-14T09:30:00.000Z");
    schreiben(s, "emails", [{ id: "e1", date: wann, unread: true }]);
    const zurueck = lesen<{ id: string; date: Date; unread: boolean }[]>(s, "emails", []);
    assert.ok(zurueck[0].date instanceof Date, "date muss ein Date sein");
    assert.equal(zurueck[0].date.getTime(), wann.getTime());
  });

  test("ein String, der nur wie ein Datum aussieht, bleibt ein String", () => {
    // Lieferscheine tragen `datum: "14.08.2026"` als Text. Wer pauschal alles
    // wiederbelebt, verwandelt Anzeigetext in Objekte.
    const s = speicherAttrappe();
    schreiben(s, "lieferscheine", [{ id: "ls-1", datum: "14.08.2026" }]);
    const zurueck = lesen<{ datum: unknown }[]>(s, "lieferscheine", []);
    assert.equal(typeof zurueck[0].datum, "string");
  });

  test("verschachtelte Datumsfelder werden auch wiederbelebt", () => {
    const s = speicherAttrappe();
    schreiben(s, "x", { aussen: { date: new Date("2026-01-02T03:04:05.000Z") } });
    const z = lesen<{ aussen: { date: Date } }>(s, "x", { aussen: { date: new Date(0) } });
    assert.ok(z.aussen.date instanceof Date);
  });
});

describe("Robustheit", () => {
  // Ein kaputter Eintrag darf die Demo nicht weißbluten lassen — in einer
  // Vorführung ist ein zurückgesetzter Stand besser als eine leere Seite.
  test("beschädigtes JSON ergibt den Startwert statt eines Absturzes", () => {
    const s = speicherAttrappe();
    s.setItem(`${SPEICHER_PRAEFIX}emails`, "{kaputt");
    assert.deepEqual(lesen(s, "emails", [{ id: "seed" }]), [{ id: "seed" }]);
  });

  test("ein voller Speicher lässt schreiben nicht werfen", () => {
    // Safari im privaten Modus wirft bei setItem. Ein Absturz beim Buchen einer
    // Stunde wäre schlimmer als verlorene Persistenz.
    const s = speicherAttrappe();
    s.setItem = () => { throw new DOMException("QuotaExceededError"); };
    assert.doesNotThrow(() => schreiben(s, "emails", [{ id: "e1" }]));
  });

  test("kein Speicher vorhanden (SSR) ergibt den Startwert", () => {
    assert.deepEqual(lesen(null, "emails", [{ id: "seed" }]), [{ id: "seed" }]);
    assert.doesNotThrow(() => schreiben(null, "emails", []));
  });
});
