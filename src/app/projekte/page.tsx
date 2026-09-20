"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppState, todayStr, MONTEURE, type Projekt } from "@/lib/store";
import { projektKennzahlen, type Ampel } from "@/lib/projekt-kennzahlen";

/**
 * Projektbuchung, abgespeckte Fassung des Chamelion-Moduls.
 *
 * Chamelion kann mehr (Leistungskatalog, Regieleistungen, Rollen, Korrektur-Audit) und
 * ist deshalb an manchen Stellen unübersichtlich. Hier bleibt nur der Kern, an dem der
 * Nutzen hängt: kalkulierte Stunden gegen gebuchte Stunden, je Projekt, mit Ampel und
 * einem Formular, das eine Buchung in vier Feldern anlegt.
 *
 * Bewusst NICHT drin: Rollen (die Demo hat einen Nutzer), Material und Preise pro Zeile
 * (das zeigt schon das Lieferschein-Modul), Stornologik, Monatsabschluss.
 */

const AMPEL = {
  gruen: { label: "im Plan", chip: "bg-[rgba(16,124,16,0.12)] text-[#107c10]", bar: "#107c10" },
  gelb: { label: "knapp", chip: "bg-[rgba(240,160,20,0.14)] text-[#8a5a00]", bar: "#e8a317" },
  rot: { label: "über Budget", chip: "bg-[rgba(209,52,56,0.12)] text-[#d13438]", bar: "#d13438" },
} as const;

const stunden = (n: number) => `${n.toLocaleString("de-AT", { maximumFractionDigits: 1 })} h`;
const euro = (n: number) =>
  n.toLocaleString("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

interface Zeile {
  projekt: Projekt;
  gebucht: number;
  quote: number;
  ampel: Ampel;
  restStunden: number;
  mehrkosten: number;
}

export default function ProjektePage() {
  const { projekte, buchungen, addBuchung, deleteBuchung, setProjektStatus } = useAppState();
  const [offen, setOffen] = useState<string | null>(null);
  const [form, setForm] = useState({ mitarbeiter: MONTEURE[0], stunden: "", taetigkeit: "" });
  const [zeigeAbgeschlossene, setZeigeAbgeschlossene] = useState(false);

  const zeilen: Zeile[] = useMemo(() => {
    return projekte
      .filter((p) => zeigeAbgeschlossene || p.status === "laufend")
      .map((projekt) => ({ projekt, ...projektKennzahlen(projekt, buchungen) }))
      .sort((a, b) => b.quote - a.quote);
  }, [projekte, buchungen, zeigeAbgeschlossene]);

  const ueberBudget = zeilen.filter((z) => z.ampel === "rot" && z.projekt.status === "laufend");

  function buchen(projekt: Projekt) {
    const h = Number(form.stunden.replace(",", "."));
    if (!Number.isFinite(h) || h <= 0) {
      toast.error("Stunden bitte als Zahl größer 0 eintragen.");
      return;
    }
    if (!form.taetigkeit.trim()) {
      toast.error("Was wurde gemacht? Die Tätigkeit fehlt.");
      return;
    }
    addBuchung({
      projektId: projekt.id,
      mitarbeiter: form.mitarbeiter,
      datum: todayStr(),
      stunden: h,
      taetigkeit: form.taetigkeit.trim(),
    });
    toast.success(`${stunden(h)} auf ${projekt.nr} gebucht`);
    setForm({ mitarbeiter: form.mitarbeiter, stunden: "", taetigkeit: "" });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] sm:text-2xl">Projekte</h1>
          <p className="mt-0.5 text-xs text-[var(--gray)] sm:text-sm">
            Kalkulierte gegen gebuchte Stunden. Buchen geht direkt von der Baustelle.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--gray)]">
          <input
            type="checkbox"
            checked={zeigeAbgeschlossene}
            onChange={(e) => setZeigeAbgeschlossene(e.target.checked)}
            className="h-4 w-4"
          />
          Abgeschlossene zeigen
        </label>
      </div>

      {/* Der Grund, warum es das Modul gibt: was läuft aus dem Ruder? */}
      {ueberBudget.length > 0 && (
        <div className="mb-4 rounded-[var(--radius)] border-2 border-[rgba(209,52,56,0.3)] bg-[rgba(209,52,56,0.06)] p-3 sm:p-4">
          <p className="text-sm font-semibold text-[#d13438]">
            {ueberBudget.length === 1
              ? "1 Projekt liegt über der Kalkulation"
              : `${ueberBudget.length} Projekte liegen über der Kalkulation`}
          </p>
          <p className="mt-0.5 text-xs text-[#d13438]">
            {ueberBudget
              .map((z) => `${z.projekt.nr}: ${stunden(Math.abs(z.restStunden))} darüber`)
              .join(" · ")}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {zeilen.map((z) => {
          const a = AMPEL[z.ampel];
          const istOffen = offen === z.projekt.id;
          const projektBuchungen = buchungen
            .filter((b) => b.projektId === z.projekt.id)
            .slice(0, istOffen ? 50 : 0);
          return (
            <div
              key={z.projekt.id}
              className="rounded-[var(--radius)] border border-[var(--line)] bg-white shadow-[var(--shadow)]"
            >
              <div className="p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--gray)]">{z.projekt.nr}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.chip}`}>
                        {a.label}
                      </span>
                      {z.projekt.status === "abgeschlossen" && (
                        <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[11px] font-semibold text-[var(--gray)]">
                          abgeschlossen
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 text-sm font-semibold text-[var(--text)] sm:text-base">
                      {z.projekt.name}
                    </h2>
                    <p className="text-xs text-[var(--gray)]">{z.projekt.kunde}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-[var(--text)]">
                      {stunden(z.gebucht)} <span className="font-normal text-[var(--gray)]">von {stunden(z.projekt.budgetStunden)}</span>
                    </p>
                    <p className="text-[11px] tabular-nums text-[var(--gray)]">
                      {z.restStunden >= 0
                        ? `${stunden(z.restStunden)} übrig`
                        : `${stunden(Math.abs(z.restStunden))} darüber · ${euro(z.mehrkosten)} nicht kalkuliert`}
                    </p>
                  </div>
                </div>

                {/* Balken: über 100 % wird auf 100 gekappt, die Zahl daneben sagt die Wahrheit */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#eef2f6]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(z.quote * 100, 100)}%`, background: a.bar }}
                  />
                </div>
                <p className="mt-1 text-[11px] tabular-nums text-[var(--gray)]">
                  {Math.round(z.quote * 100)} % der kalkulierten Stunden
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setOffen(istOffen ? null : z.projekt.id)}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--light)] focus-ring"
                  >
                    {istOffen ? "Zuklappen" : "Buchen & Verlauf"}
                  </button>
                  <button
                    onClick={() =>
                      setProjektStatus(
                        z.projekt.id,
                        z.projekt.status === "laufend" ? "abgeschlossen" : "laufend",
                      )
                    }
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--gray)] transition-colors hover:bg-[var(--light)] focus-ring"
                  >
                    {z.projekt.status === "laufend" ? "Abschließen" : "Wieder eröffnen"}
                  </button>
                </div>
              </div>

              {istOffen && (
                <div className="border-t border-[var(--line)] bg-[var(--bg)] p-3 sm:p-4">
                  {z.projekt.status === "laufend" && (
                    <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_2fr_auto]">
                      <select
                        value={form.mitarbeiter}
                        onChange={(e) => setForm({ ...form, mitarbeiter: e.target.value })}
                        aria-label="Mitarbeiter"
                        className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-base sm:text-sm"
                      >
                        {MONTEURE.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <input
                        value={form.stunden}
                        onChange={(e) => setForm({ ...form, stunden: e.target.value })}
                        inputMode="decimal"
                        placeholder="Std."
                        aria-label="Stunden"
                        className="w-full rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-base sm:w-20 sm:text-sm"
                      />
                      <input
                        value={form.taetigkeit}
                        onChange={(e) => setForm({ ...form, taetigkeit: e.target.value })}
                        placeholder="Was wurde gemacht?"
                        aria-label="Tätigkeit"
                        className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-base sm:text-sm"
                      />
                      <button
                        onClick={() => buchen(z.projekt)}
                        className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-ring"
                      >
                        Buchen
                      </button>
                    </div>
                  )}

                  {projektBuchungen.length === 0 ? (
                    <p className="text-xs text-[var(--gray)]">Noch keine Stunden gebucht.</p>
                  ) : (
                    <ul className="divide-y divide-[var(--line)]">
                      {projektBuchungen.map((b) => (
                        <li key={b.id} className="flex items-baseline gap-3 py-2">
                          <span className="w-20 shrink-0 text-[11px] tabular-nums text-[var(--gray)]">
                            {b.datum}
                          </span>
                          <span className="w-14 shrink-0 text-xs font-semibold tabular-nums text-[var(--text)]">
                            {stunden(b.stunden)}
                          </span>
                          <span className="min-w-0 flex-1 text-xs text-[var(--text)]">
                            {b.taetigkeit}
                            <span className="text-[var(--gray)]"> · {b.mitarbeiter}</span>
                          </span>
                          <button
                            onClick={() => deleteBuchung(b.id)}
                            aria-label={`Buchung vom ${b.datum} löschen`}
                            className="shrink-0 text-[11px] text-[var(--gray)] hover:text-[#d13438] focus-ring"
                          >
                            Löschen
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {zeilen.length === 0 && (
        <p className="rounded-[var(--radius)] border border-[var(--line)] bg-white p-6 text-center text-sm text-[var(--gray)]">
          Keine laufenden Projekte.
        </p>
      )}
    </div>
  );
}
