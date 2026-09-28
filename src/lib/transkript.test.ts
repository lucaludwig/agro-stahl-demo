import assert from "node:assert/strict";
import { test } from "node:test";
import { normalisiereFachwoerter } from "./transkript.ts";

test("das konkrete ASR-Fehlwort wird zu Stahlblech", () => {
  assert.equal(
    normalisiereFachwoerter("Aus fünf Millimeter Streibblech eine Halterung."),
    "Aus fünf Millimeter Stahlblech eine Halterung.",
  );
});

test("echte andere Bleche und Kundennamen bleiben unverändert", () => {
  assert.equal(
    normalisiereFachwoerter("Streifenblech, Streckblech und Herr Streibblecher"),
    "Streifenblech, Streckblech und Herr Streibblecher",
  );
});
