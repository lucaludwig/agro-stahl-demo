import assert from "node:assert/strict";
import { test } from "node:test";
import { audioDateiname } from "./audio.ts";

test("der Audiodateiname entspricht dem Aufnahmeformat", () => {
  assert.equal(audioDateiname("audio/mp4;codecs=mp4a.40.2"), "aufnahme.mp4");
  assert.equal(audioDateiname("audio/ogg;codecs=opus"), "aufnahme.ogg");
  assert.equal(audioDateiname("audio/webm;codecs=opus"), "aufnahme.webm");
  assert.equal(audioDateiname(""), "aufnahme.webm");
});
