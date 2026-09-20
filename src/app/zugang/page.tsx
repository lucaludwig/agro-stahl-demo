"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Zugangsseite der Demo. Ein Feld, ein Knopf.
 *
 * Bewusst ohne Shell (keine Navigation, kein Chat-Widget): wer hier steht, ist
 * noch nicht drin, und eine Nav mit toten Links liest als Fehler.
 */
export default function ZugangPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  // Nur einen Pfad zulassen, nie eine fremde URL: sonst ist die Demo eine
  // offene Weiterleitung.
  const rohZiel = params.get("weiter") ?? "/klassik";
  const ziel = rohZiel.startsWith("/") && !rohZiel.startsWith("//") ? rohZiel : "/klassik";

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const res = await fetch("/api/zugang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwort }),
      });
      if (!res.ok) {
        const daten = (await res.json().catch(() => ({}))) as { error?: string };
        setFehler(daten.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }
      router.push(ziel);
      router.refresh();
    } catch {
      setFehler("Keine Verbindung. Bitte nochmal versuchen.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-900 px-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--navy)] text-sm font-bold text-white">
            B
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Bauer GmbH</p>
            <p className="text-xs text-[var(--gray)]">werkflow Demo</p>
          </div>
        </div>

        <h1 className="text-lg font-bold text-[var(--text)]">Zugang zur Demo</h1>
        <p className="mt-1 text-xs text-[var(--gray)]">
          Diese Demo zeigt einen erfundenen Installationsbetrieb mit erfundenen Daten.
        </p>

        <form onSubmit={absenden} className="mt-5 flex flex-col gap-3">
          <label className="block text-xs font-medium text-[var(--text)]">
            Passwort
            <input
              type="password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              autoFocus
              autoComplete="current-password"
              aria-invalid={fehler ? true : undefined}
              aria-describedby={fehler ? "zugang-fehler" : undefined}
              /* text-base: unter 16px zoomt iOS beim Fokus in die Seite und bleibt verzoomt */
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-base outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[rgba(0,120,212,0.2)]"
            />
          </label>

          {fehler && (
            <p id="zugang-fehler" role="alert" className="text-xs font-medium text-[var(--red)]">
              {fehler}
            </p>
          )}

          <button
            type="submit"
            disabled={laeuft || !passwort}
            className="min-h-[44px] rounded-lg bg-[var(--blue)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {laeuft ? "Prüfe …" : "Demo öffnen"}
          </button>
        </form>
      </div>
    </div>
  );
}
