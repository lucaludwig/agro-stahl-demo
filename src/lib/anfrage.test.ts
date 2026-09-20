import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  anliegenLeer,
  datumHeute,
  fehlendePflichtfelder,
  fertigstellungMit,
  STANDARD_FERTIGSTELLUNG,
  zuweisungFuer,
  type Anfrage,
} from "./anfrage.ts";

// Geprüft wird die Regelschicht des Formulars, nicht das Modell. Was Claude aus
// einer Sprachnachricht liest, ist nicht deterministisch — was das Formular
// daraus macht, muss es sein.

const basis: Anfrage = {
  vorgangsart: "auftrag",
  name: "Maier Landwirtschaft",
  telefonnummer: "0664 1234567",
  kundentyp: "bestand",
  adresse: null,
  anliegen: {
    material: null,
    anfertigung: null,
    reparatur: "Kiwischieber, Schweißarbeit",
    produkt: null,
    infos: "480 Euro vereinbart, 10 % Stammkundenrabatt",
  },
  fertigstellung: "bis Ende nächster Woche",
  mitarbeiter: null,
};

describe("zuweisungFuer", () => {
  test("Angebot geht nur an Martina", () => {
    assert.deepEqual(zuweisungFuer("angebot", null), ["Martina"]);
  });

  test("ein genannter Mitarbeiter ändert am Angebot nichts", () => {
    // Die Mail nennt den Mitarbeiter ausschließlich beim Auftrag. Ein Angebot
    // an die Werkstatt zu schicken wäre eine erfundene Regel.
    assert.deepEqual(zuweisungFuer("angebot", "Schmidt"), ["Martina"]);
  });

  test("Auftrag geht an Martina und Klemens", () => {
    assert.deepEqual(zuweisungFuer("auftrag", null), ["Martina", "Klemens"]);
  });

  test("beim Auftrag kommt ein genannter Mitarbeiter dazu", () => {
    assert.deepEqual(zuweisungFuer("auftrag", "Schmidt"), [
      "Martina",
      "Klemens",
      "Schmidt",
    ]);
  });

  test("leerer Mitarbeiter-String erzeugt keinen dritten Empfänger", () => {
    // "falls schon gekannt": ein Leerstring ist nicht bekannt. Ohne diesen
    // Trim landet eine leere Zeile als Empfänger in der Zuweisung.
    assert.deepEqual(zuweisungFuer("auftrag", "   "), ["Martina", "Klemens"]);
  });
});

describe("fertigstellungMit", () => {
  test("ein genannter Termin wird übernommen und nicht als Standard markiert", () => {
    const ergebnis = fertigstellungMit("bis Ende nächster Woche");
    assert.equal(ergebnis.wert, "bis Ende nächster Woche");
    assert.equal(ergebnis.istStandard, false);
  });

  test("ohne Termin greift die Standardfrist aus der Mail", () => {
    assert.deepEqual(fertigstellungMit(null), {
      wert: STANDARD_FERTIGSTELLUNG,
      istStandard: true,
    });
  });

  test("Leerstring zählt als nicht genannt", () => {
    assert.equal(fertigstellungMit("  ").istStandard, true);
  });
});

describe("fehlendePflichtfelder", () => {
  test("vollständige Anfrage meldet keine Lücke", () => {
    assert.deepEqual(fehlendePflichtfelder(basis), []);
  });

  test("fehlender Name wird gemeldet", () => {
    assert.deepEqual(fehlendePflichtfelder({ ...basis, name: null }), ["Name"]);
  });

  test("fehlender Kundentyp wird gemeldet", () => {
    assert.deepEqual(fehlendePflichtfelder({ ...basis, kundentyp: null }), [
      "Neu- oder Bestandskunde",
    ]);
  });

  test("Name aus Leerzeichen zählt als fehlend", () => {
    assert.deepEqual(fehlendePflichtfelder({ ...basis, name: "   " }), ["Name"]);
  });
});

describe("anliegenLeer", () => {
  test("ein gefülltes Feld reicht", () => {
    assert.equal(anliegenLeer(basis.anliegen), false);
  });

  test("durchgehend leer wird erkannt", () => {
    assert.equal(
      anliegenLeer({
        material: null,
        anfertigung: null,
        reparatur: null,
        produkt: null,
        infos: null,
      }),
      true,
    );
  });

  test("nur Leerzeichen ist auch leer", () => {
    assert.equal(
      anliegenLeer({
        material: " ",
        anfertigung: "",
        reparatur: null,
        produkt: null,
        infos: null,
      }),
      true,
    );
  });
});

describe("datumHeute", () => {
  test("liefert das österreichische Tagesformat", () => {
    assert.equal(datumHeute(new Date(2026, 8, 20)), "20.09.2026");
  });
});
