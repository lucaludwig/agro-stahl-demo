"use client";

/**
 * Sprach-Erfassung für AGRO-STAHL — die Vorführung, um die Martina Schlögl am
 * 10.09.2026 gebeten hat: "wie das funktioniert und ob es auch funktioniert".
 *
 * Ablauf: aufnehmen -> Whisper (auf unserem Server) -> Claude füllt das
 * Anfrageformular aus Martinas Mail vom 18.09.2026.
 *
 * Die Seite zeigt absichtlich jeden Zwischenschritt, auch das Rohtranskript.
 * Wer beurteilen soll, ob ein System trägt, muss sehen können, an welcher
 * Stelle es danebenliegt.
 */

import { useRef, useState } from "react";
import {
  anliegenLeer,
  datumHeute,
  fehlendePflichtfelder,
  fertigstellungMit,
  zuweisungFuer,
  type Anfrage,
} from "@/lib/anfrage";

type Phase = "bereit" | "aufnahme" | "transkribiert" | "wertet_aus" | "fertig";

/** Obergrenze der Aufnahme. Die Route gibt der Transkription 120 s. */
const MAX_SEKUNDEN = 120;

const ANLIEGEN_FELDER: { schluessel: keyof Anfrage["anliegen"]; label: string }[] = [
  { schluessel: "material", label: "Material" },
  { schluessel: "anfertigung", label: "Anfertigung" },
  { schluessel: "reparatur", label: "Reparatur" },
  { schluessel: "produkt", label: "Produkt" },
  { schluessel: "infos", label: "Infos" },
];

/** Der Browser entscheidet, was er aufnehmen kann — Chrome webm, Safari mp4. */
function aufnahmeTyp(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const typ of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(typ)) return typ;
  }
  return undefined;
}

export default function SprachePage() {
  const [phase, setPhase] = useState<Phase>("bereit");
  const [sekunden, setSekunden] = useState(0);
  const [transkript, setTranskript] = useState("");
  const [anfrage, setAnfrage] = useState<Anfrage & { unsicher: string[] } | null>(
    null,
  );
  const [fehler, setFehler] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const teileRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function timerStoppen() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function aufnahmeStarten() {
    setFehler(null);
    setTranskript("");
    setAnfrage(null);
    setSekunden(0);

    let spur: MediaStream;
    try {
      spur = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setFehler(
        "Kein Zugriff auf das Mikrofon. Bitte im Browser erlauben und erneut versuchen.",
      );
      return;
    }

    const typ = aufnahmeTyp();
    const recorder = new MediaRecorder(spur, typ ? { mimeType: typ } : undefined);
    teileRef.current = [];

    recorder.ondataavailable = (ereignis) => {
      if (ereignis.data.size > 0) teileRef.current.push(ereignis.data);
    };

    recorder.onstop = async () => {
      // Das Mikrofon wieder freigeben, sonst bleibt die Aufnahme-Anzeige im
      // Browser-Tab stehen, auch wenn längst nichts mehr mitgeschnitten wird.
      spur.getTracks().forEach((t) => t.stop());
      timerStoppen();
      await verarbeiten(new Blob(teileRef.current, { type: typ ?? "audio/webm" }));
    };

    recorder.start();
    recorderRef.current = recorder;
    setPhase("aufnahme");
    timerRef.current = setInterval(() => {
      setSekunden((s) => {
        // Harte Obergrenze. Ohne sie läuft eine vergessene Aufnahme weiter, bis
        // das Audio so lang ist, dass die Transkription in das Zeitlimit der
        // Route läuft — in einer Vorführung sieht das aus, als sei der Dienst
        // kaputt. Eine Ansage ans Büro dauert Sekunden, keine Minuten.
        if (s + 1 >= MAX_SEKUNDEN) aufnahmeBeenden();
        return s + 1;
      });
    }, 1000);
  }

  function aufnahmeBeenden() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function verarbeiten(audio: Blob) {
    setPhase("transkribiert");

    const formData = new FormData();
    formData.append("audio", audio, "aufnahme.webm");

    let text = "";
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const daten = await res.json();
      if (!res.ok) {
        setFehler(daten.error ?? "Die Aufnahme konnte nicht übertragen werden.");
        setPhase("bereit");
        return;
      }
      text = daten.text;
    } catch {
      setFehler("Die Aufnahme konnte nicht übertragen werden.");
      setPhase("bereit");
      return;
    }

    setTranskript(text);
    setPhase("wertet_aus");

    try {
      const res = await fetch("/api/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transkript: text }),
      });
      const daten = await res.json();
      if (!res.ok) {
        // Das Transkript bleibt stehen: die halbe Strecke hat funktioniert,
        // und genau das ist die Information, die zählt, wenn es hakt.
        setFehler(daten.error ?? "Das Formular konnte nicht gefüllt werden.");
        setPhase("transkribiert");
        return;
      }
      setAnfrage(daten.anfrage);
      setPhase("fertig");
    } catch {
      setFehler("Das Formular konnte nicht gefüllt werden.");
      setPhase("transkribiert");
    }
  }

  const laeuft = phase === "transkribiert" || phase === "wertet_aus";
  const fehlt = anfrage ? fehlendePflichtfelder(anfrage) : [];
  const termin = anfrage ? fertigstellungMit(anfrage.fertigstellung) : null;
  const empfaenger = anfrage
    ? zuweisungFuer(anfrage.vorgangsart, anfrage.mitarbeiter)
    : [];

  return (
    <div className="min-h-dvh bg-[#f4f7fa] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <span className="inline-block rounded-full bg-[#e8f2fc] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0078d4]">
            Vorführung Spracherfassung
          </span>
          <h1 className="mt-3 text-2xl font-bold text-[#0d2d50] sm:text-3xl">
            AGRO-STAHL — Anfrage per Sprachnachricht
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#5b6b7c]">
            Sprechen Sie eine Anfrage so ein, wie Sie sie dem Büro sagen würden.
            Das System schreibt mit und füllt damit Ihr Anfrageformular — die
            Felder sind die aus Ihrer Mail vom 18. September.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Links: Aufnahme */}
          <section className="rounded-2xl border border-[#d7e0ea] bg-white p-6 shadow-[0_8px_24px_rgba(13,45,80,0.06)]">
            <h2 className="mb-1 text-lg font-bold text-[#0d2d50]">
              1 · Aufnehmen
            </h2>
            <p className="mb-5 text-sm text-[#8a97a6]">
              Zum Beispiel: Kunde, was zu tun ist, vereinbarter Preis, bis wann.
            </p>

            <div className="flex flex-col items-center rounded-xl bg-[#eef2f6] px-4 py-8">
              <button
                onClick={phase === "aufnahme" ? aufnahmeBeenden : aufnahmeStarten}
                disabled={laeuft}
                className={`flex h-24 w-24 items-center justify-center rounded-full text-4xl text-white transition-transform disabled:cursor-not-allowed disabled:opacity-50 ${
                  phase === "aufnahme"
                    ? "bg-[#c23b3b] hover:scale-105 active:scale-95"
                    : "bg-[#0078d4] hover:scale-105 active:scale-95"
                }`}
                aria-label={
                  phase === "aufnahme" ? "Aufnahme beenden" : "Aufnahme starten"
                }
              >
                {phase === "aufnahme" ? "◼" : "🎙"}
              </button>

              <div className="mt-4 h-6 text-center">
                {phase === "aufnahme" && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#c23b3b]">
                    <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#c23b3b]" />
                    Nimmt auf · {String(Math.floor(sekunden / 60)).padStart(2, "0")}
                    :{String(sekunden % 60).padStart(2, "0")}
                  </div>
                )}
                {phase === "transkribiert" && (
                  <span className="text-sm text-[#5b6b7c]">
                    Spracherkennung läuft …
                  </span>
                )}
                {phase === "wertet_aus" && (
                  <span className="text-sm text-[#5b6b7c]">
                    Formular wird gefüllt …
                  </span>
                )}
                {phase === "bereit" && (
                  <span className="text-sm text-[#8a97a6]">
                    Tippen Sie auf das Mikrofon
                  </span>
                )}
                {phase === "fertig" && (
                  <span className="text-sm text-[#8a97a6]">
                    Fertig — noch einmal für die nächste Anfrage
                  </span>
                )}
              </div>
            </div>

            {fehler && (
              <p className="mt-4 rounded-lg border border-[#e8c4c4] bg-[#fbeaea] px-4 py-3 text-sm text-[#c23b3b]">
                {fehler}
              </p>
            )}

            {transkript && (
              <div className="mt-5">
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#8a97a6]">
                  Wörtlich verstanden
                </h3>
                <p className="border-l-[3px] border-[#0078d4] pl-3 text-[15px] italic leading-relaxed text-[#5b6b7c]">
                  {transkript}
                </p>
              </div>
            )}

            <p className="mt-6 border-t border-[#eef1f5] pt-4 text-xs leading-relaxed text-[#97a3b0]">
              Die Aufnahme geht an einen Spracherkennungs-Dienst auf dem
              werkflow-Server in Deutschland. Sie wird nicht an Google oder einen
              anderen Anbieter weitergereicht und nicht gespeichert.
            </p>
          </section>

          {/* Rechts: Formular */}
          <section className="rounded-2xl border border-[#d7e0ea] bg-white p-6 shadow-[0_8px_24px_rgba(13,45,80,0.06)]">
            <h2 className="mb-1 text-lg font-bold text-[#0d2d50]">
              2 · Anfrageformular
            </h2>
            <p className="mb-5 text-sm text-[#8a97a6]">
              {anfrage
                ? "Automatisch gefüllt. Leere Felder wurden nicht gesagt."
                : "Wird nach der Aufnahme gefüllt."}
            </p>

            {!anfrage && (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-[#eef1f5] py-3"
                  >
                    <div className="h-3 w-24 rounded bg-[#eef2f6]" />
                    <div className="h-3 w-32 rounded bg-[#f4f7fa]" />
                  </div>
                ))}
              </div>
            )}

            {anfrage && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#0d2d50] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    {anfrage.vorgangsart === "angebot" ? "Angebot" : "Auftrag"}
                  </span>
                  {fehlt.length > 0 && (
                    <span className="rounded-md bg-[#fbeaea] px-2.5 py-1 text-xs font-bold text-[#c23b3b]">
                      {fehlt.join(" und ")} fehlt
                    </span>
                  )}
                  {anfrage.unsicher.length > 0 && (
                    <span className="rounded-md bg-[#fdf3e3] px-2.5 py-1 text-xs font-bold text-[#a8730f]">
                      Undeutlich: {anfrage.unsicher.join(", ")}
                    </span>
                  )}
                </div>

                <Zeile label="Datum der Anfrage" wert={datumHeute()} automatisch />
                <Zeile
                  label="Name"
                  wert={anfrage.name}
                  unsicher={anfrage.unsicher.includes("name")}
                />
                <Zeile
                  label="Telefonnummer"
                  wert={anfrage.telefonnummer}
                  unsicher={anfrage.unsicher.includes("telefonnummer")}
                />
                <Zeile
                  label="Kunde"
                  wert={
                    anfrage.kundentyp === "neu"
                      ? "Neukunde"
                      : anfrage.kundentyp === "bestand"
                        ? "Bestandskunde"
                        : null
                  }
                />
                {anfrage.kundentyp === "neu" && (
                  <Zeile label="Adresse" wert={anfrage.adresse} />
                )}

                <h3 className="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-[#8a97a6]">
                  Was möchte der Kunde
                </h3>
                {anliegenLeer(anfrage.anliegen) ? (
                  <p className="rounded-lg bg-[#fbeaea] px-3 py-2.5 text-sm text-[#c23b3b]">
                    Kein Anliegen erkennbar — bitte nachfragen.
                  </p>
                ) : (
                  ANLIEGEN_FELDER.map(({ schluessel, label }) => (
                    <Zeile
                      key={schluessel}
                      label={label}
                      wert={anfrage.anliegen[schluessel]}
                    />
                  ))
                )}

                <h3 className="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-[#8a97a6]">
                  Termin und Zuweisung
                </h3>
                <Zeile
                  label="Fertig bis"
                  wert={termin!.wert}
                  automatisch={termin!.istStandard}
                />
                <Zeile label="Geht an" wert={empfaenger.join(", ")} />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Eine Formularzeile. Ein nicht genanntes Feld wird als solches ausgewiesen
 * statt weggelassen — sonst fällt beim Durchsehen nicht auf, dass es fehlt.
 */
function Zeile({
  label,
  wert,
  automatisch = false,
  unsicher = false,
}: {
  label: string;
  wert: string | null;
  automatisch?: boolean;
  unsicher?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#eef1f5] py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-[#8a97a6]">{label}</span>
      {wert ? (
        <span className="text-right text-[15px] font-semibold text-[#0d2d50]">
          {wert}
          {automatisch && (
            <span className="ml-1.5 text-xs font-normal text-[#8a97a6]">
              automatisch
            </span>
          )}
          {unsicher && (
            <span className="ml-1.5 text-xs font-normal text-[#a8730f]">
              undeutlich
            </span>
          )}
        </span>
      ) : (
        <span className="text-right text-sm italic text-[#b6c2cf]">
          nicht genannt
        </span>
      )}
    </div>
  );
}
