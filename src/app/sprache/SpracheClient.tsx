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
import { signOut } from "next-auth/react";
import { audioDateiname } from "@/lib/audio";
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

const ROLLEN_TITEL: Record<string, string> = {
  GF: "Geschäftsführung",
  BUERO: "Büro",
  WERKSTATT: "Werkstatt",
};

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

export default function SpracheClient({
  name,
  rolle,
  darfAufnehmen,
}: {
  name: string;
  rolle: string;
  darfAufnehmen: boolean;
}) {
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
    formData.append("audio", audio, audioDateiname(audio.type));

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
    <div className="min-h-dvh bg-[#f6f8fa]">
      <header className="border-b border-[#dce3e9] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div>
            <p className="text-[15px] font-bold tracking-[0.06em] text-[#0d2d50]">
              AGRO-STAHL
            </p>
            <p className="text-xs text-[#526375]">Agrartechnik & Stahlbau GmbH</p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="min-w-0 text-right leading-tight">
              <p className="truncate text-sm font-medium text-[#18324d]">{name}</p>
              <p className="mt-0.5 text-xs text-[#526375]">
                {ROLLEN_TITEL[rolle] ?? rolle}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="rounded-md border border-[#cbd5df] px-3 py-2 text-sm font-medium text-[#18324d] transition-colors hover:bg-[#f3f6f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d2d50]"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-8 sm:pt-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0d2d50] sm:text-3xl">
            Kundenanfrage erfassen
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#526375]">
            Sprechen Sie Ihre Notiz ein. Die Angaben werden anschließend als
            Anfrageformular aufbereitet.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Links: Aufnahme */}
          <section className="rounded-xl border border-[#dce3e9] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#0d2d50]">Aufnahme</h2>
            <p className="mt-1 text-sm text-[#526375]">
              Kunde, Anliegen, Termin und gegebenenfalls Preis nennen.
            </p>

            <div className="my-6 flex min-h-36 flex-col items-start justify-center gap-4 border-y border-[#e7ebef] py-6 sm:flex-row sm:items-center sm:justify-start">
              <button
                onClick={phase === "aufnahme" ? aufnahmeBeenden : aufnahmeStarten}
                disabled={laeuft || !darfAufnehmen}
                className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d2d50] disabled:cursor-not-allowed disabled:opacity-50 ${
                  phase === "aufnahme"
                    ? "bg-[#a83333] hover:bg-[#8d2929]"
                    : "bg-[#0d2d50] hover:bg-[#174470]"
                }`}
              >
                {phase === "aufnahme" ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <rect x="5" y="5" width="14" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                    <rect x="9" y="3" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" />
                  </svg>
                )}
                {phase === "aufnahme" ? "Aufnahme beenden" : "Aufnahme starten"}
              </button>

              <div role="status" aria-live="polite" className="min-h-6 text-sm">
                {phase === "aufnahme" && (
                  <div className="flex items-center gap-2 font-medium text-[#9b2c2c]">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#a83333]" />
                    Nimmt auf · {String(Math.floor(sekunden / 60)).padStart(2, "0")}
                    :{String(sekunden % 60).padStart(2, "0")}
                  </div>
                )}
                {phase === "transkribiert" && (
                  <span className="text-[#526375]">
                    Spracherkennung läuft …
                  </span>
                )}
                {phase === "wertet_aus" && (
                  <span className="text-[#526375]">
                    Formular wird gefüllt …
                  </span>
                )}
                {phase === "bereit" && (
                  <span className="text-[#526375]">
                    {darfAufnehmen
                      ? "Bereit für Ihre Sprachnachricht."
                      : "Für neue Anfragen fehlt die Berechtigung."}
                  </span>
                )}
                {phase === "fertig" && (
                  <span className="text-[#526375]">
                    Formular bereit. Für die nächste Anfrage erneut aufnehmen.
                  </span>
                )}
              </div>
            </div>

            {fehler && (
              <p role="alert" className="mt-4 rounded-lg border border-[#e8c4c4] bg-[#fbeaea] px-4 py-3 text-sm text-[#9b2c2c]">
                {fehler}
              </p>
            )}

            {transkript && (
              <div className="mt-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#526375]">
                  Erkanntes Transkript
                </h3>
                <p className="text-[15px] leading-relaxed text-[#18324d]">
                  {transkript}
                </p>
              </div>
            )}

            <p className="mt-6 text-xs leading-relaxed text-[#526375]">
              Die Audioaufnahme wird auf dem werkflow-Server verarbeitet, nicht
              an Drittanbieter weitergegeben und nicht gespeichert.
            </p>
          </section>

          {/* Rechts: Formular */}
          <section className="rounded-xl border border-[#dce3e9] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#0d2d50]">Anfrageformular</h2>
            <p className="mt-1 text-sm text-[#526375]">
              {anfrage
                ? "Automatisch ausgefüllt; nicht genannte Angaben bleiben leer."
                : "Wird nach der Aufnahme automatisch ausgefüllt."}
            </p>

            {!anfrage && (
              <div className="mt-6 border-t border-[#e7ebef] pt-8">
                <p className="text-sm font-medium text-[#18324d]">Noch keine Anfrage erfasst</p>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-[#526375]">
                  Starten Sie eine Aufnahme. Die erkannten Angaben erscheinen anschließend hier.
                </p>
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
                    <span className="rounded-md bg-[#fdf3e3] px-2.5 py-1 text-xs font-bold text-[#80540b]">
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

                <h3 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-[#526375]">
                  Anliegen
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

                <h3 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-[#526375]">
                  Termin und Zuständigkeit
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
      </main>
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
    <div className="flex items-baseline justify-between gap-4 border-b border-[#e7ebef] py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-[#526375]">{label}</span>
      {wert ? (
        <span className="text-right text-[15px] font-medium text-[#18324d]">
          {wert}
          {automatisch && (
            <span className="ml-1.5 text-xs font-normal text-[#526375]">
              automatisch
            </span>
          )}
          {unsicher && (
            <span className="ml-1.5 text-xs font-normal text-[#80540b]">
              undeutlich
            </span>
          )}
        </span>
      ) : (
        <span className="text-right text-sm text-[#627285]">
          nicht genannt
        </span>
      )}
    </div>
  );
}
