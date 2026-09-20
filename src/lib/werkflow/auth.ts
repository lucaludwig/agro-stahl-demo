/**
 * @werkflow/auth — dieselbe Standalone-Implementierung wie in aluclip und
 * xylovans. `createAuthConfig`, `defineRoles` und `createPermissionChecker`
 * sind absichtlich unverändert übernommen: eine Kopie, die abdriftet, ist
 * schlimmer als keine.
 *
 * Nicht übernommen wurde `applyStandortFilter`. AGRO-STAHL hat einen Betrieb
 * in Wundschuh und keine Filialen; ein Filter auf ein Feld, das es hier nicht
 * gibt, wäre toter Code, der beim nächsten Lesen wie eine Zusicherung aussieht.
 */

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/** Rollen-Map: Rollenname -> Liste von Permissions (z.B. 'anfragen:read', '*') */
export type RoleMap = Record<string, string[]>;

/** Minimaler User wie von findUserByEmail zurückgegeben */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  /** bcrypt-Hash, nie Klartext. */
  password: string;
  role: string;
  /** Weitere Rollen derselben Person, zusätzlich zu role. */
  weitereRollen?: string[];
  active: boolean;
  orgId?: string | null;
}

interface AuthConfigOptions {
  roles: RoleMap;
  signInPage: string;
  orgId: string;
  findUserByEmail: (email: string) => Promise<AuthUser | null>;
}

export function createAuthConfig(opts: AuthConfigOptions): NextAuthConfig {
  const { signInPage, orgId, findUserByEmail } = opts;

  return {
    pages: {
      signIn: signInPage,
    },
    providers: [
      Credentials({
        name: "credentials",
        credentials: {
          email: { label: "E-Mail", type: "email" },
          password: { label: "Passwort", type: "password" },
        },
        async authorize(credentials) {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;
          if (!email || !password) return null;

          const user = await findUserByEmail(email);
          if (!user) return null;
          if (!user.active) return null;

          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            weitereRollen: user.weitereRollen ?? [],
            orgId: user.orgId ?? orgId,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        // `user` ist nur beim ersten Aufruf nach der Anmeldung gesetzt. Die
        // Kennung wird mitgeprüft, weil next-auth sie als optional führt: ohne
        // sie entstünde ein Token, dessen `id` undefined ist, während der Typ
        // einen String zusichert — genau die Sorte Lüge, die erst drei Ebenen
        // später auffällt.
        if (user?.id) {
          const u = user as unknown as Record<string, unknown>;
          token.id = user.id;
          token.role = u.role as string;
          token.weitereRollen = (u.weitereRollen as string[]) ?? [];
          token.orgId = u.orgId as string;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          const s = session.user as unknown as Record<string, unknown>;
          session.user.id = token.id as string;
          s.role = token.role;
          s.weitereRollen = token.weitereRollen ?? [];
          s.orgId = token.orgId;
        }
        return session;
      },
    },
    session: {
      strategy: "jwt",
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  };
}

/**
 * Definiert eine Rollen-Map. Gibt das Objekt typsicher zurück.
 * Dient primär als semantische Markierung + TS-Typisierung.
 */
export function defineRoles<T extends RoleMap>(roleMap: T): T {
  return roleMap;
}

/**
 * Erzeugt eine hasPermission-Funktion mit Wildcard-Support.
 *
 * - Rolle hat '*'         -> alles erlaubt
 * - Rolle hat 'anfragen:*' -> 'anfragen:read', 'anfragen:create' usw. erlaubt
 * - Exakter Match          -> erlaubt
 */
export function createPermissionChecker(roles: RoleMap) {
  return function hasPermission(role: string, permission: string): boolean {
    const perms = roles[role];
    if (!perms) return false;

    if (perms.includes("*")) return true;
    if (perms.includes(permission)) return true;

    const [namespace] = permission.split(":");
    if (namespace && perms.includes(`${namespace}:*`)) return true;

    return false;
  };
}
