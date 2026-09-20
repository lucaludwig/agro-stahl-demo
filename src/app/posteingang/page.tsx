"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useAppState, type Email } from "@/lib/store";

/* ---------- Kategorie-Farben für die Dots ---------- */
const CATEGORY_DOT_COLORS: Record<string, string> = {
  Kundenanfrage: "#0078d4",
  Lieferant: "#6b7a8d",
  Terminanfrage: "#d4850d",
  Reklamation: "#d13438",
  Intern: "#7c5caa",
  Newsletter: "#64748b",
};

/* ---------- Filter-Chips ---------- */
type FilterKey = "alle" | "ungelesen" | "kundenanfragen" | "lieferanten";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "ungelesen", label: "Ungelesen" },
  { key: "kundenanfragen", label: "Kundenanfragen" },
  { key: "lieferanten", label: "Lieferanten" },
];

function formatEmailDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const emailDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - emailDay.getTime()) / 86400000);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  if (diffDays === 0) return `Heute, ${hh}:${mm}`;
  if (diffDays === 1) return `Gestern, ${hh}:${mm}`;
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mo}., ${hh}:${mm}`;
}

export default function PosteingangPage() {
  const { emails, markAsRead, markAsReplied, deleteEmail, archiveEmail, unreadCount, addActivity } = useAppState();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("alle");
  const [replyMode, setReplyMode] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [aiDraftTexts, setAiDraftTexts] = useState<Record<string, string>>({});

  const visibleEmails = useMemo(() => emails.filter((e) => !e.archived), [emails]);
  const visibleCount = visibleEmails.length;

  const filtered = useMemo(() => {
    let result = visibleEmails;

    // Textsuche
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.fromName.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.label.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q)
      );
    }

    // Filter-Chips
    switch (activeFilter) {
      case "ungelesen":
        result = result.filter((e) => e.unread);
        break;
      case "kundenanfragen":
        result = result.filter((e) => e.label === "Kundenanfrage");
        break;
      case "lieferanten":
        result = result.filter((e) => e.label === "Lieferant");
        break;
    }

    // Beantwortete ans Ende sortieren
    return [...result].sort((a, b) => {
      if (a.replied && !b.replied) return 1;
      if (!a.replied && b.replied) return -1;
      return 0;
    });
  }, [search, visibleEmails, activeFilter]);

  const selected: Email | null = selectedId !== null ? emails.find((e) => e.id === selectedId) ?? null : null;

  const selectEmail = useCallback((id: string) => {
    setSelectedId(id);
    markAsRead(id);
    setReplyMode(null);
    setReplyText("");
  }, [markAsRead]);

  const handleSendAiDraft = useCallback((id: string) => {
    markAsReplied(id);
    toast.success("Antwort gesendet");
    setReplyMode(null);
    setReplyText("");
  }, [markAsReplied]);

  const handleReply = useCallback((email: Email) => {
    setReplyMode(email.id);
    setReplyText(email.aiDraft ?? "");
  }, []);

  const handleSendReply = useCallback((id: string) => {
    if (!replyText.trim()) {
      toast.error("Bitte Text eingeben");
      return;
    }
    markAsReplied(id);
    toast.success("Antwort gesendet");
    setReplyMode(null);
    setReplyText("");
  }, [replyText, markAsReplied]);

  const handleForward = useCallback(() => {
    if (selected) {
      addActivity({
        text: "E-Mail weitergeleitet",
        detail: selected.fromName,
        time: `Heute, ${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
        icon: "📧",
      });
    }
    toast("E-Mail weitergeleitet");
  }, [selected, addActivity]);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm("Wirklich löschen?")) return;
    deleteEmail(id);
    setSelectedId(null);
    toast.success("E-Mail gelöscht");
  }, [deleteEmail]);

  const handleArchive = useCallback((id: string) => {
    archiveEmail(id);
    setSelectedId(null);
    toast.success("E-Mail archiviert");
  }, [archiveEmail]);

  // Aktueller AI-Draft Text (editierbar)
  const getAiDraftText = useCallback((email: Email): string => {
    if (aiDraftTexts[email.id] !== undefined) return aiDraftTexts[email.id];
    return email.aiDraft ?? "";
  }, [aiDraftTexts]);

  const setAiDraftText = useCallback((id: string, text: string) => {
    setAiDraftTexts((prev) => ({ ...prev, [id]: text }));
  }, []);

  const showAiDraft = selected !== null && selected.aiDraft !== null && !selected.replied && replyMode !== selected.id;

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-7">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[var(--navy)]">Posteingang</h1>
          <p className="mt-1 text-sm text-[var(--gray)]">
            {unreadCount} ungelesen | {visibleCount} gesamt
          </p>
        </div>

        {/* Suche */}
        <div className="mb-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--blue)] shadow-[var(--shadow)]"
          />
        </div>

        {/* Filter-Chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${
                activeFilter === chip.key
                  ? "bg-[var(--blue)] text-white shadow-sm"
                  : "bg-[#eef2f6] text-[var(--gray)] hover:bg-[var(--line)]"
              }`}
            >
              {chip.label}
              {chip.key === "ungelesen" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Email-Liste */}
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)] lg:col-span-2">
            <div className="flex items-center justify-between bg-[var(--navy)] px-5 py-3.5">
              <span className="text-sm font-semibold text-white">Eingang</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              {filtered.map((email) => {
                const isUnread = email.unread;
                const dotColor = CATEGORY_DOT_COLORS[email.label] ?? "#64748b";

                return (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => selectEmail(email.id)}
                    className={`relative flex w-full items-start gap-3 border-b border-[var(--bg)] px-4 py-3.5 text-left transition-colors last:border-b-0 ${
                      selectedId === email.id ? "bg-[rgba(0,120,212,0.06)]" : "hover:bg-[var(--bg)]"
                    } ${isUnread ? "border-l-[3px] border-l-[#0078d4]" : "border-l-[3px] border-l-transparent"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`truncate text-sm ${isUnread ? "font-bold text-[var(--navy)]" : "font-medium text-[var(--navy)]"}`}>
                          {email.fromName}
                        </span>
                        {email.urgent && !email.replied && (
                          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--red)]" />
                        )}
                        {email.replied && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(16,124,16,0.1)] px-1.5 py-0.5 text-[9px] font-bold text-[#107c10]">
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Beantwortet
                          </span>
                        )}
                      </div>
                      <div className={`truncate text-xs ${isUnread ? "font-semibold text-[var(--text)]" : "text-[var(--text)]"}`}>
                        {email.subject}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[var(--gray)]">
                        {email.preview}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {/* Kategorie-Dot mit Tooltip */}
                        <span className="group relative shrink-0">
                          <span
                            className="inline-block h-[6px] w-[6px] rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--navy)] px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                            {email.label}
                          </span>
                        </span>
                        <span className="text-[10px] text-[var(--gray)]">
                          {formatEmailDate(email.date)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-[var(--gray)]">
                  Keine Ergebnisse
                </div>
              )}
            </div>
          </div>

          {/* Detail-Ansicht */}
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)] lg:col-span-3">
            {selected ? (
              <>
                <div className="bg-[var(--navy)] px-5 py-3.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    {selected.subject}
                    {selected.replied && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                        Beantwortet
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-white/60">
                    <span>Von: {selected.fromName} &lt;{selected.from}&gt;</span>
                    <span>{formatEmailDate(selected.date)}</span>
                  </div>
                </div>

                {/* E-Mail Body in Paper-Container */}
                <div className="border-b border-[var(--line)] p-5">
                  <div className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-[#eef2f6]">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text)]">
                      {selected.body}
                    </p>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex gap-2 border-b border-[var(--line)] px-5 py-3">
                  <button
                    onClick={() => handleReply(selected)}
                    disabled={selected.replied}
                    className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition-all hover:bg-[var(--bg)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Antworten
                  </button>
                  <button
                    onClick={handleForward}
                    className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition-all hover:bg-[var(--bg)] active:scale-[0.97]"
                  >
                    Weiterleiten
                  </button>
                  <button
                    onClick={() => handleArchive(selected.id)}
                    className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition-all hover:bg-[var(--bg)] active:scale-[0.97]"
                  >
                    Archivieren
                  </button>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="rounded-lg border border-[var(--red)]/30 bg-white px-4 py-2 text-sm font-semibold text-[var(--red)] transition-all hover:bg-[rgba(209,52,56,0.06)] active:scale-[0.97]"
                  >
                    Löschen
                  </button>
                </div>

                {/* Reply Textarea */}
                {replyMode === selected.id && !selected.replied && (
                  <div className="border-b border-[var(--line)] p-5">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--gray)]">
                      Antwort verfassen
                    </div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] p-4 text-sm leading-relaxed text-[var(--text)] outline-none transition-colors focus:border-[var(--blue)]"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSendReply(selected.id)}
                        className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#006cbd] active:scale-[0.97]"
                      >
                        Senden
                      </button>
                      <button
                        onClick={() => { setReplyMode(null); setReplyText(""); }}
                        className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition-all hover:bg-[var(--bg)] active:scale-[0.97]"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}

                {/* KI-Entwurf: blue left border, KI badge, editable textarea */}
                {showAiDraft && selected.aiDraft && (
                  <div className="border-l-[3px] border-l-[#0078d4] p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-[#0078d4] text-[9px] font-bold text-white">
                        KI
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--gray)]">
                        KI-Entwurf
                      </span>
                    </div>
                    <textarea
                      value={getAiDraftText(selected)}
                      onChange={(e) => setAiDraftText(selected.id, e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-[var(--line)] bg-white p-4 text-sm leading-relaxed text-[var(--text)] outline-none transition-colors focus:border-[var(--blue)]"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSendAiDraft(selected.id)}
                        className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#006cbd] active:scale-[0.97]"
                      >
                        Senden
                      </button>
                      <button
                        onClick={() => handleReply(selected)}
                        className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition-all hover:bg-[var(--bg)] active:scale-[0.97]"
                      >
                        Bearbeiten
                      </button>
                    </div>
                  </div>
                )}

                {/* Bereits beantwortet Info */}
                {selected.replied && replyMode !== selected.id && (
                  <div className="flex items-center gap-2 px-5 py-4 text-sm text-[#107c10]">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="rgba(16,124,16,0.1)" stroke="#107c10" strokeWidth="1"/>
                      <path d="M5 8L7 10L11 6" stroke="#107c10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="font-medium">Diese E-Mail wurde beantwortet</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-[var(--gray)]">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity="0.3">
                  <rect x="4" y="7" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 10L16 18L28 10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm">E-Mail auswählen</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
