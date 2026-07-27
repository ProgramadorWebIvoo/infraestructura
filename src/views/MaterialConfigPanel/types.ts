/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConfigMaterial {
  id: number;
  name: string;
  unit: string;
  estimatedUnitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MaterialForm = {
  name: string;
  unit: string;
  estimatedUnitPrice: number | "";
  isActive: boolean;
};

export const EMPTY_FORM: MaterialForm = {
  name: "",
  unit: "",
  estimatedUnitPrice: 0,
  isActive: true,
};

// Status options for SelectModal
export const STATUS_OPTIONS = [
  { value: 1, label: "Activo", description: "Material disponible en obras", raw: true },
  { value: 0, label: "Inactivo", description: "Material oculto (soft delete)", raw: false },
];
