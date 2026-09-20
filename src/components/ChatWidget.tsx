"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WerkflowLogo } from "@/components/WerkflowLogo";

const CHAT_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["offene angebote", "nicht zurückgemeldet", "angebote"],
    response:
      "Es gibt 2 Angebote die seit über 14 Tagen offen sind:\n\n- Familie Gruber: €8.400 (22 Tage)\n- Wohnbau Steyr AG: €6.800 (17 Tage)\n\nGesamtwert: €15.200. Lohnt sich nachzufassen.",
  },
  {
    keywords: ["nicht verrechnet", "noch keine rechnung", "rechnung"],
    response:
      "3 abgeschlossene Aufträge haben noch keine Rechnung:\n\n- Montage Neuhofer: €2.800 (abgeschlossen 12.06.)\n- Umbau Krems: €1.900 (abgeschlossen 08.06.)\n- Familie Berger: €3.400 (abgeschlossen 15.06.)\n\nInsgesamt offen zur Verrechnung: €8.100",
  },
  {
    keywords: ["umsatz", "diesen monat", "juni", "monatsumsatz"],
    response:
      "Umsatz Juni 2026 (bis heute):\n\n- Abgeschlossene Aufträge: €48.200\n- Bereits verrechnet: €35.400\n- Noch offen zur Verrechnung: €12.800",
  },
  {
    keywords: ["hofmann", "auftrag hofmann", "wann"],
    response:
      "Auftrag Hofmann (A-2026-0847):\n\n- Status: In Bearbeitung\n- Geplante Fertigstellung: 02.07.2026\n- Techniker: Mario S.",
  },
  {
    keywords: ["überfällige rechnungen", "überfällig"],
    response:
      "1 Rechnung ist überfällig:\n\n- RE-2026-0089, Bauherr Hofmann: €4.200 (fällig seit 10.06.2026)\n\nEmpfehlung: Zahlungserinnerung senden.",
  },
];

/** Formatiert Euro-Beträge und Zahlen fett */
function formatBotText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match euro amounts like €8.400, €2.800,00 or standalone numbers like 14, 2026
  const regex = /(€[\d.,]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={keyIdx++} className="font-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

interface ChatMessage {
  role: "user" | "bot" | "typing";
  text: string;
}

const QUICK_ACTIONS = [
  "Offene Angebote",
  "Monatsumsatz",
  "Überfällige Rechnungen",
];

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Wie kann ich helfen?",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasPulsedRef = useRef(false);
  const [showPulse, setShowPulse] = useState(false);

  // Pulse animation on first render, one cycle only
  useEffect(() => {
    if (!hasPulsedRef.current) {
      hasPulsedRef.current = true;
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const doSend = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: "user", text };
    const typingMsg: ChatMessage = { role: "typing", text: "" };
    setMessages((prev) => [...prev, userMsg, typingMsg]);

    const lower = text.toLowerCase();
    let response: string | null = null;
    for (const r of CHAT_RESPONSES) {
      if (r.keywords.some((k) => lower.includes(k))) {
        response = r.response;
        break;
      }
    }

    if (response) {
      const finalResponse = response;
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== "typing"),
          { role: "bot", text: finalResponse },
        ]);
      }, 1200);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== "typing"),
          {
            role: "bot",
            text: "Dazu habe ich gerade keine Daten. Fragen Sie mich nach Angeboten, Rechnungen oder laufenden Aufträgen.",
          },
        ]);
      }, 1200);
    }
  }, []);

  const sendChat = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    doSend(text);
  }, [input, doSend]);

  const handleQuickAction = useCallback((text: string) => {
    setInput("");
    doSend(text);
  }, [doSend]);

  // Auf der Zugangsseite ist noch niemand angemeldet. Ein Assistent, der dort
  // Umsatzzahlen des Betriebs beantwortet, gibt genau die Daten heraus, die die
  // Schranke schützen soll. Der Hook läuft vorher, der Ausstieg erst hier —
  // ein bedingter Hook wäre ein Regelbruch.
  // /sprache aus einem anderen Grund: die Seite geht als eigenstaendige
  // Vorfuehrung an AGRO-STAHL. Ein Assistent, der zu Zahlen der erfundenen
  // Bauer GmbH antwortet, waere dort nur verwirrend.
  if (pathname === "/zugang" || pathname === "/sprache") return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--blue)] text-2xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? "Chat schließen" : "Chat öffnen"}
      >
        {showPulse && (
          <span
            className="absolute inset-0 rounded-full bg-[var(--blue)]"
            style={{
              animation: "chatPulse 1s ease-out forwards",
            }}
          />
        )}
        {open ? "✕" : "💬"}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-22 right-5 z-50 flex w-[360px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{
            height: "min(520px, calc(100dvh - 120px))",
            background: "rgba(255, 255, 255, 0.95)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <WerkflowLogo size={14} color="#ffffff" />
            </span>
            werkflow Assistent
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
            {messages.map((msg, i) => {
              if (msg.role === "typing") {
                return (
                  <div
                    key={i}
                    className="self-start rounded-xl rounded-bl-sm bg-[var(--bg)] px-4 py-3 text-sm"
                    style={{ animation: "msgIn 0.3s ease" }}
                  >
                    <div className="flex gap-1">
                      <span
                        className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--gray)]"
                        style={{ animation: "typeDot 1.2s infinite" }}
                      />
                      <span
                        className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--gray)]"
                        style={{ animation: "typeDot 1.2s infinite 0.2s" }}
                      />
                      <span
                        className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--gray)]"
                        style={{ animation: "typeDot 1.2s infinite 0.4s" }}
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "self-end rounded-br-sm bg-[var(--blue)] text-white"
                      : "self-start rounded-bl-sm bg-[var(--bg)] text-[var(--text)]"
                  }`}
                  style={{ animation: "msgIn 0.3s ease" }}
                >
                  {msg.role === "bot" ? (
                    <div className="flex gap-2">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        <WerkflowLogo size={16} color="#0078d4" />
                      </span>
                      <span className="whitespace-pre-line">
                        {formatBotText(msg.text)}
                      </span>
                    </div>
                  ) : (
                    <span className="whitespace-pre-line">{msg.text}</span>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap gap-1.5 border-t border-[var(--line)] px-3 pt-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-[var(--blue)] transition-colors hover:bg-[var(--bg)] active:scale-[0.97]"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 px-3 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
              placeholder="Frage eingeben..."
              className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--blue)]"
            />
            <button
              onClick={sendChat}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--blue)] text-white transition-colors hover:bg-[#006cbd] active:scale-[0.97]"
              aria-label="Senden"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </>
  );
}
