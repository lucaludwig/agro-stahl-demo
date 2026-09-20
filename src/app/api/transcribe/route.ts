const WHISPER_URL = "https://lugar.werkflow.at/whisper/asr";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return Response.json({ error: "Keine Audiodatei" }, { status: 400 });
  }

  const body = new FormData();
  body.append("audio_file", audio, "recording.webm");

  const res = await fetch(
    `${WHISPER_URL}?task=transcribe&language=de&output=json`,
    { method: "POST", body }
  );

  if (!res.ok) {
    return Response.json(
      { error: "Transkription fehlgeschlagen" },
      { status: 502 }
    );
  }

  const data = await res.json();
  return Response.json({ text: data.text ?? "" });
}
