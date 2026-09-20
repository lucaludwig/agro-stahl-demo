import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import SpracheClient from "./SpracheClient";

/**
 * Holt die angemeldete Person und reicht sie an den Client-Teil weiter.
 *
 * Die Aufnahme braucht das Mikrofon und damit eine Client-Komponente; die
 * Sitzung gehört auf den Server. Darum die Teilung: hier `auth()`, dort der
 * Recorder.
 */
export default async function SprachePage() {
  const session = await auth();
  const rolle = session?.user?.role;

  // Der Proxy leitet Unangemeldete schon um. Wenn diese Seite trotzdem ohne
  // Sitzung gerendert wird, ist etwas an der Kette kaputt — dann hier enden und
  // nicht mit leeren Angaben weiterrendern.
  if (!session?.user || !rolle) {
    redirect("/auth/login?weiter=/sprache");
  }

  return (
    <SpracheClient
      name={session.user.name ?? session.user.email ?? "Angemeldet"}
      rolle={rolle}
      darfAufnehmen={hasPermission(rolle, "anfragen:create")}
    />
  );
}
