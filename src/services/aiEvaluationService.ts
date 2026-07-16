/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Servicio de Evaluación Inteligente de Ofertas.
 * Comunica con el endpoint Laravel POST /api/ai/evaluate-proposals
 * que orquesta ChatGPT → Gemini → Claude con failover automático.
 */

import { Project, Proposal } from "../types";

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
}

/** Cuerpo enviado al backend. */
interface AIEvaluationPayload {
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  projectType: string;
  approvedInvestmentAmount: number;
  proposals: Array<{
    id: string;
    contractorCode: string;
    contractorName: string;
    materialCost: number;
    laborCost: number;
    totalCost: number;
    deliveryWeeks: number;
    negotiatedAdvancePercent: number;
    description: string;
    observations?: string;
  }>;
}

/** Respuesta cruda del backend. */
interface AIEvaluationResponse {
  success: boolean;
  data?: AIEvaluationResult;
  error?: string;
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
  apiBaseUrl: string,
): Promise<AIEvaluationResult> {
  const payload: AIEvaluationPayload = {
    projectId: project.id,
    projectTitle: project.title,
    projectDescription: project.description,
    projectLocation: project.location,
    projectType: project.type,
    approvedInvestmentAmount: project.approvedInvestmentAmount ?? 0,
    proposals: proposals.map((p) => ({
      id: p.id,
      contractorCode: p.contractorCode,
      contractorName: p.contractorName,
      materialCost: p.materialCost,
      laborCost: p.laborCost,
      totalCost: p.totalCost,
      deliveryWeeks: p.deliveryWeeks,
      negotiatedAdvancePercent: p.negotiatedAdvancePercent,
      description: p.description,
      observations: p.observations,
    })),
  };

  const response = await fetch(`${apiBaseUrl}/ai/evaluate-proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `Error del servidor (${response.status})`;
    try {
      const errorBody: AIEvaluationResponse = await response.json();
      errorMsg = errorBody.error ?? errorMsg;
    } catch {
      // ignorar, usar mensaje por defecto
    }
    throw new Error(errorMsg);
  }

  const result: AIEvaluationResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error ?? "La evaluación no devolvió resultados.");
  }

  return result.data;
}
