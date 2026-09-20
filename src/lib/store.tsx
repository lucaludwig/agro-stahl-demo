"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { lesen, schreiben, zuruecksetzen } from "./demo-speicher";

/* ========================================================================
   Typen
   ======================================================================== */

export interface Lieferschein {
  id: string;
  nr: string;
  kunde: string;
  datum: string;
  status: "Erstellt" | "Unterschrieben" | "Archiviert";
  createdAt: number;
}

export interface Email {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  label: string;
  labelClass: string;
  date: Date;
  unread: boolean;
  urgent: boolean;
  preview: string;
  body: string;
  aiDraft: string | null;
  replied: boolean;
  archived?: boolean;
}

export interface Eingangsrechnung {
  id: string;
  lieferant: string;
  betrag: string;
  datum: string;
  kategorie: string;
  status: "gebucht" | "offen";
}

export interface Ausgangsrechnung {
  id: string;
  nr: string;
  kunde: string;
  betrag: string;
  faellig: string;
  status: "überfällig" | "offen" | "bezahlt" | "entwurf" | "gesendet";
}

/**
 * Projektbuchung, abgespeckte Fassung des Chamelion-Moduls.
 *
 * Chamelion führt Leistungskatalog, Regieleistungen, Rollen und Korrektur-Audit.
 * Für die Demo bleibt der Kern, an dem der Nutzen hängt: geplante Stunden gegen
 * gebuchte Stunden, je Projekt, mit Ampel. Alles andere macht die Ansicht unleserlich -
 * genau der Vorwurf, mit dem dieses Modul beauftragt wurde.
 */
export interface Projekt {
  id: string;
  nr: string;
  name: string;
  kunde: string;
  /** Kalkulierte Stunden aus dem Angebot. */
  budgetStunden: number;
  stundensatz: number;
  status: "laufend" | "abgeschlossen";
  start: string;
}

export interface Buchung {
  id: string;
  projektId: string;
  mitarbeiter: string;
  datum: string;
  stunden: number;
  taetigkeit: string;
}

export interface ActivityEntry {
  id: string;
  text: string;
  detail: string;
  time: string;
  icon: string;
  createdAt: number;
}

export interface AppState {
  // Lieferscheine
  lieferscheine: Lieferschein[];
  addLieferschein: (ls: Omit<Lieferschein, "id" | "createdAt">) => void;
  deleteLieferschein: (id: string) => void;
  updateLieferscheinStatus: (id: string, status: Lieferschein["status"]) => void;
  nextLieferscheinNr: () => string;

  // Emails
  emails: Email[];
  markAsRead: (id: string) => void;
  markAsReplied: (id: string) => void;
  deleteEmail: (id: string) => void;
  archiveEmail: (id: string) => void;
  unreadCount: number;

  // Buchhaltung
  eingangsrechnungen: Eingangsrechnung[];
  ausgangsrechnungen: Ausgangsrechnung[];
  addEingangsrechnung: (r: Omit<Eingangsrechnung, "id">) => void;
  updateEingangStatus: (id: string, status: "gebucht" | "offen") => void;
  deleteEingangsrechnung: (id: string) => void;
  updateAusgangStatus: (id: string, status: Ausgangsrechnung["status"]) => void;
  deleteAusgangsrechnung: (id: string) => void;

  // Projekte
  projekte: Projekt[];
  buchungen: Buchung[];
  addBuchung: (b: Omit<Buchung, "id">) => void;
  deleteBuchung: (id: string) => void;
  setProjektStatus: (id: string, status: Projekt["status"]) => void;

  // Aktivität
  activities: ActivityEntry[];
  addActivity: (a: Omit<ActivityEntry, "id" | "createdAt">) => void;
}

/* ========================================================================
   Hilfsfunktionen
   ======================================================================== */

function daysAgo(n: number, h: number = 9, m: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d;
}

function recentDate(daysAgoN: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgoN);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function formatActivityTime(daysAgoN: number, hours: number, minutes: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgoN, hours, minutes);
  const isToday = daysAgoN === 0;
  const isYesterday = daysAgoN === 1;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (isToday) return `Heute, ${hh}:${mm}`;
  if (isYesterday) return `Gestern, ${hh}:${mm}`;
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mo}., ${hh}:${mm}`;
}

function nowTimeStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `Heute, ${hh}:${mm}`;
}

function todayStr(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/* ========================================================================
   Seed-Daten
   ======================================================================== */

const LABEL_CLASSES: Record<string, string> = {
  Kundenanfrage: "bg-[rgba(0,120,212,0.1)] text-[var(--blue)]",
  Lieferant: "bg-[rgba(107,122,141,0.12)] text-[var(--gray)]",
  Terminanfrage: "bg-[rgba(16,124,16,0.1)] text-[var(--green)]",
  Reklamation: "bg-[rgba(209,52,56,0.1)] text-[var(--red)]",
  Intern: "bg-[rgba(136,100,170,0.12)] text-[#7c5caa]",
  Newsletter: "bg-[rgba(180,180,180,0.15)] text-[#999]",
};

function seedEmails(): Email[] {
  return [
    {
      id: "email-1",
      from: "office@steindl-lager.at",
      fromName: "Steindl Lagerverwaltung",
      subject: "DRINGEND: Heizungsausfall Objekt 5",
      label: "Kundenanfrage",
      labelClass: LABEL_CLASSES.Kundenanfrage,
      date: daysAgo(0, 7, 45),
      unread: true,
      urgent: true,
      preview: "Herr Bauer, in unserem Lagerkomplex Objekt 5 ist die Heizung komplett ausgefallen. Betrifft ca. 2000m² Lagerfläche.",
      body: "Sehr geehrter Herr Bauer,\n\nin unserem Lagerkomplex Objekt 5 (Triester Str. 64, 1100 Wien) ist heute Morgen die Heizung komplett ausgefallen. Es betrifft ca. 2000m² Lagerfläche, in der temperaturempfindliche Ware gelagert wird.\n\nWir brauchen dringend einen Techniker, der sich das ansieht. Die Anlage ist eine Viessmann Vitodens 300-W, Baujahr 2019. Am Display erscheint Fehlercode F5.\n\nBitte melden Sie sich so schnell wie möglich zurück. Erreichbar bin ich unter 0664 / 123 45 67.\n\nMit freundlichen Grüßen,\nMag. Peter Steindl",
      aiDraft: "Sehr geehrter Herr Steindl,\n\nwir haben Ihre Meldung erhalten und nehmen den Heizungsausfall sehr ernst. Unser Techniker Mario S. kann heute noch ab 16:00 Uhr bei Ihnen sein.\n\nFehlercode F5 deutet auf ein Problem mit dem Außentemperaturfühler hin, wir bringen ein Ersatzteil mit.\n\nBitte bestätigen Sie kurz, ob jemand vor Ort ist und uns Zugang gewähren kann.\n\nMit freundlichen Grüßen,\nThomas Bauer",
      replied: false,
    },
    {
      id: "email-2",
      from: "ernst.huber@gmail.com",
      fromName: "Ernst Huber",
      subject: "Anfrage Badezimmer Renovierung",
      label: "Kundenanfrage",
      labelClass: LABEL_CLASSES.Kundenanfrage,
      date: daysAgo(0, 9, 12),
      unread: true,
      urgent: false,
      preview: "Sehr geehrter Herr Bauer, wir möchten unser Badezimmer komplett renovieren lassen. Ca. 12m² mit Dusche, WC und Doppelwaschtisch.",
      body: "Sehr geehrter Herr Bauer,\n\nwir möchten unser Badezimmer komplett renovieren lassen. Es handelt sich um ca. 12m² mit Dusche, WC und Doppelwaschtisch. Das Bad ist aktuell aus den 90er-Jahren und wir wollen alles erneuern: Fliesen, Sanitär und die Leitungen.\n\nWir haben uns schon bei einem Fliesenleger informiert, bräuchten aber einen Installateur für die gesamte Sanitärinstallation. Könnten Sie sich das ansehen und ein Angebot erstellen?\n\nWir sind zeitlich flexibel, ein Termin nächste Woche wäre ideal.\n\nMit freundlichen Grüßen,\nErnst Huber\nMobil: 0660 / 234 56 78",
      aiDraft: "Sehr geehrter Herr Huber,\n\nvielen Dank für Ihre Anfrage zur Badezimmer-Renovierung.\n\nIch würde vorschlagen, dass wir einen Vor-Ort-Termin vereinbaren, um die Gegebenheiten zu besprechen und Aufmaß zu nehmen. Wann passt es Ihnen nächste Woche? Ich hätte Dienstag oder Donnerstag Vormittag Zeit.\n\nMit freundlichen Grüßen,\nThomas Bauer",
      replied: false,
    },
    {
      id: "email-3",
      from: "m.koller@wohnbau-wien.at",
      fromName: "Markus Koller",
      subject: "Terminverschiebung Heizungsmontage",
      label: "Terminanfrage",
      labelClass: LABEL_CLASSES.Terminanfrage,
      date: daysAgo(0, 11, 5),
      unread: true,
      urgent: false,
      preview: "Herr Bauer, leider müssen wir den Termin am Freitag verschieben. Können wir auf nächsten Montag ausweichen?",
      body: "Sehr geehrter Herr Bauer,\n\nleider müssen wir den für Freitag geplanten Montagetermin für die Wohnanlage Linzerstraße verschieben. Der Estrich ist noch nicht ausgehärtet, und die Bodenleger brauchen noch bis Ende der Woche.\n\nKönnten wir den Termin auf Montag, den 30.06. verschieben? Idealerweise ab 8:00 Uhr, damit wir den ganzen Tag nutzen können.\n\nBitte geben Sie uns kurz Bescheid, ob das bei Ihnen machbar ist.\n\nBeste Grüße,\nMarkus Koller\nWohnbau Wien GmbH",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-4",
      from: "lieferung@haas-gmbh.at",
      fromName: "Haas Haustechnik",
      subject: "Auftragsbestätigung AB-2026-4821",
      label: "Lieferant",
      labelClass: LABEL_CLASSES.Lieferant,
      date: daysAgo(0, 14, 30),
      unread: true,
      urgent: false,
      preview: "Ihre Bestellung BE-2026-0394 wurde bestätigt. Liefertermin: 27.06.2026. 3x Viessmann Mischer DN25, 2x Grundfos Alpha2.",
      body: "Sehr geehrter Herr Bauer,\n\nhiermit bestätigen wir Ihre Bestellung BE-2026-0394 vom 22.06.2026:\n\n3x Viessmann Mischer DN25, €187,00/Stk.\n2x Grundfos Alpha2 25-60, €342,00/Stk.\n1x Flamco Flexcon 35L, €89,00\n\nGesamtbetrag netto: €1.334,00\nVoraussichtlicher Liefertermin: 27.06.2026\nLieferadresse: Lager Installateur Bauer GmbH\n\nBei Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen,\nHaas Haustechnik GmbH\nVertrieb Innendienst",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-5",
      from: "k.novak@gmx.at",
      fromName: "Katharina Novak",
      subject: "Thermentausch, wann können Sie kommen?",
      label: "Kundenanfrage",
      labelClass: LABEL_CLASSES.Kundenanfrage,
      date: daysAgo(1, 8, 22),
      unread: true,
      urgent: false,
      preview: "Unsere Therme (Vaillant, 18 Jahre alt) macht seit letzter Woche komische Geräusche. Wir überlegen einen Tausch.",
      body: "Guten Tag Herr Bauer,\n\nunsere Therme (Vaillant atmoTEC plus, Baujahr 2008) macht seit letzter Woche beim Aufheizen ein lautes Klopfgeräusch. Der letzte Wartungstechniker hat gemeint, dass sich ein Tausch langsam lohnt.\n\nWir haben uns die Vaillant ecoTEC exclusive angesehen. Können Sie uns da ein Angebot machen inklusive Montage? Die Therme hängt im Badezimmer, gut zugänglich.\n\nWir wohnen in der Quellenstraße 142, 1100 Wien, 3. Stock mit Lift.\n\nBeste Grüße,\nKatharina Novak",
      aiDraft: "Sehr geehrte Frau Novak,\n\nvielen Dank für Ihre Anfrage zum Thermentausch.\n\nDie Vaillant ecoTEC exclusive ist eine sehr gute Wahl. Für ein genaues Angebot müsste ich mir die bestehende Installation kurz ansehen: Gasanschluss, Abgasführung und Leitungsführung.\n\nIch hätte nächste Woche Mittwoch Vormittag einen Termin frei. Passt Ihnen das?\n\nMit freundlichen Grüßen,\nThomas Bauer",
      replied: false,
    },
    {
      id: "email-6",
      from: "mario.s@bauer-gmbh.at",
      fromName: "Mario Stadler",
      subject: "Urlaubsantrag 14. bis 18. Juli",
      label: "Intern",
      labelClass: LABEL_CLASSES.Intern,
      date: daysAgo(1, 12, 15),
      unread: false,
      urgent: false,
      preview: "Chef, ich würde gerne vom 14. bis 18. Juli Urlaub nehmen. In der Woche ist kein großer Auftrag geplant.",
      body: "Hallo Thomas,\n\nich würde gerne vom 14. bis 18. Juli Urlaub nehmen (5 Arbeitstage). In der Woche ist laut Kalender kein großer Auftrag geplant, und Stefan könnte meine laufenden Wartungstermine übernehmen.\n\nIch habe noch 12 Resturlaubstage.\n\nKannst du mir bitte kurz Bescheid geben, ob das passt?\n\nDanke und Grüße,\nMario",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-7",
      from: "buchhaltung@armaturen-mueller.at",
      fromName: "Armaturen Müller",
      subject: "Rechnung RE-2026-5582",
      label: "Lieferant",
      labelClass: LABEL_CLASSES.Lieferant,
      date: daysAgo(1, 15, 48),
      unread: false,
      urgent: false,
      preview: "Anbei die Rechnung für Ihre Bestellung vom 16.06. Betrag: €890,00 netto. Zahlungsziel: 30 Tage netto.",
      body: "Sehr geehrter Herr Bauer,\n\nanbei erhalten Sie unsere Rechnung Nr. RE-2026-5582 für Ihre Bestellung vom 16.06.2026:\n\n5x Grohe Eurodisc Einhebelmischer, €124,00/Stk.\n3x Hansgrohe Brauseset Croma Select, €63,00/Stk.\n2x Geberit Unterputzspülkasten Sigma, €98,50/Stk.\n\nNettobetrag: €890,00\nUSt. 20%: €178,00\nBruttobetrag: €1.068,00\n\nZahlungsziel: 30 Tage netto\nBankverbindung: AT12 3456 7890 1234 5678\n\nMit freundlichen Grüßen,\nArmaturen Müller KG\nBuchhaltung",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-8",
      from: "info@fv-shk.at",
      fromName: "Fachverband SHK",
      subject: "Neue Förderrichtlinien Heizungstausch ab Juli 2026",
      label: "Newsletter",
      labelClass: LABEL_CLASSES.Newsletter,
      date: daysAgo(2, 6, 0),
      unread: false,
      urgent: false,
      preview: "Ab 01.07.2026 gelten neue Förderrichtlinien für den Heizungstausch. Bis zu 75% Förderung für den Umstieg auf Wärmepumpe.",
      body: "Sehr geehrte Mitglieder,\n\nab 01.07.2026 treten die neuen Förderrichtlinien des Bundes für den Heizungstausch in Kraft. Hier die wichtigsten Änderungen:\n\n• Förderung für Umstieg Gas → Wärmepumpe: bis zu 75% (bisher 50%)\n• Neue Einkommensgrenze: €80.000 Haushaltseinkommen\n• Vereinfachtes Antragsverfahren über den neuen Online-Service\n• Kombination mit Landesförderung weiterhin möglich\n\nFür Installateurbetriebe bedeutet das eine voraussichtlich stark steigende Nachfrage im Bereich Wärmepumpeninstallation. Wir empfehlen, sich frühzeitig auf entsprechende Schulungen vorzubereiten.\n\nAlle Details finden Sie unter www.fv-shk.at/foerderung-2026\n\nMit freundlichen Grüßen,\nFachverband SHK Österreich",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-9",
      from: "reklamation@hausverwaltung-kern.at",
      fromName: "HV Kern & Partner",
      subject: "Reklamation: Undichte Leitung Stiege 3",
      label: "Reklamation",
      labelClass: LABEL_CLASSES.Reklamation,
      date: daysAgo(2, 10, 33),
      unread: false,
      urgent: false,
      preview: "In der Anlage Schönbrunner Str. 180, Stiege 3, 2. OG tropft es seit gestern aus der Decke. Vermutlich defekte Leitung.",
      body: "Sehr geehrter Herr Bauer,\n\nwir müssen leider eine Reklamation melden. In der Wohnanlage Schönbrunner Str. 180, Stiege 3, 2. OG (Wohnung Top 7) tropft es seit gestern aus der Decke im Badezimmer.\n\nDie Installation in Stiege 3 wurde im März 2026 von Ihrem Betrieb durchgeführt (Auftrag A-2026-0612). Wir vermuten eine defekte Leitung oder undichte Verbindung im darüberliegenden Stockwerk.\n\nDer Mieter in Top 7 ist tagsüber zu Hause und kann jederzeit Zugang gewähren. Bitte um rasche Rückmeldung.\n\nMit freundlichen Grüßen,\nDI Andrea Kern\nHV Kern & Partner",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-10",
      from: "a.berger@outlook.com",
      fromName: "Anna Berger",
      subject: "Heizungswartung, neuer Termin?",
      label: "Terminanfrage",
      labelClass: LABEL_CLASSES.Terminanfrage,
      date: daysAgo(3, 14, 10),
      unread: false,
      urgent: false,
      preview: "Könnten wir die jährliche Heizungswartung auf Anfang Juli legen? Der Juni-Termin passt uns leider nicht mehr.",
      body: "Guten Tag Herr Bauer,\n\nwir hatten für Ende Juni einen Wartungstermin für unsere Heizung vereinbart. Leider sind wir in der Woche auf Urlaub.\n\nKönnten wir den Termin auf Anfang Juli verschieben? Idealerweise in der ersten Juliwoche, am besten vormittags.\n\nUnsere Adresse: Gußhausstr. 14/3, 1040 Wien. Sie waren letztes Jahr schon bei uns (Vaillant ecoCOMPACT).\n\nVielen Dank und beste Grüße,\nAnna Berger",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-11",
      from: "lieferung@haas-gmbh.at",
      fromName: "Haas Haustechnik",
      subject: "Rechnung RE-2026-1847",
      label: "Lieferant",
      labelClass: LABEL_CLASSES.Lieferant,
      date: daysAgo(4, 9, 0),
      unread: false,
      urgent: false,
      preview: "Rechnung Nr. RE-2026-1847 für die Lieferung vom 18.06.2026. Betrag: €1.650,00 netto. Zahlungsziel: 14 Tage.",
      body: "Sehr geehrter Herr Bauer,\n\nanbei erhalten Sie die Rechnung Nr. RE-2026-1847 für die Lieferung vom 18.06.2026:\n\n2x Viessmann Vitodens 200-W, €685,00/Stk.\n1x Viessmann Vitocell 100-W 120L, €280,00\n\nNettobetrag: €1.650,00\nUSt. 20%: €330,00\nBruttobetrag: €1.980,00\n\nZahlungsziel: 14 Tage netto\nFällig am: 02.07.2026\n\nMit freundlichen Grüßen,\nHaas Haustechnik GmbH",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-12",
      from: "messe@haustechnik-expo.at",
      fromName: "Haustechnik-Messe Wien",
      subject: "Frühbucher-Tickets: Haustechnik Expo 2026",
      label: "Newsletter",
      labelClass: LABEL_CLASSES.Newsletter,
      date: daysAgo(5, 7, 0),
      unread: false,
      urgent: false,
      preview: "Sichern Sie sich jetzt Frühbucher-Tickets für die Haustechnik Expo 2026 am 15. bis 17. Oktober in der Messe Wien.",
      body: "Sehr geehrter Herr Bauer,\n\ndie Haustechnik Expo 2026 findet vom 15. bis 17. Oktober in der Messe Wien statt. Über 200 Aussteller präsentieren die neuesten Trends in Heizung, Sanitär und Klimatechnik.\n\nHighlights 2026:\n• Wärmepumpen-Pavillon mit Live-Installationen\n• Forum \"Digitalisierung im Handwerk\"\n• Neue Produktlinien von Viessmann, Vaillant, Daikin\n\nFrühbucher-Tickets: €25,- statt €45,- (bis 31.08.2026)\nCode: FRUEH2026\n\nwww.haustechnik-expo.at/tickets\n\nWir freuen uns auf Ihren Besuch!",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-13",
      from: "sanitaer-grosshandel@sgw.at",
      fromName: "Sanitär Großhandel Wien",
      subject: "Liefertermin Bestellung BE-9921 verschoben",
      label: "Lieferant",
      labelClass: LABEL_CLASSES.Lieferant,
      date: daysAgo(5, 11, 22),
      unread: false,
      urgent: false,
      preview: "Leider verzögert sich die Lieferung Ihrer Bestellung BE-9921. Neuer Termin: 30.06.2026 statt 26.06.",
      body: "Sehr geehrter Herr Bauer,\n\nleider müssen wir Ihnen mitteilen, dass sich die Lieferung Ihrer Bestellung BE-9921 verzögert. Die bestellten Geberit Duofix-Elemente sind beim Hersteller aktuell nicht lieferbar.\n\nNeuer voraussichtlicher Liefertermin: 30.06.2026 (statt 26.06.2026)\n\nBetroffene Positionen:\n4x Geberit Duofix Element für Wand-WC, €142,00/Stk.\n2x Geberit Duofix Element für Waschtisch, €98,00/Stk.\n\nWir bitten um Ihr Verständnis und halten Sie auf dem Laufenden.\n\nMit freundlichen Grüßen,\nSanitär Großhandel Wien",
      aiDraft: null,
      replied: false,
    },
    {
      id: "email-14",
      from: "j.wimmer@aon.at",
      fromName: "Johann Wimmer",
      subject: "Danke für die schnelle Reparatur!",
      label: "Kundenanfrage",
      labelClass: LABEL_CLASSES.Kundenanfrage,
      date: daysAgo(6, 16, 40),
      unread: false,
      urgent: false,
      preview: "Herr Bauer, wollte mich nochmal bedanken. Die Leitung hält perfekt, kein Tropfen mehr. Werde Sie weiterempfehlen.",
      body: "Sehr geehrter Herr Bauer,\n\nich wollte mich nochmal herzlich bedanken für die schnelle Reparatur letzte Woche. Die Leitung hält perfekt, kein Tropfen mehr. Ihr Techniker Mario war sehr kompetent und hat alles sauber hinterlassen.\n\nIch werde Sie auf jeden Fall weiterempfehlen. Mein Nachbar hat auch ein Problem mit seiner Therme, ich habe ihm Ihre Nummer gegeben.\n\nMit besten Grüßen,\nJohann Wimmer",
      aiDraft: null,
      replied: false,
    },
  ];
}

function seedLieferscheine(): Lieferschein[] {
  return [
    { id: "ls-1", nr: "LS-2026-0147", kunde: "Familie Mayer", datum: recentDate(1), status: "Archiviert", createdAt: Date.now() - 86400000 },
    { id: "ls-2", nr: "LS-2026-0146", kunde: "Bauherr Hofmann", datum: recentDate(1), status: "Unterschrieben", createdAt: Date.now() - 86400000 },
    { id: "ls-3", nr: "LS-2026-0145", kunde: "Wohnanlage Linz", datum: recentDate(2), status: "Archiviert", createdAt: Date.now() - 172800000 },
    { id: "ls-4", nr: "LS-2026-0144", kunde: "Johann Wimmer", datum: recentDate(3), status: "Archiviert", createdAt: Date.now() - 259200000 },
    { id: "ls-5", nr: "LS-2026-0143", kunde: "HV Kern & Partner", datum: recentDate(4), status: "Archiviert", createdAt: Date.now() - 345600000 },
    { id: "ls-6", nr: "LS-2026-0142", kunde: "Steindl Lagerverwaltung", datum: recentDate(5), status: "Archiviert", createdAt: Date.now() - 432000000 },
  ];
}

function seedEingangsrechnungen(): Eingangsrechnung[] {
  return [
    { id: "er-1", lieferant: "Sanitär Großhandel Wien", betrag: "€2.340", datum: "10.06.2026", kategorie: "Material", status: "gebucht" },
    { id: "er-2", lieferant: "Viessmann Österreich", betrag: "€4.870", datum: "12.06.2026", kategorie: "Material", status: "gebucht" },
    { id: "er-3", lieferant: "Armaturen Müller", betrag: "€890", datum: "16.06.2026", kategorie: "Material", status: "gebucht" },
    { id: "er-4", lieferant: "Werkzeug Profi GmbH", betrag: "€312", datum: "17.06.2026", kategorie: "Werkzeug", status: "gebucht" },
    { id: "er-5", lieferant: "Haas Haustechnik", betrag: "€1.650", datum: "18.06.2026", kategorie: "Material", status: "offen" },
    { id: "er-6", lieferant: "Amazon Business", betrag: "€124,50", datum: "20.06.2026", kategorie: "Werkzeug", status: "offen" },
    { id: "er-7", lieferant: "Geberit Vertriebs GmbH", betrag: "€764", datum: "22.06.2026", kategorie: "Material", status: "offen" },
    { id: "er-8", lieferant: "Büromaterial Weber", betrag: "€67,80", datum: "23.06.2026", kategorie: "Büro", status: "offen" },
  ];
}

function seedAusgangsrechnungen(): Ausgangsrechnung[] {
  return [
    { id: "ar-1", nr: "RE-2026-0089", kunde: "Bauherr Hofmann", betrag: "€4.200", faellig: "10.06.2026", status: "überfällig" },
    { id: "ar-2", nr: "RE-2026-0090", kunde: "Familie Berger", betrag: "€3.400", faellig: "15.06.2026", status: "bezahlt" },
    { id: "ar-3", nr: "RE-2026-0091", kunde: "Wohnanlage Linz", betrag: "€5.400", faellig: "30.06.2026", status: "offen" },
    { id: "ar-4", nr: "RE-2026-0092", kunde: "Familie Mayer", betrag: "€3.200", faellig: "05.07.2026", status: "offen" },
    { id: "ar-5", nr: "RE-2026-0093", kunde: "Johann Wimmer", betrag: "€1.180", faellig: "08.07.2026", status: "offen" },
    { id: "ar-6", nr: "RE-2026-0094", kunde: "Familie Gruber", betrag: "€2.100", faellig: "15.07.2026", status: "entwurf" },
  ];
}

function seedProjekte(): Projekt[] {
  // Vier laufende, eines abgeschlossen. Bewusst gestreut, damit die Ampel alle drei
  // Zustände zeigt: eines über Budget, eines knapp davor, zwei entspannt.
  return [
    { id: "pr-1", nr: "P-2026-014", name: "Heizungstausch Wohnanlage Steyr", kunde: "Wohnbau Steyr AG", budgetStunden: 180, stundensatz: 78, status: "laufend", start: recentDate(41) },
    { id: "pr-2", nr: "P-2026-018", name: "Badsanierung Reihenhaus", kunde: "Familie Schreiber", budgetStunden: 64, stundensatz: 82, status: "laufend", start: recentDate(24) },
    { id: "pr-3", nr: "P-2026-021", name: "Thermenwartung Hausverwaltung (42 Einheiten)", kunde: "IMV Immobilien GmbH", budgetStunden: 96, stundensatz: 74, status: "laufend", start: recentDate(17) },
    { id: "pr-4", nr: "P-2026-023", name: "Rohrleitungen Gewerbeobjekt", kunde: "Kern Gewerbepark", budgetStunden: 120, stundensatz: 80, status: "laufend", start: recentDate(9) },
    { id: "pr-5", nr: "P-2026-009", name: "Solaranlage Einfamilienhaus", kunde: "Müller Josef", budgetStunden: 48, stundensatz: 82, status: "abgeschlossen", start: recentDate(72) },
  ];
}

/** Die vier Monteure des Demo-Betriebs. Einzige Quelle, auch für das Buchungsformular. */
export const MONTEURE = ["Thomas Bauer", "Ferdinand Gruber", "Mario Kolar", "Stefan Wieser"];

function seedBuchungen(): Buchung[] {
  // Summen je Projekt sind absichtlich gesetzt, nicht gewürfelt, damit die Ampel alle
  // drei Zustände zeigt. Nachgerechnet am gerenderten Bild, nicht nur behauptet:
  //   pr-1  62+48+51+35 = 196 von 180 h  -> 109 %, rot
  //   pr-2  24+19+12    =  55 von  64 h  ->  86 %, gelb
  //   pr-3  14+16+8     =  38 von  96 h  ->  40 %, grün
  //   pr-4  15+12       =  27 von 120 h  ->  23 %, grün
  //   pr-5  26+19       =  45 von  48 h  ->  94 %, abgeschlossen
  // Wer hier Zahlen ändert, rechnet die Summe nach: eine Demo ohne roten Fall zeigt
  // genau das nicht, wofür es das Modul gibt.
  const eintraege: [string, number, string, number, string][] = [
    ["pr-1", 62, "Altanlage demontiert, Steigleitungen freigelegt", 62, "Ferdinand Gruber"],
    ["pr-1", 48, "Kessel gesetzt, Hydraulik angeschlossen", 58, "Mario Kolar"],
    ["pr-1", 51, "Heizkreise gespült und eingeregelt, Nachbesserung Stiege 2", 44, "Ferdinand Gruber"],
    ["pr-1", 35, "Nacharbeiten Stiegenhaus, Dämmung ergänzt", 32, "Stefan Wieser"],
    ["pr-2", 24, "Fliesen raus, Vorwandinstallation gesetzt", 24, "Mario Kolar"],
    ["pr-2", 19, "Rohbau-Installation Bad und WC", 18, "Stefan Wieser"],
    ["pr-2", 12, "Armaturen montiert, Dichtheitsprüfung", 13, "Mario Kolar"],
    ["pr-3", 14, "Wartung Stiege 1 bis 3, 18 Thermen", 21, "Thomas Bauer"],
    ["pr-3", 16, "Wartung Stiege 4 und 5, 16 Thermen", 12, "Ferdinand Gruber"],
    ["pr-3", 8, "Zweitermine Nachzügler, 8 Einheiten", 4, "Thomas Bauer"],
    ["pr-4", 15, "Bestandsaufnahme und Trassenplanung", 8, "Stefan Wieser"],
    ["pr-4", 12, "Verteiler gesetzt, Hauptleitung verlegt", 3, "Mario Kolar"],
    ["pr-5", 26, "Kollektoren montiert, Leitungen gedämmt", 68, "Ferdinand Gruber"],
    ["pr-5", 19, "Speicher gesetzt, Regelung parametriert", 61, "Mario Kolar"],
  ];
  return eintraege.map(([projektId, stunden, taetigkeit, tage, mitarbeiter], i) => ({
    id: `bu-${i + 1}`,
    projektId,
    mitarbeiter,
    datum: recentDate(tage),
    stunden,
    taetigkeit,
  }));
}

function seedActivities(): ActivityEntry[] {
  return [
    { id: "act-1", text: "Lieferschein erstellt", detail: "Müller Josef", time: formatActivityTime(0, 10, 32), icon: "📋", createdAt: Date.now() - 3600000 },
    { id: "act-2", text: "Angebot gesendet", detail: "Wohnbau Steyr AG | €6.800", time: formatActivityTime(0, 8, 15), icon: "📤", createdAt: Date.now() - 7200000 },
    { id: "act-3", text: "Rechnung bezahlt", detail: "Familie Mayer | €3.200", time: formatActivityTime(1, 16, 15), icon: "✅", createdAt: Date.now() - 86400000 },
    { id: "act-4", text: "Neuer Auftrag", detail: "Bauherr Hofmann", time: formatActivityTime(1, 14, 3), icon: "📥", createdAt: Date.now() - 90000000 },
    { id: "act-5", text: "Termin verschoben", detail: "Gruber → 28.06.", time: formatActivityTime(1, 9, 44), icon: "🔄", createdAt: Date.now() - 100000000 },
    { id: "act-6", text: "Reklamation eingegangen", detail: "Steindl Lagerverwaltung", time: formatActivityTime(2, 11, 20), icon: "⚠️", createdAt: Date.now() - 172800000 },
  ];
}

/* ========================================================================
   Context
   ======================================================================== */

const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState muss innerhalb von AppStateProvider verwendet werden");
  return ctx;
}

/* ========================================================================
   Provider
   ======================================================================== */

let idCounter = 100;
function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

/** Setzt die Demo auf den Ausgangsstand zurück. Danach ist ein Neuladen nötig. */
export function demoZuruecksetzen(): void {
  zuruecksetzen(typeof window === "undefined" ? null : window.localStorage);
}

/** Die sieben Datensätze, die einen Neuladen überleben. */
const GESPEICHERT = ["emails", "lieferscheine", "eingangsrechnungen",
  "ausgangsrechnungen", "projekte", "buchungen", "activities"] as const;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [emails, setEmails] = useState<Email[]>(seedEmails);
  const [lieferscheine, setLieferscheine] = useState<Lieferschein[]>(seedLieferscheine);
  const [eingangsrechnungen, setEingangsrechnungen] = useState<Eingangsrechnung[]>(seedEingangsrechnungen);
  const [ausgangsrechnungen, setAusgangsrechnungen] = useState<Ausgangsrechnung[]>(seedAusgangsrechnungen);
  const [projekte, setProjekte] = useState<Projekt[]>(seedProjekte);
  const [buchungen, setBuchungen] = useState<Buchung[]>(seedBuchungen);
  const [activities, setActivities] = useState<ActivityEntry[]>(seedActivities);

  // Persistenz in zwei Effects statt in sieben Hooks: die useState-Setter bleiben damit
  // für den React-Linter erkennbar stabil (ein Custom Hook verdeckt das und erzeugte
  // 16 falsch-positive exhaustive-deps-Warnungen), und es laufen zwei Effects statt 14.
  //
  // Der erste Render nimmt IMMER die Startwerte — auf dem Server gibt es kein
  // localStorage, ein abweichender erster Client-Render wäre ein Hydration-Fehler.
  // MUSS State sein, kein Ref: beide Effects laufen im selben Commit. Ein Ref wäre
  // beim ersten Durchlauf des Schreib-Effects schon true, während `emails` & Co. dort
  // noch die Startwerte sind — der Effect würde den gerade gelesenen Stand mit den
  // Seeds überschreiben. Gemessen: nach einem Reload lagen wieder 14 statt 15
  // Buchungen im Speicher. Als State greift das Flag erst im nächsten Render, also
  // dann, wenn die geladenen Werte sichtbar sind.
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    const sp = typeof window === "undefined" ? null : window.localStorage;
    if (!sp) return;
    /* Der zweite Render ist hier Absicht und die einzige SSR-sichere Variante: im
       useState-Initializer zu lesen würde den ersten Client-Render vom prerenderten
       HTML abweichen lassen, also genau den Hydration-Fehler erzeugen, den dieses
       Muster vermeidet. Der Block läuft genau einmal, danach sperrt `geladen`. */
    /* eslint-disable react-hooks/set-state-in-effect */
    setEmails((v) => lesen(sp, "emails", v));
    setLieferscheine((v) => lesen(sp, "lieferscheine", v));
    setEingangsrechnungen((v) => lesen(sp, "eingangsrechnungen", v));
    setAusgangsrechnungen((v) => lesen(sp, "ausgangsrechnungen", v));
    setProjekte((v) => lesen(sp, "projekte", v));
    setBuchungen((v) => lesen(sp, "buchungen", v));
    setActivities((v) => lesen(sp, "activities", v));
    setGeladen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!geladen) return; // sonst legt der erste Lauf die Startwerte darüber
    const sp = typeof window === "undefined" ? null : window.localStorage;
    const werte: Record<string, unknown> = { emails, lieferscheine, eingangsrechnungen,
      ausgangsrechnungen, projekte, buchungen, activities };
    for (const name of GESPEICHERT) schreiben(sp, name, werte[name]);
  }, [geladen, emails, lieferscheine, eingangsrechnungen, ausgangsrechnungen, projekte, buchungen, activities]);

  const unreadCount = emails.filter((e) => e.unread && !e.archived).length;

  const markAsRead = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, unread: false } : e))
    );
  }, []);

  const markAsReplied = useCallback((id: string) => {
    const email = emails.find((e) => e.id === id);
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, replied: true, unread: false } : e))
    );
    if (email) {
      setActivities((acts) => [
        {
          id: nextId("act"),
          text: "E-Mail beantwortet",
          detail: email.fromName,
          time: nowTimeStr(),
          icon: "📧",
          createdAt: Date.now(),
        },
        ...acts,
      ]);
    }
  }, [emails]);

  const nextLieferscheinNr = useCallback(() => {
    const maxNum = lieferscheine.reduce((max, ls) => {
      const match = ls.nr.match(/LS-\d{4}-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `LS-2026-${String(maxNum + 1).padStart(4, "0")}`;
  }, [lieferscheine]);

  const addLieferschein = useCallback((ls: Omit<Lieferschein, "id" | "createdAt">) => {
    const newLs: Lieferschein = {
      ...ls,
      id: nextId("ls"),
      createdAt: Date.now(),
    };
    setLieferscheine((prev) => [newLs, ...prev]);
    setActivities((prev) => [
      {
        id: nextId("act"),
        text: "Lieferschein erstellt",
        detail: `${ls.kunde} | ${ls.nr}`,
        time: nowTimeStr(),
        icon: "📋",
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  const addEingangsrechnung = useCallback((r: Omit<Eingangsrechnung, "id">) => {
    const newR: Eingangsrechnung = { ...r, id: nextId("er") };
    setEingangsrechnungen((prev) => [newR, ...prev]);
    setActivities((prev) => [
      {
        id: nextId("act"),
        text: "Beleg erfasst",
        detail: `${r.lieferant} | ${r.betrag}`,
        time: nowTimeStr(),
        icon: "📷",
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  // Email mutations
  const deleteEmail = useCallback((id: string) => {
    setEmails((prev) => {
      const email = prev.find((e) => e.id === id);
      if (email) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: "E-Mail gelöscht",
            detail: email.fromName,
            time: nowTimeStr(),
            icon: "📧",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const archiveEmail = useCallback((id: string) => {
    setEmails((prev) => {
      const email = prev.find((e) => e.id === id);
      if (email) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: "E-Mail archiviert",
            detail: email.fromName,
            time: nowTimeStr(),
            icon: "📧",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.map((e) => (e.id === id ? { ...e, archived: true } : e));
    });
  }, []);

  // Lieferschein mutations
  const deleteLieferschein = useCallback((id: string) => {
    setLieferscheine((prev) => {
      const ls = prev.find((l) => l.id === id);
      if (ls) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: "Lieferschein gelöscht",
            detail: `${ls.kunde} | ${ls.nr}`,
            time: nowTimeStr(),
            icon: "📋",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  const updateLieferscheinStatus = useCallback((id: string, status: Lieferschein["status"]) => {
    setLieferscheine((prev) => {
      const ls = prev.find((l) => l.id === id);
      if (ls) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: "Lieferschein-Status geändert",
            detail: `${ls.kunde} | ${status}`,
            time: nowTimeStr(),
            icon: "📋",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.map((l) =>
        l.id === id ? { ...l, status: status as Lieferschein["status"] } : l
      );
    });
  }, []);

  // Buchhaltung mutations
  const updateEingangStatus = useCallback((id: string, status: "gebucht" | "offen") => {
    setEingangsrechnungen((prev) => {
      const r = prev.find((e) => e.id === id);
      if (r) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: status === "gebucht" ? "Rechnung gebucht" : "Rechnung auf offen gesetzt",
            detail: `${r.lieferant} | ${r.betrag}`,
            time: nowTimeStr(),
            icon: "✅",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.map((e) => (e.id === id ? { ...e, status } : e));
    });
  }, []);

  const deleteEingangsrechnung = useCallback((id: string) => {
    setEingangsrechnungen((prev) => {
      const r = prev.find((e) => e.id === id);
      if (r) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: "Eingangsrechnung gelöscht",
            detail: `${r.lieferant} | ${r.betrag}`,
            time: nowTimeStr(),
            icon: "📷",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const updateAusgangStatus = useCallback((id: string, status: Ausgangsrechnung["status"]) => {
    setAusgangsrechnungen((prev) => {
      const r = prev.find((a) => a.id === id);
      if (r) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: status === "bezahlt" ? "Zahlung erhalten" : `Rechnung ${status}`,
            detail: `${r.kunde} | ${r.betrag}`,
            time: nowTimeStr(),
            icon: status === "bezahlt" ? "✅" : "📤",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.map((a) =>
        a.id === id ? { ...a, status: status as Ausgangsrechnung["status"] } : a
      );
    });
  }, []);

  const deleteAusgangsrechnung = useCallback((id: string) => {
    setAusgangsrechnungen((prev) => {
      const r = prev.find((a) => a.id === id);
      if (r) {
        setActivities((acts) => [
          {
            id: nextId("act"),
            text: "Ausgangsrechnung gelöscht",
            detail: `${r.kunde} | ${r.betrag}`,
            time: nowTimeStr(),
            icon: "📤",
            createdAt: Date.now(),
          },
          ...acts,
        ]);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Muster wie markAsReplied: den Datensatz VOR dem setState lesen und den
  // Aktivitäts-Eintrag danach setzen. Ein setActivities innerhalb des
  // setProjekte-Updaters liefe unter StrictMode zweimal und schriebe die Zeile doppelt.
  const addBuchung = useCallback((b: Omit<Buchung, "id">) => {
    const p = projekte.find((x) => x.id === b.projektId);
    setBuchungen((prev) => [{ ...b, id: nextId("bu") }, ...prev]);
    if (p) {
      setActivities((acts) => [
        {
          id: nextId("act"),
          text: "Stunden gebucht",
          detail: `${p.nr} | ${b.stunden.toLocaleString("de-AT")} h | ${b.mitarbeiter}`,
          time: nowTimeStr(),
          icon: "⏱️",
          createdAt: Date.now(),
        },
        ...acts,
      ]);
    }
  }, [projekte]);

  const deleteBuchung = useCallback((id: string) => {
    setBuchungen((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const setProjektStatus = useCallback((id: string, status: Projekt["status"]) => {
    const p = projekte.find((x) => x.id === id);
    setProjekte((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    if (p) {
      setActivities((acts) => [
        {
          id: nextId("act"),
          text: status === "abgeschlossen" ? "Projekt abgeschlossen" : "Projekt wieder eröffnet",
          detail: `${p.nr} | ${p.name}`,
          time: nowTimeStr(),
          icon: "📁",
          createdAt: Date.now(),
        },
        ...acts,
      ]);
    }
  }, [projekte]);

  const addActivity = useCallback((a: Omit<ActivityEntry, "id" | "createdAt">) => {
    setActivities((prev) => [
      { ...a, id: nextId("act"), createdAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const value: AppState = {
    emails,
    markAsRead,
    markAsReplied,
    deleteEmail,
    archiveEmail,
    unreadCount,
    lieferscheine,
    addLieferschein,
    deleteLieferschein,
    updateLieferscheinStatus,
    nextLieferscheinNr,
    eingangsrechnungen,
    ausgangsrechnungen,
    addEingangsrechnung,
    updateEingangStatus,
    deleteEingangsrechnung,
    updateAusgangStatus,
    deleteAusgangsrechnung,
    projekte,
    buchungen,
    addBuchung,
    deleteBuchung,
    setProjektStatus,
    activities,
    addActivity,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export { todayStr, nowTimeStr };
