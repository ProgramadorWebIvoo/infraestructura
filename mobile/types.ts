import { Ionicons } from "@expo/vector-icons";

export type ProjectStatus =
  | "CREADO"
  | "REVISADO_CIERRE"
  | "CONFIRMADO_PROCURA"
  | "COMPARATIVA_ENVIADA"
  | "CONTRATADO"
  | "EN_EJECUCION"
  | "VERIFICANDO_FINALIZACION"
  | "LISTO_PAGO_FINAL"
  | "COMPLETADO_PAGADO";

export type MaterialItem = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
};

export type Proposal = {
  id: string;
  contractorCode: string;
  contractorName: string;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  deliveryWeeks: number;
  negotiatedAdvancePercent: number;
  description: string;
};

export type Project = {
  id: string;
  title: string;
  type: "INFRAESTRUCTURA" | "MANTENIMIENTO";
  description: string;
  location: string;
  createdDate: string;
  status: ProjectStatus;
  materials: MaterialItem[];
  estimatedTotal: number;
  cierreObraNotes?: string | null;
  calculationsAdded?: boolean;
  blueprintsCount?: number;
  procuraReviewNotes?: string | null;
  approvedInvestmentAmount?: number | null;
  proposals?: Proposal[];
  selectedContractorCode?: string | null;
  selectedProposalId?: string | null;
  advancePaidAmount?: number | null;
  advancePaidDate?: string | null;
  finalPaidAmount?: number | null;
  finalPaidDate?: string | null;
  qualityVerified?: boolean;
  completionVerifiedDate?: string | null;
};

export type Contractor = {
  code: string;
  name: string;
  specialty: string;
  rating: number;
  contact: string;
  status?: string;
};

export type AuditLog = {
  id: string;
  projectId: string;
  projectTitle: string;
  role: string;
  action: string;
  timestamp: string;
  details?: string;
};

export type Screen =
  | "presidencia"
  | "infraestructura"
  | "cierre"
  | "procura"
  | "analistas"
  | "finanzas"
  | "proveedores"
  | "registro";

export const screens: Array<{ key: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "presidencia", label: "Presidencia", icon: "trending-up" },
  { key: "infraestructura", label: "Infra", icon: "business" },
  { key: "cierre", label: "Cierre", icon: "checkbox" },
  { key: "procura", label: "Procura", icon: "search" },
  { key: "analistas", label: "Analistas", icon: "people" },
  { key: "finanzas", label: "Finanzas", icon: "cash" },
  { key: "proveedores", label: "Proveedores", icon: "construct" },
  { key: "registro", label: "Registro", icon: "person-add" },
];

export const statusLabels: Record<ProjectStatus, string> = {
  CREADO: "Creado",
  REVISADO_CIERRE: "Revisado",
  CONFIRMADO_PROCURA: "Procura OK",
  COMPARATIVA_ENVIADA: "Comparativa",
  CONTRATADO: "Contratado",
  EN_EJECUCION: "Ejecución",
  VERIFICANDO_FINALIZACION: "Verificando",
  LISTO_PAGO_FINAL: "Pago final",
  COMPLETADO_PAGADO: "Completado",
};

export const statusColors: Record<ProjectStatus, string> = {
  CREADO: "#0ea5e9",
  REVISADO_CIERRE: "#3b82f6",
  CONFIRMADO_PROCURA: "#a855f7",
  COMPARATIVA_ENVIADA: "#f59e0b",
  CONTRATADO: "#6366f1",
  EN_EJECUCION: "#06b6d4",
  VERIFICANDO_FINALIZACION: "#f97316",
  LISTO_PAGO_FINAL: "#f43f5e",
  COMPLETADO_PAGADO: "#10b981",
};
