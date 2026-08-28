/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Utilidades para gestionar propuestas del portal de proveedores.
 */

import type { Proposal } from "../../../types";

/**
 * Calcula cuántas propuestas del portal aún están pendientes de importar.
 * @param allPortalProposals - Total de propuestas disponibles en el portal
 * @param loadedProposals - Propuestas ya cargadas en el proyecto
 * @returns Número de propuestas pendientes (nunca negativo)
 */
export function calculatePendingPortalProposals(allPortalProposals: number, loadedProposals: Proposal[]): number {
  const importedFromPortal = loadedProposals.filter(p => p.origen === "PORTAL-PROV").length;
  return Math.max(0, allPortalProposals - importedFromPortal);
}
