"use client";

import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";

const TERMINE = [
  { time: "09:00", name: "Müller Josef", addr: "Spenglerstr. 4, 1100 Wien", type: "Thermenwartung" },
  { time: "11:30", name: "Wohnbau Steyr AG", addr: "Wiedner Hauptstr. 22, 1040 Wien", type: "Heizungsmontage" },
  { time: "14:00", name: "Familie Schreiber", addr: "Favoritenstr. 88, 1100 Wien", type: "Rohrbruch Notdienst" },
];

const OFFENE_ANGEBOTE = [
  { kunde: "Familie Gruber", betrag: "€8.400", tageOffen: 22 },
  { kunde: "Wohnbau Steyr AG", betrag: "€6.800", tageOffen: 17 },
  { kunde: "Bauherr Hofmann", betrag: "€4.200", tageOffen: 8 },
];

const ZEITERSPARNIS = [
  { label: "Lieferscheine", stunden: 4 },
  { label: "Rechnungen", stunden: 3 },
  { label: "Emails", stunden: 3 },
  { label: "Nachkalkulation", stunden: 2 },
];

const ACTIVITY_INITIALS: Record<string, { initials: string; bg: string }> = {
  "📋": { initials: "LS", bg: "#0078d4" },
  "📤": { initials: "AG", bg: "#107c10" },
  "✅": { initials: "RB", bg: "#107c10" },
  "📥": { initials: "NA", bg: "#0d2d50" },
  "🔄": { initials: "TV", bg: "#d4850d" },
  "⚠️": { initials: "RK", bg: "#d13438" },
  "📧": { initials: "EM", bg: "#0078d4" },
  "📷": { initials: "BE", bg: "#6b7a8d" },
};

function formatDate(): string {
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function currentMonthName(): string {
  return new Intl.DateTimeFormat("de-AT", { month: "long" }).format(new Date());
}

function previousMonthName(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return new Intl.DateTimeFormat("de-AT", { month: "long" }).format(d);
}

function daysOpenColor(days: number): string {
  if (days > 14) return "bg-[rgba(209,52,56,0.1)] text-[var(--red)]";
  if (days >= 7) return "bg-[rgba(212,133,13,0.12)] text-[#d4850d]";
  return "bg-[rgba(16,124,16,0.1)] text-[var(--green)]";
}

const ACTIVITY_ROUTES: Record<string, string> = {
  "Lieferschein erstellt": "/lieferscheine",
  "Lieferschein gelöscht": "/lieferscheine",
  "Lieferschein-Status geändert": "/lieferscheine",
  "Angebot gesendet": "/buchhaltung",
  "Rechnung bezahlt": "/buchhaltung",
  "Rechnung gebucht": "/buchhaltung",
  "Zahlung erhalten": "/buchhaltung",
  "Eingangsrechnung gelöscht": "/buchhaltung",
  "Ausgangsrechnung gelöscht": "/buchhaltung",
  "Neuer Auftrag": "/buchhaltung",
  "Beleg erfasst": "/buchhaltung",
  "E-Mail beantwortet": "/posteingang",
  "E-Mail gelöscht": "/posteingang",
  "E-Mail archiviert": "/posteingang",
  "Termin verschoben": "/lieferscheine",
  "Reklamation eingegangen": "/posteingang",
};

export default function DashboardPage() {
  const router = useRouter();
  const { unreadCount, ausgangsrechnungen, eingangsrechnungen, activities } = useAppState();

  const offeneAuftraege = ausgangsrechnungen.filter((r) => r.status === "offen" || r.status === "überfällig").length;
  const ueberfaellig = ausgangsrechnungen.filter((r) => r.status === "überfällig");
  const ueberfaelligSum = ueberfaellig.reduce((sum, r) => {
    const num = parseFloat(r.betrag.replace("€", "").replace(".", "").replace(",", ".").trim());
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const offeneEingang = eingangsrechnungen.filter((r) => r.status === "offen").length;

  const monat = currentMonthName();
  const vormonat = previousMonthName();

  const KPI = [
    {
      value: "€48.200",
      label: `Umsatz ${monat}`,
      accent: false,
      sub: undefined,
      trend: "up" as const,
      comparison: `12% mehr als ${vormonat}`,
      href: null as string | null,
    },
    {
      value: String(offeneAuftraege + offeneEingang),
      label: "Offene Aufträge",
      accent: false,
      sub: undefined,
      trend: "down" as const,
      comparison: `3 weniger als ${vormonat}`,
      href: "/buchhaltung",
    },
    {
      value: String(OFFENE_ANGEBOTE.length),
      label: "Offene Angebote",
      sub: "€31.400",
      accent: false,
      trend: "up" as const,
      comparison: `1 mehr als ${vormonat}`,
      href: null as string | null,
    },
    {
      value: String(ueberfaellig.length),
      label: "Überfällige Rechnungen",
      sub: ueberfaellig.length > 0 ? `€${ueberfaelligSum.toLocaleString("de-AT")}` : undefined,
      accent: ueberfaellig.length > 0,
      trend: "down" as const,
      comparison: `2 weniger als ${vormonat}`,
      href: "/buchhaltung",
    },
  ];

  const visibleActivities = activities.slice(0, 8);
  const totalZeitersparnis = ZEITERSPARNIS.reduce((s, z) => s + z.stunden, 0);

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-7">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--navy)]">
            Thomas Bauer
          </h1>
          <p className="mt-1 text-sm text-[var(--gray)]">
            Installateur Bauer GmbH, {formatDate()}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-[var(--blue)] px-2 py-0.5 text-[11px] font-semibold text-white">
                {unreadCount} ungelesene E-Mails
              </span>
            )}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPI.map((kpi, i) => (
            <div
              key={i}
              onClick={kpi.href ? () => router.push(kpi.href!) : undefined}
              className={`card-interactive rounded-xl bg-white p-5 shadow-[var(--shadow)] ${kpi.href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`text-[28px] font-extrabold tracking-tight ${
                    kpi.accent ? "text-[var(--red)]" : "text-[var(--navy)]"
                  }`}
                >
                  {kpi.value}
                </div>
                <span
                  className={`mt-1 text-lg ${
                    kpi.trend === "up" ? "text-[var(--green)]" : "text-[var(--red)]"
                  }`}
                >
                  {kpi.trend === "up" ? "↑" : "↓"}
                </span>
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--gray)]">
                {kpi.label}
              </div>
              {kpi.sub && (
                <div className={`mt-0.5 text-[11px] ${kpi.accent ? "text-[var(--red)]" : "text-[var(--blue)]"}`}>
                  {kpi.sub}
                </div>
              )}
              <div className="mt-1.5 text-[11px] text-[var(--gray)]">
                {kpi.comparison}
              </div>
            </div>
          ))}
        </div>

        {/* Zeitersparnis Card */}
        <div className="mb-6 rounded-xl p-5 shadow-[var(--shadow)]" style={{ background: "linear-gradient(135deg, #0d2d50, #0a3d6b)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Zeitersparnis durch werkflow
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                Sie sparen ca. {totalZeitersparnis} Stunden pro Woche
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {ZEITERSPARNIS.map((z) => (
                <div
                  key={z.label}
                  className="rounded-lg bg-white/10 px-3 py-2 text-center"
                >
                  <div className="text-lg font-bold text-white">{z.stunden}h</div>
                  <div className="text-[11px] text-white/70">{z.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two-column: Termine + Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Termine Heute (Timeline layout) */}
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)] lg:col-span-3">
            <div className="flex items-center justify-between bg-[var(--navy)] px-5 py-3.5">
              <span className="text-sm font-semibold text-white">
                Termine heute
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                {TERMINE.length}
              </span>
            </div>
            <div className="px-5 py-3">
              {TERMINE.map((t, i) => {
                const now = new Date();
                const [h, m] = t.time.split(":").map(Number);
                const terminTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
                const past = terminTime.getTime() < now.getTime();
                const isCurrent = !past && (i === 0 || (() => {
                  const [ph, pm] = TERMINE[i - 1].time.split(":").map(Number);
                  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), ph, pm).getTime() < now.getTime();
                })());
                return (
                  <div
                    key={i}
                    className="flex cursor-pointer gap-4"
                    onClick={() => router.push("/lieferscheine")}
                  >
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`mt-4 h-3 w-3 shrink-0 rounded-full border-2 ${
                          isCurrent
                            ? "border-[var(--blue)] bg-[var(--blue)]"
                            : past
                              ? "border-[var(--line)] bg-[var(--line)]"
                              : "border-[var(--blue)] bg-white"
                        }`}
                        style={isCurrent ? { boxShadow: "0 0 0 4px rgba(0,120,212,0.2)" } : undefined}
                      />
                      {i < TERMINE.length - 1 && (
                        <div className={`w-0.5 flex-1 ${past ? "bg-[var(--line)]" : "bg-[var(--blue)]/20"}`} />
                      )}
                    </div>
                    {/* Content */}
                    <div
                      className={`flex flex-1 items-center gap-4 rounded-lg py-3 transition-colors hover:bg-[rgba(0,120,212,0.04)] ${
                        isCurrent ? "bg-[rgba(0,120,212,0.05)] px-3 -mx-1" : ""
                      } ${i < TERMINE.length - 1 ? "border-b border-transparent" : ""}`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                          isCurrent
                            ? "bg-[var(--blue)] text-white"
                            : "bg-[var(--light)] text-[var(--blue)]"
                        }`}
                      >
                        {t.time}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${past ? "text-[var(--gray)]" : "text-[var(--navy)]"}`}>
                          {t.name}
                        </div>
                        <div className="text-xs text-[var(--gray)]">{t.addr}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--gray)]">
                        {t.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Letzte Aktivität */}
            <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
              <div className="bg-[var(--navy)] px-5 py-3.5">
                <span className="text-sm font-semibold text-white">
                  Letzte Aktivität
                </span>
              </div>
              {visibleActivities.map((a) => {
                const mapped = ACTIVITY_INITIALS[a.icon] ?? { initials: "??", bg: "#6b7a8d" };
                const actRoute = ACTIVITY_ROUTES[a.text] ?? null;
                return (
                  <div
                    key={a.id}
                    onClick={actRoute ? () => router.push(actRoute) : undefined}
                    className={`flex items-start gap-3 border-b border-[var(--bg)] px-5 py-3.5 last:border-b-0 ${actRoute ? "cursor-pointer transition-colors hover:bg-[var(--bg)]" : ""}`}
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: mapped.bg }}
                    >
                      {mapped.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--navy)]">
                        {a.text}
                      </div>
                      <div className="text-xs text-[var(--gray)]">{a.detail}</div>
                    </div>
                    <span className="shrink-0 text-[11px] text-[var(--gray)]">
                      {a.time}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Offene Angebote */}
            <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
              <div className="flex items-center justify-between bg-[var(--navy)] px-5 py-3.5">
                <span className="text-sm font-semibold text-white">
                  Offene Angebote
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {OFFENE_ANGEBOTE.length}
                </span>
              </div>
              {OFFENE_ANGEBOTE.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-[var(--bg)] px-5 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--navy)]">{a.kunde}</div>
                    <div className="text-xs text-[var(--gray)]">{a.betrag}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${daysOpenColor(a.tageOffen)}`}>
                    {a.tageOffen} Tage
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
