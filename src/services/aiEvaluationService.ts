/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Servicio de Evaluación Inteligente de Ofertas.
 * Comunica con el endpoint Laravel POST /api/ai/evaluate-proposals
 * que orquesta ChatGPT → Gemini → Claude con failover automático.
 */

import type { MaterialItem, Project, Proposal } from "../types";
import { apiFetch } from "./api";

// ---------------------------------------------------------------------------
// Evaluación de expediente (Cierre de Obra)
// ---------------------------------------------------------------------------

/**
 * Evalúa el expediente completo de un proyecto (Cierre de Obra) — score de
 * completitud/riesgo, alertas, resumen, recomendación y monto sugerido.
 * A diferencia de evaluateProposals(), devuelve el Project completo con
 * los campos dossierAi* ya persistidos (mismo patrón que review()/
 * approveInvestment()), no un resultado suelto.
 */
export async function evaluateDossier(projectId: string, authToken: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}/evaluate-dossier`, {
    method: "POST",
    token: authToken,
  });
}

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Proveedor que ejecutó la evaluación (para logging/transparencia). */
export type AIProviderUsed = "chatgpt" | "gemini" | "claude";

/** Resultado devuelto por el backend AI. */
export interface AIEvaluationResult {
  winnerContractorCode: string;
  winnerContractorName: string;
  confidenceScore: number; // 0–100
  summary: string;
  strengths: string[];
  weaknesses: string[];
  riskFactors: string[];
  recommendation: string;
  providerUsed: AIProviderUsed;
  attemptLog?: string[];
}

/** Tipo de propuesta para enviar al backend (derivado de Proposal). */
type AIEvaluationProposalPayload = Pick<Proposal,
  "id" | "contractorCode" | "contractorName" | "contractorRating" |
  "materialCost" | "laborCost" | "totalCost" | "deliveryWeeks" |
  "negotiatedAdvancePercent" | "description" |
  "materialItems" | "durationValue" | "durationUnit" | "origen" |
  "precioAnterior" | "precioNuevo" | "diferencia" | "motivo" |
  "motivoAnticipoExcedido" | "fechaOferta"
>;

type AIEvaluationMaterialPayload = Pick<MaterialItem,
  "name" | "quantity" | "unit" | "estimatedUnitPrice" | "condition"
>;

/** Cuerpo enviado al backend. */
interface AIEvaluationPayload {
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  projectType: string;
  approvedInvestmentAmount: number;
  estimatedTotal?: number;
  materials?: AIEvaluationMaterialPayload[];
  proposals: AIEvaluationProposalPayload[];
  provider?: 'chatgpt' | 'gemini' | 'claude';
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

/**
 * Evalúa las propuestas de un proyecto usando el proxy AI del backend Laravel.
 * El backend orquesta ChatGPT → Gemini → Claude con failover automático.
 */
export async function evaluateProposals(
  project: Project,
  proposals: Proposal[],
  authToken: string,
  provider?: 'chatgpt' | 'gemini' | 'claude',
): Promise<AIEvaluationResult> {
  const payload: AIEvaluationPayload = {
    projectId: project.id,
    projectTitle: project.title,
    projectDescription: project.description,
    projectLocation: project.location,
    projectType: project.type,
    approvedInvestmentAmount: project.approvedInvestmentAmount ?? 0,
    estimatedTotal: project.estimatedTotal,
    materials: (project.materials ?? []).map<AIEvaluationMaterialPayload>((m) => ({
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
      estimatedUnitPrice: m.estimatedUnitPrice,
      condition: m.condition,
    })),
    proposals: proposals.map<AIEvaluationProposalPayload>((p) => ({
      id: p.id,
      contractorCode: p.contractorCode,
      contractorName: p.contractorName,
      contractorRating: p.contractorRating,
      materialCost: p.materialCost,
      laborCost: p.laborCost,
      totalCost: p.totalCost,
      deliveryWeeks: p.deliveryWeeks,
      negotiatedAdvancePercent: p.negotiatedAdvancePercent,
      description: p.description,
      materialItems: p.materialItems,
      durationValue: p.durationValue,
      durationUnit: p.durationUnit,
      origen: p.origen,
      precioAnterior: p.precioAnterior,
      precioNuevo: p.precioNuevo,
      diferencia: p.diferencia,
      motivo: p.motivo,
      motivoAnticipoExcedido: p.motivoAnticipoExcedido,
      fechaOferta: p.fechaOferta,
    })),
  };

  if (provider) payload.provider = provider;

  const result = await apiFetch<AIEvaluationResult>("/ai/evaluate-proposals", {
    method: "POST",
    token: authToken,
    body: JSON.stringify(payload),
  });

  return result;
}
