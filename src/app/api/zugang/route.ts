import { NextResponse } from "next/server";
import { COOKIE_MAX_AGE, COOKIE_NAME, passwortStimmt } from "@/lib/demo-zugang";

/**
 * Nimmt das Demo-Passwort an und setzt das Zugangs-Cookie.
 *
 * Kein Konto, keine Sitzung, kein Zähler: ein gemeinsames Passwort für die
 * Vorführung. Wer es hat, sieht die fiktiven Daten eines fiktiven Betriebs.
 */
export async function POST(request: Request) {
  const erwartet = process.env.DEMO_PASSWORT;
  if (!erwartet) {
    // Ohne gesetztes Passwort ist die Schranke aus (siehe demo-zugang.ts).
    // Dann ist auch nichts zu bestätigen.
    return NextResponse.json({ ok: true, hinweis: "Schranke ist nicht aktiv" });
  }

  let passwort = "";
  try {
    const body = (await request.json()) as { passwort?: unknown };
    passwort = typeof body.passwort === "string" ? body.passwort : "";
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!passwortStimmt(passwort, erwartet)) {
    return NextResponse.json({ error: "Passwort stimmt nicht." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
