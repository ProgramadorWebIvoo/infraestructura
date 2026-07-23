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

/** Tipo de propuesta para enviar al backend (derivado de Proposal). */
type AIEvaluationProposalPayload = Pick<Proposal,
  "id" | "contractorCode" | "contractorName" | "contractorRating" |
  "materialCost" | "laborCost" | "totalCost" | "deliveryWeeks" |
  "negotiatedAdvancePercent" | "description"
>;

/** Cuerpo enviado al backend. */
interface AIEvaluationPayload {
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  projectType: string;
  approvedInvestmentAmount: number;
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
