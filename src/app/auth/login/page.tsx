"use client";

/**
 * Anmeldung. Gleiche Kette wie bei aluclip und xylovans (Credentials, bcrypt,
 * JWT), nur im Erscheinungsbild der AGRO-STAHL-Vorführung.
 */

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function Formular() {
  const router = useRouter();
  const suche = useSearchParams();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  // Nur ein Pfad auf dieser Seite, nie eine fremde Adresse: sonst wäre die
  // Anmeldung eine offene Weiterleitung.
  const rohesZiel = suche.get("weiter") ?? "";
  const ziel = rohesZiel.startsWith("/") && !rohesZiel.startsWith("//")
    ? rohesZiel
    : "/sprache";

  async function absenden(ereignis: React.FormEvent) {
    ereignis.preventDefault();
    setFehler(null);
    setLaeuft(true);

    const ergebnis = await signIn("credentials", {
      email,
      password: passwort,
      redirect: false,
    });

    if (ergebnis?.error) {
      // Bewusst ohne Unterscheidung zwischen unbekannter Adresse und falschem
      // Passwort — die Unterscheidung verrät, welche Adressen es gibt.
      setFehler("E-Mail oder Passwort stimmt nicht.");
      setLaeuft(false);
      return;
    }

    router.push(ziel);
    router.refresh();
  }

  return (
    <form onSubmit={absenden} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-semibold text-[#0d2d50]"
        >
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[#d7e0ea] px-3.5 py-2.5 text-[15px] text-[#0d2d50] outline-none focus:border-[#0078d4] focus:ring-2 focus:ring-[#0078d4]/20"
        />
      </div>

      <div>
        <label
          htmlFor="passwort"
          className="mb-1.5 block text-sm font-semibold text-[#0d2d50]"
        >
          Passwort
        </label>
        <input
          id="passwort"
          type="password"
          autoComplete="current-password"
          required
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          className="w-full rounded-lg border border-[#d7e0ea] px-3.5 py-2.5 text-[15px] text-[#0d2d50] outline-none focus:border-[#0078d4] focus:ring-2 focus:ring-[#0078d4]/20"
        />
      </div>

      {fehler && (
        <p
          role="alert"
          className="rounded-lg border border-[#e8c4c4] bg-[#fbeaea] px-4 py-3 text-sm text-[#c23b3b]"
        >
          {fehler}
        </p>
      )}

      <button
        type="submit"
        disabled={laeuft}
        className="w-full rounded-lg bg-[#0078d4] px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0066b8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {laeuft ? "Wird geprüft …" : "Anmelden"}
      </button>
    </form>
  );
}

export default function LoginSeite() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f4f7fa] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-[#e8f2fc] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0078d4]">
            AGRO-STAHL x werkflow
          </span>
          <h1 className="mt-3 text-xl font-bold text-[#0d2d50]">Anmelden</h1>
        </div>

        <div className="rounded-2xl border border-[#d7e0ea] bg-white p-6 shadow-[0_8px_24px_rgba(13,45,80,0.06)]">
          {/* useSearchParams braucht eine Suspense-Grenze, sonst schlägt der
              Build beim Vorrendern dieser Seite fehl. */}
          <Suspense fallback={<p className="text-sm text-[#8a97a6]">Lädt …</p>}>
            <Formular />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
