/**
 * Erzeugt die Kontenliste für AGRO_KONTEN und die zugehörigen Passwörter.
 *
 * Die Passwörter werden nur in eine Datei geschrieben, nie auf die Ausgabe:
 * alles, was hier auf stdout landet, steht anschließend im Sitzungsprotokoll.
 *
 * Aufruf: node scripts/konten-erzeugen.mjs <ziel-konten.json> <ziel-passwoerter.txt>
 */

import { writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const [, , zielKonten, zielPasswoerter] = process.argv;
if (!zielKonten || !zielPasswoerter) {
  console.error("Zwei Zielpfade angeben.");
  process.exit(1);
}

// Funktionsadressen statt geratener persoenlicher Postfaecher: bekannt aus der
// Korrespondenz ist nur schloegl@ und info@. Eine erfundene Adresse fuer den
// Chef saehe in der Vorfuehrung aus wie eine Tatsachenbehauptung.
const PERSONEN = [
  { id: "chef", email: "chef@agro-stahl.at", name: "Thomas Stiefmaier", role: "GF" },
  { id: "schloegl", email: "schloegl@agro-stahl.at", name: "Martina Schlögl", role: "BUERO" },
  { id: "klemens", email: "klemens@agro-stahl.at", name: "Klemens", role: "BUERO" },
  { id: "werkstatt", email: "werkstatt@agro-stahl.at", name: "Werkstatt", role: "WERKSTATT" },
];

// Ohne l/1/O/0: das wird am Handy abgetippt, und eine Vorfuehrung soll nicht an
// einem verwechselten Zeichen scheitern.
const ZEICHEN = "abcdefghijkmnpqrstuvwxyz23456789";

function passwortErzeugen(laenge = 14) {
  let wort = "";
  for (let i = 0; i < laenge; i++) {
    wort += ZEICHEN[randomInt(ZEICHEN.length)];
  }
  return wort;
}

const konten = [];
const zeilen = ["AGRO-STAHL Vorfuehrung — Zugaenge", ""];

for (const person of PERSONEN) {
  const passwort = passwortErzeugen();
  const hash = bcrypt.hashSync(passwort, 12);
  konten.push({ ...person, hash, active: true });
  zeilen.push(`${person.name} (${person.role})`);
  zeilen.push(`  ${person.email}`);
  zeilen.push(`  ${passwort}`);
  zeilen.push("");
}

writeFileSync(zielKonten, JSON.stringify(konten), "utf8");
writeFileSync(zielPasswoerter, zeilen.join("\n"), "utf8");

console.log(`${konten.length} Konten geschrieben.`);
