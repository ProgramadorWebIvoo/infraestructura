/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConfigProjectType {
  id: number;
  key: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ProjectTypeForm = {
  key: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
};

export const EMPTY_FORM: ProjectTypeForm = {
  key: "",
  label: "",
  isActive: true,
  sortOrder: 0,
};

export const STATUS_OPTIONS = [
  { value: 1, label: "Activo", description: "Disponible al crear una petición", raw: true },
  { value: 0, label: "Inactivo", description: "Oculto en el formulario de alta", raw: false },
];
