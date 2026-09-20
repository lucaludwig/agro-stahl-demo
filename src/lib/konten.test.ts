import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { findeKonto, kontenLesen, type Konto } from "./konten.ts";

// Die Rollenprüfung wird hier eingespeist statt importiert: roles.ts zieht den
// Auth-Baustein und damit next-auth nach, und der laeuft nicht unter
// `node --test`. Die echte Verdrahtung passiert in lib/auth.ts.
const istBekannt = (r: unknown) => r === "GF" || r === "BUERO" || r === "WERKSTATT";

const einer = JSON.stringify([
  { email: "Martina@agro-stahl.at", name: "Martina", role: "BUERO", hash: "$2b$10$x" },
]);

describe("kontenLesen", () => {
  test("liest einen vollstaendigen Eintrag", () => {
    const [k] = kontenLesen(einer, istBekannt);
    assert.equal(k.name, "Martina");
    assert.equal(k.role, "BUERO");
    assert.equal(k.active, true);
  });

  test("normalisiert die Adresse auf Kleinbuchstaben", () => {
    // Sonst scheitert die Anmeldung daran, wie jemand seine Adresse tippt.
    assert.equal(kontenLesen(einer, istBekannt)[0].email, "martina@agro-stahl.at");
  });

  test("nimmt die Adresse als Kennung, wenn keine angegeben ist", () => {
    assert.equal(kontenLesen(einer, istBekannt)[0].id, "martina@agro-stahl.at");
  });

  test("fehlende Variable ergibt eine leere Liste", () => {
    assert.deepEqual(kontenLesen(undefined, istBekannt), []);
    assert.deepEqual(kontenLesen("   ", istBekannt), []);
  });

  test("kaputtes JSON wirft nicht, sondern ergibt eine leere Liste", () => {
    assert.deepEqual(kontenLesen("{nicht json", istBekannt), []);
  });

  test("ein Objekt statt einer Liste ergibt eine leere Liste", () => {
    assert.deepEqual(kontenLesen('{"email":"a@b.at"}', istBekannt), []);
  });

  test("ein Eintrag ohne Hash faellt heraus, die uebrigen bleiben", () => {
    const roh = JSON.stringify([
      { email: "ohne@agro-stahl.at", name: "Ohne", role: "BUERO" },
      { email: "mit@agro-stahl.at", name: "Mit", role: "BUERO", hash: "$2b$10$x" },
    ]);
    const konten = kontenLesen(roh, istBekannt);
    assert.equal(konten.length, 1);
    assert.equal(konten[0].email, "mit@agro-stahl.at");
  });

  test("eine unbekannte Rolle faellt heraus", () => {
    // Ein Konto mit unbekannter Rolle haette keine Rechte, kaeme aber durch die
    // Anmeldung. Das sieht im Betrieb wie ein falsches Passwort aus.
    const roh = JSON.stringify([
      { email: "x@agro-stahl.at", name: "X", role: "ADMIN", hash: "$2b$10$x" },
    ]);
    assert.deepEqual(kontenLesen(roh, istBekannt), []);
  });

  test("active false deaktiviert, ein fehlendes Feld nicht", () => {
    const roh = JSON.stringify([
      { email: "a@agro-stahl.at", name: "A", role: "GF", hash: "$2b$10$x", active: false },
    ]);
    assert.equal(kontenLesen(roh, istBekannt)[0].active, false);
  });

  test("bei doppelter Adresse gewinnt der erste Eintrag", () => {
    // Sonst entscheidet die Reihenfolge in einer Umgebungsvariable darueber,
    // welche Rolle jemand hat.
    const roh = JSON.stringify([
      { email: "d@agro-stahl.at", name: "Erst", role: "WERKSTATT", hash: "$2b$10$x" },
      { email: "d@agro-stahl.at", name: "Dann", role: "GF", hash: "$2b$10$y" },
    ]);
    const konten = kontenLesen(roh, istBekannt);
    assert.equal(konten.length, 1);
    assert.equal(konten[0].role, "WERKSTATT");
  });

  test("Eintraege, die keine Objekte sind, fallen heraus", () => {
    assert.deepEqual(kontenLesen('["text", null, 42]', istBekannt), []);
  });
});

describe("findeKonto", () => {
  const konten: Konto[] = [
    {
      id: "1",
      email: "martina@agro-stahl.at",
      name: "Martina",
      role: "BUERO",
      hash: "$2b$10$x",
      active: true,
    },
  ];

  test("findet unabhaengig von Schreibweise und Leerzeichen", () => {
    assert.equal(findeKonto(konten, "  MARTINA@Agro-Stahl.at ")?.name, "Martina");
  });

  test("unbekannte Adresse ergibt null", () => {
    assert.equal(findeKonto(konten, "fremd@agro-stahl.at"), null);
  });

  test("leere Eingabe ergibt null", () => {
    assert.equal(findeKonto(konten, "   "), null);
  });
});
