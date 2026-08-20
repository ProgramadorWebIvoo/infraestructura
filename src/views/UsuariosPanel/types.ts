/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserForm = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  status: "Active" | "Inactive";
};

export const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  role: "INFRAESTRUCTURA",
  status: "Active",
};

export const STATUS_OPTIONS = [
  { value: "Active", label: "Activo" },
  { value: "Inactive", label: "Inactivo" },
];
