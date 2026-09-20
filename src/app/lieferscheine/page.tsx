"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAppState, todayStr, type Lieferschein } from "@/lib/store";

interface LieferscheinData {
  taetigkeit: string;
  material: string;
  stunden: string;
  betrag: string;
  anfahrt: string;
  notiz: string;
}

const EMPTY_LS: LieferscheinData = {
  taetigkeit: "",
  material: "",
  stunden: "",
  betrag: "",
  anfahrt: "",
  notiz: "",
};

const FIELDS: { key: keyof LieferscheinData; label: string; type: "text" | "short"; placeholder: string }[] = [
  { key: "taetigkeit", label: "Tätigkeit", type: "text", placeholder: "z.B. Therme ausgetauscht" },
  { key: "material", label: "Material", type: "text", placeholder: "z.B. 2 Ventile, 1 Ausdehnungsgefäß" },
  { key: "stunden", label: "Stunden", type: "short", placeholder: "z.B. 3" },
  { key: "betrag", label: "Betrag (EUR)", type: "short", placeholder: "z.B. 420" },
  { key: "anfahrt", label: "Anfahrt", type: "short", placeholder: "Ja / Nein" },
  { key: "notiz", label: "Notiz", type: "text", placeholder: "Optional" },
];

const CALENDAR = [
  { time: "09:00", name: "Müller Josef", addr: "Spenglerstr. 4, 1100 Wien", type: "Thermenwartung" },
  { time: "11:30", name: "Wohnbau Steyr AG", addr: "Wiedner Hauptstr. 22, 1040 Wien", type: "Heizungsmontage" },
  { time: "14:00", name: "Familie Schreiber", addr: "Favoritenstr. 88, 1100 Wien", type: "Rohrbruch Notdienst" },
];

const LS_STATUS_CLASSES: Record<string, string> = {
  Erstellt: "bg-[rgba(0,120,212,0.1)] text-[#0078d4]",
  Unterschrieben: "bg-[rgba(16,124,16,0.1)] text-[#107c10]",
  Archiviert: "bg-[#eef2f6] text-[var(--gray)]",
};

function formatDynamicDate(): string {
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// Mic-Button Komponente mit MediaRecorder + Whisper API
function MicButton({
  onResult,
  disabled,
}: {
  onResult: (text: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const toggle = useCallback(async () => {
    if (recording) {
      // Stop
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    // Start
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        if (blob.size < 100) {
          toast.error("Keine Aufnahme erkannt");
          return;
        }

        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob);
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await res.json();

          if (data.text) {
            onResult(data.text.trim());
          } else {
            toast.error("Keine Sprache erkannt");
          }
        } catch {
          toast.error("Transkription fehlgeschlagen");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      // Auto-Stop nach 15 Sekunden
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setRecording(false);
        }
      }, 15000);
    } catch {
      toast.error("Mikrofon nicht verfügbar");
    }
  }, [recording, onResult]);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || transcribing}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all ${
        recording
          ? "bg-[var(--red)] text-white animate-pulse"
          : transcribing
            ? "bg-[var(--bg)] text-[var(--gray)] cursor-wait"
            : "bg-[var(--bg)] text-[var(--gray)] hover:bg-[var(--line)] hover:text-[var(--navy)] active:scale-95"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
      title={recording ? "Aufnahme stoppen" : transcribing ? "Wird transkribiert..." : "Diktieren"}
    >
      {transcribing ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--blue)]" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="5.5" y="1" width="5" height="9" rx="2.5" fill="currentColor" />
          <path d="M3 7C3 9.76 5.24 12 8 12C10.76 12 13 9.76 13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="5.5" y1="15" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export default function LieferscheinePage() {
  const { lieferscheine, addLieferschein, nextLieferscheinNr, deleteLieferschein, updateLieferscheinStatus } = useAppState();

  const [ls, setLs] = useState<LieferscheinData>(EMPTY_LS);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [completedCalEntries, setCompletedCalEntries] = useState<Set<number>>(new Set());
  const [sigVisible, setSigVisible] = useState(false);
  const [sigHasStrokes, setSigHasStrokes] = useState(false);
  const [createdNr, setCreatedNr] = useState<string | null>(null);
  const [hoveredLsRow, setHoveredLsRow] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const canSign = ls.taetigkeit.trim().length > 0;
  const selectedEntry = CALENDAR[selectedIdx];

  function updateField(key: keyof LieferscheinData, value: string) {
    setLs((prev) => ({ ...prev, [key]: value }));
  }

  // Unterschrift Canvas
  useEffect(() => {
    if (!sigVisible || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0d2d50";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.fillStyle = "#c0c8d0";
    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Hier unterschreiben", rect.width / 2, rect.height / 2);

    let firstStroke = true;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const t = "touches" in e ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawingRef.current = true;
      if (firstStroke) {
        firstStroke = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#0d2d50";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        setSigHasStrokes(true);
      }
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const onEnd = () => { drawingRef.current = false; };

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("mouseleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("mousedown", onStart);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onEnd);
      canvas.removeEventListener("mouseleave", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [sigVisible]);

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#c0c8d0";
    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Hier unterschreiben", rect.width / 2, rect.height / 2);
    ctx.restore();
    setSigHasStrokes(false);
  }

  function signatureDone() {
    const nr = nextLieferscheinNr();
    addLieferschein({
      nr,
      kunde: selectedEntry.name,
      datum: todayStr(),
      status: "Unterschrieben",
    });
    setCreatedNr(nr);
    setCompletedCalEntries((prev) => new Set(prev).add(selectedIdx));
    toast.success(`Lieferschein ${nr} erstellt`);
  }

  function resetForm() {
    setLs(EMPTY_LS);
    setSigVisible(false);
    setCreatedNr(null);
    setSigHasStrokes(false);
  }

  function handleNextTermin() {
    resetForm();
    const nextIdx = CALENDAR.findIndex((_, i) => i !== selectedIdx && !completedCalEntries.has(i));
    if (nextIdx >= 0) setSelectedIdx(nextIdx);
  }

  const STATUS_CYCLE: Record<Lieferschein["status"], Lieferschein["status"]> = {
    Erstellt: "Unterschrieben",
    Unterschrieben: "Archiviert",
    Archiviert: "Erstellt",
  };

  function cycleStatus(id: string, currentStatus: Lieferschein["status"]) {
    const next = STATUS_CYCLE[currentStatus];
    updateLieferscheinStatus(id, next);
    toast.success(`Status geändert: ${next}`);
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-7">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--navy)]">Lieferscheine</h1>
          <p className="mt-1 text-sm text-[var(--gray)]">{formatDynamicDate()}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kalender */}
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
            <div className="bg-[var(--navy)] px-5 py-3.5 text-sm font-semibold text-white">
              Termine heute
            </div>
            {CALENDAR.map((entry, i) => {
              const isDone = completedCalEntries.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!isDone) {
                      setSelectedIdx(i);
                      resetForm();
                    }
                  }}
                  className={`flex w-full items-center gap-3.5 border-b border-[var(--line)] px-5 py-3.5 text-left transition-colors last:border-b-0 ${
                    i === selectedIdx && !isDone ? "bg-[rgba(0,120,212,0.06)]" : ""
                  }`}
                >
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all ${
                    isDone ? "bg-[var(--green)]" : i === selectedIdx ? "bg-[var(--blue)]" : "bg-[var(--line)]"
                  }`} />
                  <span className="min-w-[44px] text-sm font-semibold text-[var(--navy)]">{entry.time}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text)]">{entry.name}</div>
                    <div className="text-xs text-[var(--gray)]">{entry.type} | {entry.addr}</div>
                  </div>
                  {isDone && (
                    <span className="shrink-0 rounded-full bg-[var(--green-light)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green)]">
                      Erledigt
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Lieferschein-Formular */}
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
            <div className="bg-[var(--navy)] px-5 py-3.5 text-sm font-semibold text-white">
              Lieferschein | {selectedEntry.name}
            </div>

            {createdNr ? (
              /* Success State */
              <div className="p-5">
                <div className="rounded-xl bg-[rgba(16,124,16,0.06)] border border-[rgba(16,124,16,0.15)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#107c10] text-white">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#107c10]">Lieferschein erstellt</div>
                      <div className="text-xs text-[var(--gray)]">{createdNr} | {selectedEntry.name}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleNextTermin} className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006cbd] active:scale-[0.97] transition-all">
                      Nächster Termin
                    </button>
                    <button onClick={resetForm} className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--bg)] active:scale-[0.97] transition-all">
                      Neuer Schein
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Formular */
              <div className="p-5">
                {FIELDS.map(({ key, label, type, placeholder }) => (
                  <div key={key} className="mb-4">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-[var(--gray)]">
                      {label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ls[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                        placeholder={placeholder}
                        className={`flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--navy)] placeholder:text-[var(--line)] outline-none transition-all focus:border-[var(--blue)] focus:ring-2 focus:ring-[rgba(0,120,212,0.1)] ${
                          type === "short" ? "max-w-[160px]" : ""
                        }`}
                      />
                      <MicButton
                        onResult={(text) => updateField(key, text)}
                      />
                    </div>
                  </div>
                ))}

                {/* Unterschrift */}
                {!sigVisible ? (
                  <button
                    onClick={() => { setSigVisible(true); setSigHasStrokes(false); }}
                    disabled={!canSign}
                    className="mt-2 w-full rounded-lg bg-[var(--blue)] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#006cbd] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Unterschrift einholen
                  </button>
                ) : (
                  <div className="mt-2 space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--gray)]">
                      Unterschrift Kunde
                    </div>
                    <canvas
                      ref={canvasRef}
                      className="h-[160px] w-full cursor-crosshair rounded-lg border-2 border-dashed border-[var(--line)] bg-white"
                      style={{ touchAction: "none" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={clearSignature}
                        className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--line)] active:scale-[0.97] transition-all"
                      >
                        Löschen
                      </button>
                      <button
                        onClick={signatureDone}
                        disabled={!sigHasStrokes}
                        className="rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a6b0a] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Abschließen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Letzte Lieferscheine */}
        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
          <div className="bg-[var(--navy)] px-5 py-3.5">
            <span className="text-sm font-semibold text-white">Letzte Lieferscheine</span>
          </div>
          <div className="hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Nr.", "Kunde", "Datum", "Status", ""].map((h) => (
                    <th key={h} className="border-b-2 border-[var(--line)] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--gray)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lieferscheine.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-[var(--bg)]"
                    onMouseEnter={() => setHoveredLsRow(row.id)}
                    onMouseLeave={() => setHoveredLsRow(null)}
                  >
                    <td className="border-b border-[var(--bg)] px-5 py-3.5 font-mono text-xs text-[var(--gray)]">{row.nr}</td>
                    <td className="border-b border-[var(--bg)] px-5 py-3.5 font-semibold text-[var(--navy)]">{row.kunde}</td>
                    <td className="border-b border-[var(--bg)] px-5 py-3.5 text-[var(--gray)]">{row.datum}</td>
                    <td className="border-b border-[var(--bg)] px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => cycleStatus(row.id, row.status)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all hover:ring-2 hover:ring-[var(--blue)]/20 ${LS_STATUS_CLASSES[row.status] || ""}`}
                        title="Klicken zum Wechseln"
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                          row.status === "Unterschrieben" ? "bg-[#107c10]" : row.status === "Erstellt" ? "bg-[#0078d4]" : "bg-[var(--gray)]"
                        }`} />
                        {row.status}
                      </button>
                    </td>
                    <td className="border-b border-[var(--bg)] px-5 py-3.5 text-right">
                      <button
                        onClick={() => { if (window.confirm("Wirklich löschen?")) { deleteLieferschein(row.id); toast.success("Lieferschein gelöscht"); } }}
                        className={`rounded-md bg-transparent px-1.5 py-1 text-[var(--gray)] transition-all hover:text-[var(--red)] ${hoveredLsRow === row.id ? "opacity-100" : "opacity-0"}`}
                        title="Löschen"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.3a1 1 0 01-1 .7H4.7a1 1 0 01-1-.7L3 4z" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 4h10M5.5 4V2.5h3V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden">
            {lieferscheine.map((row) => (
              <div key={row.id} className="border-b border-[var(--bg)] px-5 py-4 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--navy)]">{row.kunde}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cycleStatus(row.id, row.status)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LS_STATUS_CLASSES[row.status] || ""}`}
                    >
                      {row.status}
                    </button>
                    <button
                      onClick={() => { if (window.confirm("Wirklich löschen?")) { deleteLieferschein(row.id); toast.success("Lieferschein gelöscht"); } }}
                      className="text-[var(--gray)] hover:text-[var(--red)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.3a1 1 0 01-1 .7H4.7a1 1 0 01-1-.7L3 4z" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 4h10M5.5 4V2.5h3V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-[var(--gray)]">
                  <span className="font-mono">{row.nr}</span>
                  <span>{row.datum}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
