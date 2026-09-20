import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { istOeffentlich, zugangNoetig, passwortStimmt, COOKIE_NAME } from "./demo-zugang.ts";

// Lauf: node --test src/lib/*.test.ts

describe("istOeffentlich", () => {
  test("die Zugangsseite und ihre API sind offen, sonst kommt niemand herein", () => {
    assert.equal(istOeffentlich("/zugang"), true);
    assert.equal(istOeffentlich("/api/zugang"), true);
  });

  test("die Module sind nicht offen", () => {
    for (const p of ["/", "/klassik", "/projekte", "/buchhaltung", "/lieferscheine", "/posteingang"]) {
      assert.equal(istOeffentlich(p), false, `${p} darf nicht offen sein`);
    }
  });

  test("Icons und Manifest bleiben offen, sonst zeigt die Zugangsseite kein Logo", () => {
    for (const p of ["/manifest.json", "/favicon.ico", "/icon.svg", "/apple-touch-icon.png", "/favicon-32.png"]) {
      assert.equal(istOeffentlich(p), true, `${p} muss offen sein`);
    }
  });

  test("der ServiceWorker ist offen, sonst ist die Demo nicht installierbar", () => {
    // Umgeleitet quittiert der Browser mit "script resource is behind a redirect"
    // und registriert ihn nicht. Auf Produktion gemessen, nicht vermutet.
    assert.equal(istOeffentlich("/sw.js"), true);
  });

  test("ein Pfad, der nur mit /zugang ANFÄNGT, ist nicht automatisch offen", () => {
    // Sonst öffnet /zugangsdaten-export versehentlich die ganze App.
    assert.equal(istOeffentlich("/zugangsdaten"), false);
  });
});

describe("zugangNoetig", () => {
  test("ohne Cookie auf einer geschützten Seite: ja", () => {
    assert.equal(zugangNoetig({ pfad: "/projekte", hatCookie: false, passwortGesetzt: true }), true);
  });

  test("mit Cookie: nein", () => {
    assert.equal(zugangNoetig({ pfad: "/projekte", hatCookie: true, passwortGesetzt: true }), false);
  });

  test("auf der Zugangsseite selbst: nein, sonst dreht es sich im Kreis", () => {
    assert.equal(zugangNoetig({ pfad: "/zugang", hatCookie: false, passwortGesetzt: true }), false);
  });

  // Die wichtigere Richtung: ein vergessener Env-Eintrag darf die Demo nicht
  // unbenutzbar machen. Gleiches Prinzip wie beim Turnstile in Chamelion —
  // ohne Secret ist die Prüfung inaktiv, nicht fail-closed.
  test("ohne gesetztes Passwort ist das Gate aus", () => {
    assert.equal(zugangNoetig({ pfad: "/projekte", hatCookie: false, passwortGesetzt: false }), false);
  });
});

describe("passwortStimmt", () => {
  test("gleiches Passwort passt", () => {
    assert.equal(passwortStimmt("werkflow2026", "werkflow2026"), true);
  });

  test("falsches Passwort passt nicht", () => {
    assert.equal(passwortStimmt("falsch", "werkflow2026"), false);
  });

  test("leere Eingabe passt nie, auch nicht gegen ein leeres Soll", () => {
    assert.equal(passwortStimmt("", "werkflow2026"), false);
    assert.equal(passwortStimmt("", ""), false);
  });

  test("unterschiedliche Länge wirft nicht, sondern ergibt false", () => {
    // timingSafeEqual wirft bei ungleicher Länge — ungefangen wäre das ein 500
    // auf der Login-Route und damit ein Orakel für die Passwortlänge.
    assert.equal(passwortStimmt("kurz", "vielvielvielaengerespasswort"), false);
    assert.equal(passwortStimmt("vielvielvielaengerespasswort", "kurz"), false);
  });

  test("Cookie-Name ist gesetzt", () => {
    assert.equal(typeof COOKIE_NAME, "string");
    assert.ok(COOKIE_NAME.length > 0);
  });
});
