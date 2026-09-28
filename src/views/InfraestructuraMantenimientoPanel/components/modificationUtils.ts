import type { SemanticColor } from "@/components/UI/colorTokens";
import type { ModificationStatus, ModificationType } from "@/hooks/useProjectModifications";

export const MODIFICATION_STATUS: Record<ModificationStatus, { label: string; color: SemanticColor }> = {
  PENDIENTE: { label: "Pendiente de Auditoría", color: "warning" },
  APROBADA: { label: "Aprobada", color: "success" },
  RECHAZADA: { label: "Rechazada", color: "danger" },
};

export const MODIFICATION_TYPE_LABEL: Record<ModificationType, string> = {
  AUMENTO: "Aumento",
  DISMINUCION: "Disminución",
};

/** Variación firmada de una línea: aumento suma, disminución resta. */
export function signedQuantity(type: ModificationType, quantity: number): number {
  return type === "AUMENTO" ? quantity : -quantity;
}

export interface DraftLine {
  materialId: string;
  type: ModificationType;
  quantity: number | "";
}

/** Cantidad final = contratado + aprobadas; una disminución no puede dejarla bajo cero. */
export function lineError(line: DraftLine, finalQuantity: number | undefined): string | null {
  if (!line.materialId) return "Elija una partida.";
  if (line.quantity === "" || line.quantity <= 0) return "Ingrese una cantidad mayor a cero.";
  if (line.type === "DISMINUCION" && finalQuantity !== undefined && line.quantity > finalQuantity) {
    return `No puede disminuir más de ${finalQuantity} (cantidad vigente).`;
  }
  return null;
}
