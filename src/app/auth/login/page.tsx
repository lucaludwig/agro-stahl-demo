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
  const [code, setCode] = useState("");
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
      password: code,
      redirect: false,
    });

    if (ergebnis?.error) {
      // Bewusst ohne Unterscheidung zwischen unbekannter Adresse und falschem
      // Code — die Unterscheidung verrät, welche Adressen es gibt.
      setFehler("E-Mail oder Code stimmt nicht.");
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
          className="mb-1.5 block text-sm font-medium text-[#18324d]"
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
          className="w-full rounded-lg border border-[#cbd5df] px-3.5 py-2.5 text-[15px] text-[#18324d] outline-none focus:border-[#0d2d50] focus:ring-2 focus:ring-[#0d2d50]/15"
        />
      </div>

      <div>
        <label
          htmlFor="code"
          className="mb-1.5 block text-sm font-medium text-[#18324d]"
        >
          4-stelliger Code
        </label>
        <input
          id="code"
          type="password"
          autoComplete="current-password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          minLength={4}
          maxLength={4}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-lg border border-[#cbd5df] px-3.5 py-2.5 text-[15px] text-[#18324d] outline-none focus:border-[#0d2d50] focus:ring-2 focus:ring-[#0d2d50]/15"
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
        className="w-full rounded-lg bg-[#0d2d50] px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#174470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d2d50] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {laeuft ? "Wird geprüft …" : "Anmelden"}
      </button>
    </form>
  );
}

export default function LoginSeite() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f6f8fa] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[15px] font-bold tracking-[0.06em] text-[#0d2d50]">AGRO-STAHL</p>
          <p className="mt-1 text-xs text-[#526375]">Agrartechnik & Stahlbau GmbH</p>
          <h1 className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-[#0d2d50]">
            Spracherfassung
          </h1>
          <p className="mt-2 text-sm text-[#526375]">
            Melden Sie sich mit Ihren Zugangsdaten an.
          </p>
        </div>

        <div className="rounded-xl border border-[#dce3e9] bg-white p-6">
          {/* useSearchParams braucht eine Suspense-Grenze, sonst schlägt der
              Build beim Vorrendern dieser Seite fehl. */}
          <Suspense fallback={<p className="text-sm text-[#526375]">Lädt …</p>}>
            <Formular />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
