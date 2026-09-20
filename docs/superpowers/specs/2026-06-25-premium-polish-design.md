# werkflow Demo: Premium Polish Design Spec

Ziel: demo.werkflow.at soll sich anfuehlen wie ein Produktionssystem das 50.000 EUR gekostet hat. Jeder Handwerker der es sieht will es haben.

## 1. Typografie und Spacing

### Probleme aktuell
- Inkonsistente Font-Sizes (text-xl, text-2xl, text-sm wild gemischt)
- Kein vertikaler Rhythmus (Abstande per Gefuehl statt System)
- Em-Dashes (---) ueberall in User-facing Text

### Loesung
- 4px Spacing-Skala: 4, 8, 12, 16, 24, 32, 48, 64
- Typografie-Hierarchie: Page Title (24px/700), Section Header (16px/600), Body (14px/400), Label (11px/600 uppercase tracking), Caption (12px/400)
- Alle Em-Dashes durch Bindestriche, Kommas oder Zeilenumbrueche ersetzen
- Alle Mittelpunkte (·) durch Pipe (|) oder eigene Zeile ersetzen

## 2. Farb-Refinement

### Probleme aktuell
- Zu viele Inline-Farben (var(--navy), var(--blue), var(--red) etc.)
- Kein semantisches System (Erfolg, Warnung, Gefahr, Info)
- Navy Headers auf allen Cards wirken monoton

### Loesung
- Semantische Farben: success (#107c10), warning (#d4850d), danger (#d13438), info (#0078d4)
- Card-Headers: nur wo noetig (Kalender, Tabellen). Sonst schlichte Ueberschrift + Divider
- Hintergrund-Abstufungen: page-bg (#f4f6f9), card-bg (#ffffff), subtle-bg (#f8fafb), muted-bg (#eef2f6)
- Akzentfarbe sparsam: nur CTAs und aktive States

## 3. Micro-Interactions

### Aktuell fehlt
- Buttons haben keinen Press-State
- Cards haben keinen Hover
- Keine Transitions bei State-Changes
- Kein visuelles Feedback bei Aktionen

### Hinzufuegen
- Button Press: scale(0.97) + leichter Shadow-Change (60ms)
- Card Hover: translateY(-1px) + Shadow-Erhoehung (150ms)
- State-Transitions: opacity + translateY fuer einblendende Elemente (200ms)
- Erfolgs-Feedback: Checkmark-Animation nach Aktion (300ms)
- Focus-States: 2px blue ring auf allen interaktiven Elementen

## 4. Dashboard Refinement

### Aktuell
- KPI-Cards sind schlicht (nur Zahl + Label)
- Keine Trend-Indikatoren
- Aktivitaeten-Liste ist eine einfache Aufzaehlung

### Upgrade
- KPI-Cards: Zahl + Label + Trend-Pfeil (oben/unten) + Vergleich zum Vormonat ("12% mehr als Mai")
- Zeitersparnis-Karte (prominent): "Sie sparen ca. 12 Stunden/Woche durch werkflow" mit Aufschluesselung (Lieferscheine: 4h, Rechnungen: 3h, Emails: 3h, Nachkalkulation: 2h)
- Termine: Zeitstrahl statt Liste (vertikale Linie links, Punkte drauf, aktueller Termin hervorgehoben)
- Aktivitaeten: Avatare/Initialen statt Emojis

## 5. Lieferschein-Flow

### Aktuell
- Sprachaufnahme funktioniert, aber wirkt technisch
- Kein Fortschrittsindikator
- Abschluss ist abrupt (nur Toast)

### Upgrade
- 4-Schritt Progress-Bar oben: Aufnahme > Pruefung > Unterschrift > Fertig
- Mikrofon-Button: groesser (64px), pulsiert sanft waehrend Aufnahme, Wellenform-Indikator
- Nach Spracherkennung: Felder einzeln einblenden mit Highlight-Animation (nicht alle gleichzeitig)
- Unterschrift-Canvas: groesserer Bereich (160px), "Hier unterschreiben" Placeholder-Text
- Abschluss: Success-Screen (gruener Haken, "Lieferschein LS-2026-007 erstellt", Buttons: "Naechster Termin" / "PDF anzeigen")

## 6. Posteingang

### Aktuell
- Funktional korrekt, aber sieht aus wie eine einfache Liste
- KI-Entwurf ist ein grauer Block

### Upgrade
- Unread-Emails: linke Borderlinie blau (3px), Betreff fett
- Kategorie-Badges: farbige Punkte statt Text-Badges (platzsparender)
- Detail-Panel: Email-Body in einem "Paper"-Container (leichter Shadow, leicht abgerundete Ecken)
- KI-Entwurf: eigene Karte mit blauem Left-Border, "KI" Badge, editierbarer Textarea standardmaessig
- Antwort-Compose: richtiger Editor-Look (Toolbar-Leiste oben: Fett, Kursiv, Aufzaehlung, auch wenn nur visuell)
- Status nach Senden: Email-Eintrag in der Liste bekommt gruenen Haken + "Beantwortet" Label

## 7. Buchhaltung

### Aktuell
- Solide Tabelle, aber keine Zusammenfassung auf einen Blick
- Beleg-Upload ist ein einzelner Button

### Upgrade
- Summary-Bar oben: 3 Karten nebeneinander (Offen: €X.XXX | Gebucht diesen Monat: €X.XXX | Ueberfaellig: €X.XXX)
- Tabellen-Zeilen: Hover-State mit Action-Buttons (Ansehen, Buchen, Mahnen)
- Ueberfaellige Zeilen: leichter roter Hintergrund
- Beleg-Upload: Drag-Area ("Beleg hierher ziehen oder fotografieren") statt nur Button
- Kamera-Preview: wenn Foto aufgenommen, Thumbnail in der neuen Zeile anzeigen

## 8. Chat-Widget

### Aktuell
- Funktional, aber sieht aus wie ein Minimum-Chat

### Upgrade
- Floating Button: Pulsiert leicht beim ersten Besuch (1x, dann still)
- Chat-Panel: Glasmorphism-Effekt (backdrop-blur, leichte Transparenz)
- Bot-Nachrichten: kleines werkflow-Icon statt "B"
- Zahlen in Bot-Antworten: fett hervorgehoben
- Quick-Actions: 3 vorgefertigte Fragen als Chips unter dem Input ("Offene Angebote", "Umsatz", "Ueberfaellige Rechnungen")

## 9. Shell und Navigation

### Aktuell
- Solide, aber generisch

### Upgrade
- Aktiver Nav-Item: Bottom-Border (3px, accent blue) statt Background-Change
- Notification-Dot auf Posteingang (rot, wenn ungelesen > 0)
- User-Avatar: Initialen in einem Kreis mit Gradient (navy zu blue)
- Breadcrumb auf Unterseiten: "Dashboard / Lieferscheine" in kleiner Schrift unter dem Header

## 10. Globale Qualitaet

- Alle Texte: korrekte deutsche Interpunktion, keine Em-Dashes, keine ASCII-Umlaute
- Leer-Zustaende: illustrativ ("Keine offenen Rechnungen" mit dezenter Grafik/Icon)
- Konsistente Border-Radius: 8px fuer kleine Elemente, 12px fuer Cards, 16px fuer Modals
- Konsistente Shadows: sm (0 1px 3px rgba(0,0,0,0.08)), md (0 4px 12px rgba(0,0,0,0.1)), lg (0 8px 24px rgba(0,0,0,0.12))
- Touch-Targets: minimum 44px auf allen interaktiven Elementen
- Scroll-Verhalten: smooth, keine Jumps

## Nicht in Scope
- Echtes Backend / API
- Echte KI-Antworten (Pattern-Matching bleibt)
- Multi-User / Auth
- Offline-Persistenz (State lebt in React Context)
