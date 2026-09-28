"use client";

/**
 * Anmeldung. Gleiche Kette wie bei aluclip und xylovans (Credentials, bcrypt,
 * JWT), nur im Erscheinungsbild der AGRO-STAHL-Vorführung.
 */

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

// Ein gemeinsamer Demo-Code kann keine Rollen unterscheiden; er öffnet das GF-Konto.
const DEMO_KONTO = "chef@agro-stahl.at";

function Formular() {
  const router = useRouter();
  const suche = useSearchParams();
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
      email: DEMO_KONTO,
      password: code,
      redirect: false,
    });

    if (ergebnis?.error) {
      setFehler("Der Code stimmt nicht.");
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
          htmlFor="code"
          className="mb-1.5 block text-sm font-medium text-[var(--agro-navy)]"
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
          aria-invalid={Boolean(fehler)}
          aria-describedby={fehler ? "code-fehler" : undefined}
          onChange={(e) => {
            setCode(e.target.value);
            setFehler(null);
          }}
          className="w-full rounded-lg border border-[var(--agro-line)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--agro-navy)] outline-none focus:border-[var(--agro-navy)] focus:ring-2 focus:ring-[var(--agro-yellow)]"
        />
      </div>

      {fehler && (
        <p
          id="code-fehler"
          role="alert"
          className="rounded-lg border border-[#e8c4c4] bg-[#fbeaea] px-4 py-3 text-sm text-[#c23b3b]"
        >
          {fehler}
        </p>
      )}

      <button
        type="submit"
        disabled={laeuft}
        className="w-full rounded-lg bg-[var(--agro-yellow)] px-4 py-3 text-[15px] font-semibold text-[var(--agro-navy)] transition-colors hover:bg-[#eab400] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--agro-navy)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {laeuft ? "Wird geprüft …" : "Anmelden"}
      </button>
    </form>
  );
}

export default function LoginSeite() {
  return (
    <div className="agro-ui flex min-h-dvh items-center justify-center bg-[var(--agro-navy)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/agro-stahl-logo.png"
            alt="AGRO-STAHL"
            width={240}
            height={61}
            priority
            unoptimized
            className="mx-auto h-auto w-60"
          />
          <h1 className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-white">
            Spracherfassung
          </h1>
          <p className="mt-2 text-sm text-[#c4cdd5]">
            Geben Sie Ihren vierstelligen Zugangscode ein.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6">
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
