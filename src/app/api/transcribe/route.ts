/**
 * Sprachnachricht -> Text, über den selbst gehosteten Whisper.
 *
 * Der Dienst läuft als Container auf dem werkflow-Prod-Server und hört dort nur
 * auf 127.0.0.1. Nach außen führt genau ein Weg: der Host demo-lugar.werkflow.at
 * mit Pfad /asr und einem Bearer-Token — ohne Token antwortet der Host 410.
 * Kein Google, kein OpenAI: das Audio verlässt unsere Infrastruktur nicht.
 *
 * Der frühere Pfad lugar.werkflow.at/whisper/asr ist tot — er landet in der
 * Login-Middleware der Lugar-App und liefert die Anmeldeseite statt eines
 * Transkripts, mit HTTP 200. Ein Aufrufer, der nur den Status prüft, hält das
 * für einen Erfolg.
 */

const WHISPER_URL = process.env.WHISPER_URL;
const WHISPER_TOKEN = process.env.WHISPER_TOKEN;

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!WHISPER_URL || !WHISPER_TOKEN) {
    return Response.json(
      { error: "Spracherkennung ist auf diesem Deployment nicht konfiguriert." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return Response.json({ error: "Keine Audiodatei" }, { status: 400 });
  }
  if (audio.size === 0) {
    return Response.json(
      { error: "Die Aufnahme ist leer. Bitte noch einmal sprechen." },
      { status: 400 },
    );
  }

  const body = new FormData();
  body.append("audio_file", audio, "aufnahme.webm");

  let res: Response;
  try {
    res = await fetch(
      `${WHISPER_URL}?task=transcribe&language=de&output=json`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${WHISPER_TOKEN}` },
        body,
        // Ohne das folgt fetch einen Redirect und liefert am Ende die
        // Anmeldeseite eines fremden Dienstes mit Status 200. Lieber ein
        // sichtbarer Fehler als ein stiller Login-HTML-Body als "Transkript".
        redirect: "error",
      },
    );
  } catch {
    return Response.json(
      { error: "Spracherkennung nicht erreichbar." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return Response.json(
      { error: `Transkription fehlgeschlagen (${res.status}).` },
      { status: 502 },
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return Response.json(
      { error: "Spracherkennung lieferte keine verwertbare Antwort." },
      { status: 502 },
    );
  }

  const text =
    typeof data === "object" && data !== null && "text" in data
      ? String((data as { text: unknown }).text ?? "").trim()
      : "";

  if (!text) {
    return Response.json(
      { error: "Es war nichts Verständliches zu hören." },
      { status: 422 },
    );
  }

  return Response.json({ text });
}
