"use client";

import { useState, useMemo, useRef, useCallback, Fragment } from "react";
import { toast } from "sonner";
import { useAppState, todayStr } from "@/lib/store";

type Tab = "eingang" | "ausgang";

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    gebucht: "bg-[var(--green-light)] text-[var(--green)]",
    offen: "bg-[var(--bg)] text-[var(--gray)]",
    "überfällig": "bg-[rgba(209,52,56,0.1)] text-[var(--red)]",
    bezahlt: "bg-[var(--green-light)] text-[var(--green)]",
    entwurf: "bg-[rgba(107,122,141,0.1)] text-[var(--gray)]",
    gesendet: "bg-[rgba(0,120,212,0.1)] text-[var(--blue)]",
  };

  const labels: Record<string, string> = {
    gebucht: "Gebucht",
    offen: "Offen",
    "überfällig": "Überfällig",
    bezahlt: "Bezahlt",
    entwurf: "Entwurf",
    gesendet: "Gesendet",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${classes[status] || ""}`}
    >
      {(status === "gebucht" || status === "bezahlt") && "✓ "}
      {status === "überfällig" && "● "}
      {status === "gesendet" && "✓ "}
      {labels[status] || status}
    </span>
  );
}

function parseBetrag(betrag: string): number {
  return parseFloat(betrag.replace("€", "").replace(".", "").replace(",", ".").trim()) || 0;
}

function SummaryCard({
  label,
  count,
  sum,
  accent,
}: {
  label: string;
  count: number;
  sum: string;
  accent?: "red" | "green" | "blue";
}) {
  const accentClasses: Record<string, string> = {
    red: "border-l-[var(--red)]",
    green: "border-l-[var(--green)]",
    blue: "border-l-[var(--blue)]",
  };

  const countClasses: Record<string, string> = {
    red: "text-[var(--red)]",
    green: "text-[var(--green)]",
    blue: "text-[var(--blue)]",
  };

  return (
    <div
      className={`flex-1 rounded-xl border-l-4 bg-white px-4 py-3.5 shadow-[var(--shadow)] ${accent ? accentClasses[accent] : "border-l-[var(--blue)]"}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray)]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-xl font-bold ${accent ? countClasses[accent] : "text-[var(--navy)]"}`}>
          {count}
        </span>
        <span className="text-sm font-medium text-[var(--gray)]">{sum}</span>
      </div>
    </div>
  );
}

export default function BuchhaltungPage() {
  const {
    eingangsrechnungen,
    ausgangsrechnungen,
    addEingangsrechnung,
    updateEingangStatus,
    deleteEingangsrechnung,
    updateAusgangStatus,
    deleteAusgangsrechnung,
    addActivity,
  } = useAppState();

  const [tab, setTab] = useState<Tab>("eingang");
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = useCallback((file: File) => {
    const fileName = file.name.replace(/\.[^.]+$/, "");
    const lieferantName = fileName.length > 3 ? fileName : "Neuer Beleg";

    addEingangsrechnung({
      lieferant: lieferantName,
      betrag: "€0,00",
      datum: todayStr(),
      kategorie: "Unkategorisiert",
      status: "offen",
    });

    toast.success("Beleg erfasst, wird verarbeitet");
    setTab("eingang");
  }, [addEingangsrechnung]);

  const handleFotoUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileProcess(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleFileProcess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  }, [handleFileProcess]);

  const filteredEingang = useMemo(() => {
    if (!search.trim()) return eingangsrechnungen;
    const q = search.toLowerCase();
    return eingangsrechnungen.filter(
      (r) =>
        r.lieferant.toLowerCase().includes(q) ||
        r.kategorie.toLowerCase().includes(q) ||
        r.betrag.includes(q) ||
        r.status.includes(q)
    );
  }, [search, eingangsrechnungen]);

  const filteredAusgang = useMemo(() => {
    if (!search.trim()) return ausgangsrechnungen;
    const q = search.toLowerCase();
    return ausgangsrechnungen.filter(
      (r) =>
        r.kunde.toLowerCase().includes(q) ||
        r.nr.toLowerCase().includes(q) ||
        r.betrag.includes(q) ||
        r.status.includes(q)
    );
  }, [search, ausgangsrechnungen]);

  // Summary calculations
  const offenEingang = eingangsrechnungen.filter((r) => r.status === "offen");
  const gebuchtEingang = eingangsrechnungen.filter((r) => r.status === "gebucht");
  const ueberfaelligAusgang = ausgangsrechnungen.filter((r) => r.status === "überfällig");

  const offenCount = offenEingang.length + ausgangsrechnungen.filter((r) => r.status === "offen").length;
  const offenSum = offenEingang.reduce((s, r) => s + parseBetrag(r.betrag), 0)
    + ausgangsrechnungen.filter((r) => r.status === "offen").reduce((s, r) => s + parseBetrag(r.betrag), 0);
  const offenSumStr = `€${offenSum.toLocaleString("de-AT", { minimumFractionDigits: 0 })}`;

  const gebuchtCount = gebuchtEingang.length;
  const gebuchtSum = gebuchtEingang.reduce((s, r) => s + parseBetrag(r.betrag), 0);
  const gebuchtSumStr = `€${gebuchtSum.toLocaleString("de-AT", { minimumFractionDigits: 0 })}`;

  const ueberfaelligCount = ueberfaelligAusgang.length;
  const ueberfaelligSum = ueberfaelligAusgang.reduce((s, r) => s + parseBetrag(r.betrag), 0);
  const ueberfaelligSumStr = `€${ueberfaelligSum.toLocaleString("de-AT", { minimumFractionDigits: 0 })}`;

  // Tab info for header
  const eingangOffen = eingangsrechnungen.filter((r) => r.status === "offen").length;
  const eingangSum = `€${eingangsrechnungen.reduce((s, r) => s + parseBetrag(r.betrag), 0).toLocaleString("de-AT", { minimumFractionDigits: 2 })}`;
  const ausgangOverdue = ausgangsrechnungen.filter((r) => r.status === "überfällig").length;
  const ausgangSum = `€${ausgangsrechnungen.reduce((s, r) => s + parseBetrag(r.betrag), 0).toLocaleString("de-AT", { minimumFractionDigits: 2 })}`;

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-7">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[var(--navy)]">Buchhaltung</h1>
        </div>

        {/* Summary Bar */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SummaryCard label="Offen" count={offenCount} sum={offenSumStr} accent="blue" />
          <SummaryCard label="Gebucht diesen Monat" count={gebuchtCount} sum={gebuchtSumStr} accent="green" />
          <SummaryCard label="Überfällig" count={ueberfaelligCount} sum={ueberfaelligSumStr} accent="red" />
        </div>

        {/* Tab Row - Pill style with sliding indicator */}
        <div className="relative mb-4 flex gap-0 rounded-xl bg-white p-1 shadow-[var(--shadow)]">
          {/* Sliding indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-[var(--navy)] transition-all duration-300 ease-out"
            style={{
              width: "calc(50% - 4px)",
              left: tab === "eingang" ? "4px" : "calc(50% + 0px)",
            }}
          />
          <button
            onClick={() => setTab("eingang")}
            className={`relative z-10 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
              tab === "eingang"
                ? "text-white"
                : "text-[var(--gray)] hover:text-[var(--navy)]"
            }`}
          >
            Eingangsrechnungen
          </button>
          <button
            onClick={() => setTab("ausgang")}
            className={`relative z-10 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
              tab === "ausgang"
                ? "text-white"
                : "text-[var(--gray)] hover:text-[var(--navy)]"
            }`}
          >
            Ausgangsrechnungen
          </button>
        </div>

        {/* Suche / Filter */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--blue)] shadow-[var(--shadow)]"
          />
        </div>

        {/* Eingangsrechnungen */}
        {tab === "eingang" && (
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
            <div className="flex items-center justify-between bg-[var(--navy)] px-5 py-3.5">
              <span className="text-sm font-semibold text-white">
                Eingangsrechnungen
              </span>
              <span className="text-xs text-white/60">
                {eingangOffen} offen | {eingangSum} gesamt
              </span>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Lieferant
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Betrag
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Datum
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Kategorie
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Status
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEingang.map((row) => (
                    <Fragment key={row.id}>
                    <tr
                      className="group transition-colors hover:bg-[var(--bg)]"
                      onMouseEnter={() => setHoveredRow(row.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 font-semibold text-[var(--navy)]">
                        {row.lieferant}
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 font-medium">
                        {row.betrag}
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 text-[var(--gray)]">
                        {row.datum}
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5">
                        <span className="rounded-full bg-[var(--bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--gray)]">
                          {row.kategorie}
                        </span>
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 text-right">
                        <div
                          className={`flex justify-end gap-1.5 transition-opacity duration-150 ${
                            hoveredRow === row.id ? "opacity-100" : "opacity-0"
                          }`}
                        >
                          <button
                            onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                            className="rounded-md bg-[var(--bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--navy)] transition-colors hover:bg-[var(--line)]"
                          >
                            Ansehen
                          </button>
                          {row.status === "offen" && (
                            <button
                              onClick={() => { updateEingangStatus(row.id, "gebucht"); toast.success("Rechnung gebucht"); }}
                              className="rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#006cbd]"
                            >
                              Buchen
                            </button>
                          )}
                          <button
                            onClick={() => { if (window.confirm("Wirklich löschen?")) { deleteEingangsrechnung(row.id); toast.success("Rechnung gelöscht"); } }}
                            className="rounded-md bg-transparent px-1.5 py-1 text-[var(--gray)] transition-colors hover:text-[var(--red)]"
                            title="Löschen"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.3a1 1 0 01-1 .7H4.7a1 1 0 01-1-.7L3 4z" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 4h10M5.5 4V2.5h3V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === row.id && (
                      <tr>
                        <td colSpan={6} className="border-b border-[var(--bg)] bg-[var(--bg)] px-5 py-4">
                          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Lieferant</span><div className="mt-0.5 font-semibold text-[var(--navy)]">{row.lieferant}</div></div>
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Betrag</span><div className="mt-0.5 font-semibold text-[var(--navy)]">{row.betrag}</div></div>
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Datum</span><div className="mt-0.5 text-[var(--text)]">{row.datum}</div></div>
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Kategorie</span><div className="mt-0.5 text-[var(--text)]">{row.kategorie}</div></div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                  {filteredEingang.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--gray)]">
                        Keine Ergebnisse
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {filteredEingang.map((row) => (
                <div key={row.id} className="border-b border-[var(--bg)] px-5 py-4 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--navy)]">
                      {row.lieferant}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--gray)]">
                    <span className="font-medium text-[var(--text)]">{row.betrag}</span>
                    <span>{row.datum}</span>
                    <span>{row.kategorie}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {row.status === "offen" && (
                      <button
                        onClick={() => { updateEingangStatus(row.id, "gebucht"); toast.success("Rechnung gebucht"); }}
                        className="rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Buchen
                      </button>
                    )}
                    <button
                      onClick={() => { if (window.confirm("Wirklich löschen?")) { deleteEingangsrechnung(row.id); toast.success("Rechnung gelöscht"); } }}
                      className="rounded-md bg-transparent px-1.5 py-1 text-[var(--gray)] hover:text-[var(--red)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.3a1 1 0 01-1 .7H4.7a1 1 0 01-1-.7L3 4z" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 4h10M5.5 4V2.5h3V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ausgangsrechnungen */}
        {tab === "ausgang" && (
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
            <div className="flex items-center justify-between bg-[var(--navy)] px-5 py-3.5">
              <span className="text-sm font-semibold text-white">
                Ausgangsrechnungen
              </span>
              <span className="text-xs text-white/60">
                {ausgangOverdue} überfällig | {ausgangSum} gesamt
              </span>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Nr.
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Kunde
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Betrag
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Fällig
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Status
                    </th>
                    <th className="border-b-2 border-[var(--line)] px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAusgang.map((row) => (
                    <Fragment key={row.id}>
                    <tr
                      className={`group transition-colors ${
                        row.status === "überfällig"
                          ? "bg-[rgba(209,52,56,0.04)] hover:bg-[rgba(209,52,56,0.08)]"
                          : "hover:bg-[var(--bg)]"
                      }`}
                      onMouseEnter={() => setHoveredRow(row.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 font-mono text-xs text-[var(--gray)]">
                        {row.nr}
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 font-semibold text-[var(--navy)]">
                        {row.kunde}
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 font-medium">
                        {row.betrag}
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 text-[var(--gray)]">
                        {row.faellig}
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="border-b border-[var(--bg)] px-5 py-3.5 text-right">
                        <div
                          className={`flex justify-end gap-1.5 transition-opacity duration-150 ${
                            hoveredRow === row.id ? "opacity-100" : "opacity-0"
                          }`}
                        >
                          <button
                            onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                            className="rounded-md bg-[var(--bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--navy)] transition-colors hover:bg-[var(--line)]"
                          >
                            Ansehen
                          </button>
                          {row.status === "überfällig" ? (
                            <>
                              <button
                                onClick={() => { updateAusgangStatus(row.id, "bezahlt"); toast.success("Als bezahlt markiert"); }}
                                className="rounded-md bg-[var(--green)] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#0a6b0a]"
                              >
                                Bezahlt
                              </button>
                              <button
                                onClick={() => { addActivity({ text: "Mahnung versendet", detail: `${row.kunde} | ${row.betrag}`, time: new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }), icon: "📧" }); toast.success("Mahnung versendet"); }}
                                className="rounded-md bg-[var(--red)] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#b82d30]"
                              >
                                Mahnen
                              </button>
                            </>
                          ) : row.status === "gesendet" ? (
                            <button
                              onClick={() => { updateAusgangStatus(row.id, "bezahlt"); toast.success("Als bezahlt markiert"); }}
                              className="rounded-md bg-[var(--green)] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#0a6b0a]"
                            >
                              Bezahlt
                            </button>
                          ) : row.status === "offen" ? (
                            <>
                              <button
                                onClick={() => { updateAusgangStatus(row.id, "bezahlt"); toast.success("Als bezahlt markiert"); }}
                                className="rounded-md bg-[var(--green)] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#0a6b0a]"
                              >
                                Bezahlt
                              </button>
                              <button
                                onClick={() => { updateAusgangStatus(row.id, "gesendet"); toast.success("Rechnung gesendet"); }}
                                className="rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#006cbd]"
                              >
                                Senden
                              </button>
                            </>
                          ) : row.status === "entwurf" ? (
                            <button
                              onClick={() => { updateAusgangStatus(row.id, "offen"); toast.success("Rechnung als offen markiert"); }}
                              className="rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#006cbd]"
                            >
                              Freigeben
                            </button>
                          ) : null}
                          <button
                            onClick={() => { if (window.confirm("Wirklich löschen?")) { deleteAusgangsrechnung(row.id); toast.success("Rechnung gelöscht"); } }}
                            className="rounded-md bg-transparent px-1.5 py-1 text-[var(--gray)] transition-colors hover:text-[var(--red)]"
                            title="Löschen"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.3a1 1 0 01-1 .7H4.7a1 1 0 01-1-.7L3 4z" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 4h10M5.5 4V2.5h3V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === row.id && (
                      <tr>
                        <td colSpan={6} className="border-b border-[var(--bg)] bg-[var(--bg)] px-5 py-4">
                          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Rechnungs-Nr.</span><div className="mt-0.5 font-mono text-xs text-[var(--navy)]">{row.nr}</div></div>
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Kunde</span><div className="mt-0.5 font-semibold text-[var(--navy)]">{row.kunde}</div></div>
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Betrag</span><div className="mt-0.5 font-semibold text-[var(--navy)]">{row.betrag}</div></div>
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Fällig</span><div className="mt-0.5 text-[var(--text)]">{row.faellig}</div></div>
                            <div><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">Status</span><div className="mt-0.5"><StatusBadge status={row.status} /></div></div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                  {filteredAusgang.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--gray)]">
                        Keine Ergebnisse
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {filteredAusgang.map((row) => (
                <div
                  key={row.id}
                  className={`border-b border-[var(--bg)] px-5 py-4 last:border-b-0 ${
                    row.status === "überfällig" ? "bg-[rgba(209,52,56,0.04)]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--navy)]">
                      {row.kunde}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--gray)]">
                    <span className="font-mono">{row.nr}</span>
                    <span className="font-medium text-[var(--text)]">{row.betrag}</span>
                    <span>Fällig: {row.faellig}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {row.status === "überfällig" && (
                      <>
                        <button
                          onClick={() => { updateAusgangStatus(row.id, "bezahlt"); toast.success("Als bezahlt markiert"); }}
                          className="rounded-md bg-[var(--green)] px-2.5 py-1 text-[11px] font-medium text-white"
                        >
                          Bezahlt
                        </button>
                        <button
                          onClick={() => { addActivity({ text: "Mahnung versendet", detail: `${row.kunde} | ${row.betrag}`, time: new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }), icon: "📧" }); toast.success("Mahnung versendet"); }}
                          className="rounded-md bg-[var(--red)] px-2.5 py-1 text-[11px] font-medium text-white"
                        >
                          Mahnen
                        </button>
                      </>
                    )}
                    {row.status === "offen" && (
                      <button
                        onClick={() => { updateAusgangStatus(row.id, "bezahlt"); toast.success("Als bezahlt markiert"); }}
                        className="rounded-md bg-[var(--green)] px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Bezahlt
                      </button>
                    )}
                    {row.status === "gesendet" && (
                      <button
                        onClick={() => { updateAusgangStatus(row.id, "bezahlt"); toast.success("Als bezahlt markiert"); }}
                        className="rounded-md bg-[var(--green)] px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Bezahlt
                      </button>
                    )}
                    {row.status === "entwurf" && (
                      <button
                        onClick={() => { updateAusgangStatus(row.id, "offen"); toast.success("Rechnung als offen markiert"); }}
                        className="rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Freigeben
                      </button>
                    )}
                    <button
                      onClick={() => { if (window.confirm("Wirklich löschen?")) { deleteAusgangsrechnung(row.id); toast.success("Rechnung gelöscht"); } }}
                      className="rounded-md bg-transparent px-1.5 py-1 text-[var(--gray)] hover:text-[var(--red)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.3a1 1 0 01-1 .7H4.7a1 1 0 01-1-.7L3 4z" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 4h10M5.5 4V2.5h3V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Drop Zone */}
        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />
          <div
            onClick={handleFotoUpload}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-all ${
              isDragOver
                ? "border-[var(--blue)] bg-[rgba(0,120,212,0.04)]"
                : "border-[var(--line)] bg-white hover:border-[var(--blue)] hover:bg-[rgba(0,120,212,0.02)]"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--light)] text-2xl">
              📷
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--navy)]">
                Beleg hierher ziehen oder Foto aufnehmen
              </p>
              <p className="mt-0.5 text-xs text-[var(--gray)]">
                Belege werden automatisch erkannt und zugeordnet
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
