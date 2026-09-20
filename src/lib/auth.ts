import NextAuth from "next-auth";
import { createAuthConfig } from "@/lib/werkflow/auth";
import { findeKonto, kontenLesen } from "@/lib/konten";
import { agroStahlRoles, istRolle } from "@/lib/roles";

/**
 * Anmeldung wie bei aluclip und xylovans: derselbe Auth-Baustein, dieselben
 * Rollen-Wildcards, dieselbe JWT-Sitzung. Einziger Unterschied ist die Quelle
 * der Konten — dort Prisma, hier eine Liste aus der Umgebung, weil die
 * Vorführung keine eigene Datenbank hat.
 */
const authConfig = createAuthConfig({
  roles: agroStahlRoles,
  signInPage: "/auth/login",
  orgId: "agro-stahl",
  async findUserByEmail(email: string) {
    // Bei jedem Anmeldeversuch frisch gelesen. Die Liste ist klein, und ein
    // Modul-Cache würde bedeuten, dass ein gesperrtes Konto bis zum nächsten
    // Deploy weiter hineinkommt.
    const konto = findeKonto(kontenLesen(process.env.AGRO_KONTEN, istRolle), email);
    if (!konto) return null;
    return {
      id: konto.id,
      email: konto.email,
      name: konto.name,
      password: konto.hash,
      role: konto.role,
      weitereRollen: [],
      active: konto.active,
      orgId: "agro-stahl",
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
