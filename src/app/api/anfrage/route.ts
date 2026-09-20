/**
 * Transkript -> ausgefülltes Anfrageformular.
 *
 * Die Felder sind die aus Martina Schlögls Mail vom 18.09.2026, eins zu eins.
 * Das Modell füllt nur, was tatsächlich gesagt wurde; alles andere bleibt null
 * und wird in der Maske als Lücke angezeigt. Ein geratenes Feld wäre für das
 * Büro teurer als ein leeres — es muss geprüft werden, sieht aber fertig aus.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const maxDuration = 120;

const AnfrageSchema = z.object({
  vorgangsart: z
    .enum(["angebot", "auftrag"])
    .describe(
      "angebot nur, wenn ausdrücklich von einem Angebot oder Kostenvoranschlag die Rede ist, sonst auftrag",
    ),
  name: z
    .string()
    .nullable()
    .describe("Name des Kunden oder der Firma, wörtlich wie genannt"),
  telefonnummer: z.string().nullable(),
  kundentyp: z
    .enum(["neu", "bestand"])
    .nullable()
    .describe(
      "bestand, wenn von einem bekannten oder Stammkunden die Rede ist; neu nur bei ausdrücklichem Hinweis; sonst null",
    ),
  adresse: z.string().nullable().describe("nur wenn genannt"),
  anliegen: z.object({
    material: z.string().nullable().describe("welches Material, wenn genannt"),
    anfertigung: z.string().nullable().describe("was neu angefertigt wird"),
    reparatur: z.string().nullable().describe("was repariert werden soll"),
    produkt: z.string().nullable().describe("welches Produkt betroffen ist"),
    infos: z
      .string()
      .nullable()
      .describe(
        "Sonstiges zum Vorgang: vereinbarter Preis, Rabatt, Besonderheiten",
      ),
  }),
  fertigstellung: z
    .string()
    .nullable()
    .describe(
      "Termin wörtlich wie gesagt, etwa 'bis Ende nächster Woche'. Kein Datum ausrechnen, bei keiner Angabe null",
    ),
  mitarbeiter: z
    .string()
    .nullable()
    .describe("nur wenn ein Mitarbeiter namentlich zugeteilt wurde"),
  unsicher: z
    .array(z.string())
    .describe(
      "Feldnamen, deren Wert im Transkript undeutlich war, etwa ein schwer verständlicher Eigenname. Leeres Array, wenn alles klar war",
    ),
});

const SYSTEM = `Du erfasst Kundenanfragen für AGRO-STAHL Agrartechnik & Stahlbau GmbH in Wundschuh, Steiermark.

Der Betrieb: Schlosserei und Metallbau. Baut selbst entwickelte Kiwi-Erntemaschinen und Kiwischieber, macht Bodenbearbeitungsgeräte, repariert Container und Müllpressen für Entsorger wie Saubermacher und FCC, und fertigt Ersatzteile an, die es nicht mehr zu kaufen gibt. Kunden sind Landwirte aus der Umgebung und größere Entsorgungsbetriebe. Im Büro arbeiten Martina und Klemens, in der Werkstatt unter anderem Schmidt.

Du bekommst das Transkript einer Sprachnachricht, die der Chef nach einem Kundengespräch aufgenommen hat. Er spricht steirisch, frei und ohne Struktur.

Regeln:
- Trage nur ein, was tatsächlich gesagt wurde. Was nicht vorkommt, bleibt null. Rate nichts dazu, auch nicht Plausibles.
- Die Spracherkennung verhört sich bei Fachbegriffen. Zieh sie im Kontext des Betriebs gerade: "Kivischieber" oder "Küwischieber" ist ein Kiwischieber, "Saubermacher" kann als Firmenname auftauchen.
- Bei Eigennamen von Kunden gilt das nicht: schreib sie so, wie sie im Transkript stehen, und nenn das Feld in "unsicher", wenn der Name undeutlich war. Ein falsch geratener Kundenname ist schlimmer als ein markierter.
- Ein Preis oder Rabatt gehört nach "infos".
- Angebot nur, wenn ausdrücklich eines verlangt wurde. Im Normalfall ist es ein Auftrag.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Auswertung ist auf diesem Deployment nicht konfiguriert." },
      { status: 503 },
    );
  }

  let transkript = "";
  try {
    const body = (await request.json()) as { transkript?: unknown };
    transkript = typeof body.transkript === "string" ? body.transkript.trim() : "";
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!transkript) {
    return Response.json({ error: "Kein Transkript übergeben." }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const antwort = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4000,
      system: SYSTEM,
      output_config: {
        format: zodOutputFormat(AnfrageSchema),
        // Strukturierte Extraktion aus wenigen Sätzen ist keine harte Aufgabe,
        // und die Vorführung läuft live vor dem Kunden — hier zählt die
        // Antwortzeit mehr als die letzten Prozent Gründlichkeit.
        effort: "low",
      },
      messages: [
        {
          role: "user",
          content: `Sprachnachricht des Chefs:\n\n${transkript}`,
        },
      ],
    });

    if (antwort.stop_reason === "refusal") {
      return Response.json(
        { error: "Die Auswertung wurde abgelehnt." },
        { status: 502 },
      );
    }

    if (!antwort.parsed_output) {
      return Response.json(
        { error: "Die Auswertung ergab kein verwertbares Formular." },
        { status: 502 },
      );
    }

    return Response.json({ anfrage: antwort.parsed_output });
  } catch (fehler) {
    if (fehler instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Gerade zu viele Anfragen. Bitte kurz warten." },
        { status: 429 },
      );
    }
    if (fehler instanceof Anthropic.APIError) {
      return Response.json(
        { error: "Auswertung fehlgeschlagen." },
        { status: 502 },
      );
    }
    throw fehler;
  }
}
