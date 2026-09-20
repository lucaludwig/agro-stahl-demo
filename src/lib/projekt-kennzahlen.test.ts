import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ampelFuer, projektKennzahlen } from "./projekt-kennzahlen.ts";

// ponytail: node:test aus der stdlib, Node führt TypeScript direkt aus.
// Kein Vitest, kein Jest — das Repo hat gar kein Test-Setup und braucht für
// zwei reine Funktionen auch keins. Lauf: `node --test src/lib/*.test.ts`

describe("ampelFuer", () => {
  test("unter 80 Prozent der kalkulierten Stunden ist im Plan", () => {
    assert.equal(ampelFuer(0), "gruen");
    assert.equal(ampelFuer(0.79), "gruen");
  });

  test("ab 80 Prozent wird es knapp", () => {
    assert.equal(ampelFuer(0.8), "gelb");
    assert.equal(ampelFuer(1), "gelb");
  });

  test("erst über 100 Prozent ist es über Budget", () => {
    // Die Grenze liegt bewusst BEI 1 noch auf gelb: genau aufgebrauchtes Budget
    // ist nicht überschritten. Ein >= hier würde jedes punktgenau kalkulierte
    // Projekt rot färben und die Warnleiste oben unbrauchbar machen.
    assert.equal(ampelFuer(1.0001), "rot");
    assert.equal(ampelFuer(2), "rot");
  });
});

describe("projektKennzahlen", () => {
  const projekt = { id: "p1", budgetStunden: 100, stundensatz: 80 };

  test("summiert nur die Buchungen des eigenen Projekts", () => {
    const k = projektKennzahlen(projekt, [
      { projektId: "p1", stunden: 30 },
      { projektId: "p2", stunden: 500 },
      { projektId: "p1", stunden: 12.5 },
    ]);
    assert.equal(k.gebucht, 42.5);
  });

  test("rechnet Rest und Quote aus dem Budget", () => {
    const k = projektKennzahlen(projekt, [{ projektId: "p1", stunden: 60 }]);
    assert.equal(k.restStunden, 40);
    assert.equal(k.quote, 0.6);
    assert.equal(k.ampel, "gruen");
  });

  test("bei Überschreitung ist der Rest negativ und die Mehrkosten benannt", () => {
    const k = projektKennzahlen(projekt, [{ projektId: "p1", stunden: 130 }]);
    assert.equal(k.restStunden, -30);
    assert.equal(k.ampel, "rot");
    assert.equal(k.mehrkosten, 2400); // 30 h über Plan * 80 EUR
  });

  test("ohne Überschreitung sind die Mehrkosten null, nicht negativ", () => {
    // Sonst zeigt die Karte "-1.600 EUR nicht kalkuliert" bei einem Projekt,
    // das gut liegt.
    const k = projektKennzahlen(projekt, [{ projektId: "p1", stunden: 80 }]);
    assert.equal(k.mehrkosten, 0);
  });

  test("Budget 0 teilt nicht durch null", () => {
    const k = projektKennzahlen({ id: "p1", budgetStunden: 0, stundensatz: 80 }, [
      { projektId: "p1", stunden: 5 },
    ]);
    assert.equal(Number.isFinite(k.quote), true);
    assert.equal(k.quote, 0);
  });

  test("ohne Buchungen ist alles null und gruen", () => {
    const k = projektKennzahlen(projekt, []);
    assert.equal(k.gebucht, 0);
    assert.equal(k.quote, 0);
    assert.equal(k.ampel, "gruen");
    assert.equal(k.restStunden, 100);
  });
});
