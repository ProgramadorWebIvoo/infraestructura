/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Servicio de Evaluación Inteligente de Ofertas.
 * Comunica con el endpoint Laravel POST /api/ai/evaluate-proposals
 * que orquesta ChatGPT → Gemini → Claude con failover automático.
 */

import { Project, Proposal } from "../types";
import { apiFetch } from "./api";

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
    contractorRating: number; // 1.0–5.0
    materialCost: number;
    laborCost: number;
    totalCost: number;
    deliveryWeeks: number;
    negotiatedAdvancePercent: number;
    description: string;
  }>;
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
    proposals: proposals.map((p) => ({
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
