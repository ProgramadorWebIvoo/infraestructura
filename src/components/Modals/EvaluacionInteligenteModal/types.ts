/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos compartidos entre los sub-componentes del modal de Evaluación Inteligente.
 */

import type { AIEvaluationResult } from "../../../services/aiEvaluationService";

export interface FailoverLog {
  entries: string[];
  addEntry: (msg: string) => void;
  addEntries: (msgs: string[]) => void;
}

export interface ResultViewProps {
  result: AIEvaluationResult;
  winnerProposalName: string;
  winnerTotalCost: number;
  winnerDeliveryWeeks: number;
  winnerRating: number | null;
  onAccept: () => Promise<void>;
  accepting: boolean;
  acceptSuccess: boolean;
  acceptError: string | null;
  onRetry: () => Promise<void>;
}

export interface LoadingViewProps {
  providerLabel: string;
  providerColor: string;
  Icon: React.ComponentType<{ className?: string }>;
  failoverLog: string[];
  isAutoMode: boolean;
  logEndRef: React.RefObject<HTMLDivElement | null>;
}

export interface ErrorViewProps {
  message: string;
  onRetry: () => Promise<void>;
}

export interface IdleViewProps {
  proposalCount: number;
  approvedInvestmentAmount?: number;
  deliveryWeeksMin: number;
  deliveryWeeksMax: number;
  proposals: Array<{
    id: string;
    contractorName: string;
    materialCost: number;
    laborCost: number;
    totalCost: number;
    deliveryWeeks: number;
    contractorRating: number | null;
  }>;
  onStart: () => Promise<void>;
  selectedProvider: "auto" | "chatgpt" | "gemini" | "claude";
  onProviderChange: (value: "auto" | "chatgpt" | "gemini" | "claude") => void;
}
