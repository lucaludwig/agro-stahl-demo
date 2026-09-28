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
import Image from "next/image";
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
    <div className="agro-ui min-h-dvh bg-[var(--agro-canvas)]">
      <header className="bg-[var(--agro-navy)] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Image
            src="/agro-stahl-logo.png"
            alt="AGRO-STAHL"
            width={196}
            height={50}
            priority
            unoptimized
            className="h-auto w-40 sm:w-49"
          />
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden min-w-0 text-right leading-tight sm:block">
              <p className="truncate text-sm font-medium text-white">{name}</p>
              <p className="mt-0.5 text-xs text-[#c4cdd5]">
                {ROLLEN_TITEL[rolle] ?? rolle}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="rounded-md border border-white/35 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--agro-yellow)]"
            >
              Abmelden
            </button>
          </div>
        </div>
        <div className="border-t border-white/15 px-4 py-2 text-xs text-[#c4cdd5] sm:hidden">
          {name} · {ROLLEN_TITEL[rolle] ?? rolle}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-8 sm:pt-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--agro-navy)] sm:text-3xl">
            Kundenanfrage erfassen
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--agro-muted)]">
            Sprechen Sie die Kundenanfrage ein. Die Angaben werden anschließend
            in das Formular übertragen.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Links: Aufnahme */}
          <section className="rounded-xl border border-[var(--agro-line)] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--agro-navy)]">Aufnahme</h2>
            <p className="mt-1 text-sm text-[var(--agro-muted)]">
              Nennen Sie Kunde, Anliegen, Termin und gegebenenfalls Preis.
            </p>

            <div className="my-6 flex min-h-36 flex-col items-start justify-center gap-4 border-y border-[var(--agro-line)] py-6 sm:flex-row sm:items-center sm:justify-start">
              <button
                onClick={phase === "aufnahme" ? aufnahmeBeenden : aufnahmeStarten}
                disabled={laeuft || !darfAufnehmen}
                className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--agro-navy)] disabled:cursor-not-allowed disabled:opacity-50 ${
                  phase === "aufnahme"
                    ? "bg-[#a83333] text-white hover:bg-[#8d2929]"
                    : "bg-[var(--agro-yellow)] text-[var(--agro-navy)] hover:bg-[#eab400]"
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
                  <span className="text-[var(--agro-muted)]">
                    Spracherkennung läuft …
                  </span>
                )}
                {phase === "wertet_aus" && (
                  <span className="text-[var(--agro-muted)]">
                    Formular wird gefüllt …
                  </span>
                )}
                {phase === "bereit" && (
                  <span className="text-[var(--agro-muted)]">
                    {darfAufnehmen
                      ? "Bereit für Ihre Sprachnachricht."
                      : "Für neue Anfragen fehlt die Berechtigung."}
                  </span>
                )}
                {phase === "fertig" && (
                  <span className="text-[var(--agro-muted)]">
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
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--agro-muted)]">
                  Erkanntes Transkript
                </h3>
                <p className="text-[15px] leading-relaxed text-[var(--agro-navy)]">
                  {transkript}
                </p>
              </div>
            )}

          </section>

          {/* Rechts: Formular */}
          <section className="rounded-xl border border-[var(--agro-line)] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--agro-navy)]">Anfrageformular</h2>
            <p className="mt-1 text-sm text-[var(--agro-muted)]">
              {anfrage
                ? "Automatisch ausgefüllt; nicht genannte Angaben bleiben leer."
                : "Wird nach der Aufnahme automatisch ausgefüllt."}
            </p>

            {!anfrage && (
              <div className="mt-6 border-t border-[var(--agro-line)] pt-4">
                {[
                  "Datum der Anfrage",
                  "Name",
                  "Kunde",
                  "Anliegen",
                  "Fertig bis",
                ].map((label) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-[var(--agro-line)] py-3 last:border-b-0">
                    <span className="text-sm text-[var(--agro-muted)]">{label}</span>
                    <span aria-hidden="true" className="text-[var(--agro-line)]">—</span>
                  </div>
                ))}
              </div>
            )}

            {anfrage && (
              <>
                <div className="mb-4 mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--agro-navy)] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
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

                <h3 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--agro-muted)]">
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

                <h3 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--agro-muted)]">
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
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--agro-line)] py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-[var(--agro-muted)]">{label}</span>
      {wert ? (
        <span className="min-w-0 break-words text-right text-[15px] font-medium text-[var(--agro-navy)]">
          {wert}
          {automatisch && (
            <span className="ml-1.5 text-xs font-normal text-[var(--agro-muted)]">
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
        <span className="text-right text-sm text-[var(--agro-muted)]">
          nicht genannt
        </span>
      )}
    </div>
  );
}
