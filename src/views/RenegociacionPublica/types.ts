/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RenegotiationDurationUnit = "dias" | "semanas" | "meses";

export const RENEGOTIATION_DURATION_UNITS: { value: RenegotiationDurationUnit; label: string }[] = [
  { value: "dias", label: "Días" },
  { value: "semanas", label: "Semanas" },
  { value: "meses", label: "Meses" },
];

export interface RenegotiationMaterialItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
}

export interface RenegotiationMaterialRow extends RenegotiationMaterialItem {
  _id: string;
  isCustom: boolean;
}

export interface RenegotiationProjectPublicData {
  id: string;
  title: string;
  location: string;
}

export interface RenegotiationProposalPublicData {
  id: string;
  materialItems: RenegotiationMaterialItem[] | null;
  materials: { id: string; name: string; quantity: number; unit: string }[];
  laborCost: number;
  totalCost: number;
  totalCostOriginal: number;
  deliveryWeeks: number;
  durationValue: number | null;
  durationUnit: RenegotiationDurationUnit | null;
  negotiatedAdvancePercent: number;
  description: string;
  quoteCurrency: string;
  fechaOferta: string;
}

export interface RenegotiationInvitationPublicInfo {
  contractorName: string;
  maxAdvancePercent: number;
  project: RenegotiationProjectPublicData;
  proposal: RenegotiationProposalPublicData;
}
