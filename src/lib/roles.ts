import { defineRoles, createPermissionChecker } from "@/lib/werkflow/auth";

/**
 * Rollen bei AGRO-STAHL, abgeleitet aus dem Potenzialanalyse-Gespräch vom
 * 01.09.2026 und Martina Schlögls Mail vom 18.09.2026.
 *
 * Das Büro darf Anfragen anlegen, nicht nur der Chef: Anfragen kommen laut
 * Gespräch auch per Mail und Telefon herein, und dann sitzt Martina am Apparat.
 * Die Werkstatt sieht, was ihr zugewiesen wurde, und ändert daran nichts — das
 * Erstellen des Auftrags bleibt laut Mail bei Martina und Klemens.
 */
export const agroStahlRoles = defineRoles({
  GF: ["*"],
  BUERO: ["anfragen:*"],
  WERKSTATT: ["anfragen:read"],
});

export type AgroRolle = keyof typeof agroStahlRoles;

export const ROLLEN_NAMEN = Object.keys(agroStahlRoles) as AgroRolle[];

export function istRolle(wert: unknown): wert is AgroRolle {
  return typeof wert === "string" && Object.hasOwn(agroStahlRoles, wert);
}

export const hasPermission = createPermissionChecker(agroStahlRoles);
