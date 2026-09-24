/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Servicio de Evaluación Inteligente de Ofertas.
 * Comunica con el endpoint Laravel POST /api/ai/evaluate-proposals, que
 * encola la evaluación (ChatGPT → Gemini → Claude con failover automático)
 * en un Job en vez de correrla en el request HTTP — con hasta 3 providers x
 * 60s de timeout, la versión síncrona podía bloquear un worker hasta 180s
 * (auditoría de rendimiento 2026-09-16). El endpoint ahora responde 202 de
 * inmediato; el resultado se obtiene con getAIEvaluationStatus() (polling) o
 * el evento WebSocket `ai-evaluation.finished` — ver
 * EvaluacionInteligenteModal, que usa ambos (WS primero, poll de respaldo).
 */

import type { MaterialItem, Project, Proposal } from "@/types";
import { apiFetch } from "./api";

// ---------------------------------------------------------------------------
// Evaluación de expediente (Auditoría)
// ---------------------------------------------------------------------------

/**
 * Evalúa el expediente completo de un proyecto (Auditoría) — score de
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
// Sugerencia de rating de proveedor (Proveedores/Catálogos)
// ---------------------------------------------------------------------------

/** Sugerencia informativa — no modifica Contractor.rating, el admin decide si la aplica. */
export interface ContractorRatingSuggestion {
  suggestedRating: number | null;
  confidenceScore: number;
  rationale: string;
  providerUsed: AIProviderUsed;
}

export async function getContractorRatingSuggestion(contractorCode: string, authToken: string): Promise<ContractorRatingSuggestion> {
  return apiFetch<ContractorRatingSuggestion>(`/contractors/${contractorCode}/rating-suggestion`, { token: authToken });
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
  "materialCost" | "quoteCurrency" | "laborCost" | "totalCost" | "deliveryWeeks" |
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

/** Respuesta inmediata del POST — la evaluación real corre en background. */
export interface AIEvaluationAccepted {
  success: true;
  status: "processing";
  projectId: string;
}

/** Respuesta de GET .../status/{project} — para polling. */
export interface AIEvaluationStatusResponse {
  success: true;
  status: "processing" | "completed" | "failed" | null;
  error: string | null;
  data: AIEvaluationResult | null;
}

/**
 * Dispara la evaluación de propuestas usando el proxy AI del backend
 * Laravel. El backend encola el trabajo y responde de inmediato (202) —
 * el resultado se consulta después con getAIEvaluationStatus() o se recibe
 * por WebSocket.
 */
export async function evaluateProposals(
  project: Project,
  proposals: Proposal[],
  authToken: string,
  provider?: 'chatgpt' | 'gemini' | 'claude',
): Promise<AIEvaluationAccepted> {
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
      quoteCurrency: p.quoteCurrency,
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

  return apiFetch<AIEvaluationAccepted>("/ai/evaluate-proposals", {
    method: "POST",
    token: authToken,
    body: JSON.stringify(payload),
  });
}

/** Consulta el estado actual de la evaluación en curso/última para un proyecto. */
export async function getAIEvaluationStatus(
  projectId: string,
  authToken: string,
): Promise<AIEvaluationStatusResponse> {
  return apiFetch<AIEvaluationStatusResponse>(`/ai/evaluate-proposals/status/${projectId}`, {
    token: authToken,
  });
}
