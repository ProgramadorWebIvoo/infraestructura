/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConfigRole {
  id: number;
  key: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type RoleForm = {
  key: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
};

export const EMPTY_FORM: RoleForm = {
  key: "",
  label: "",
  isActive: true,
  sortOrder: 0,
};

export const STATUS_OPTIONS = [
  { value: 1, label: "Activo", description: "Disponible al crear/editar usuarios", raw: true },
  { value: 0, label: "Inactivo", description: "Oculto en los selectores de rol", raw: false },
];
