/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConfigNotificationAction {
  id: number;
  key: string;
  label: string | null;
  group: string;
  scope: "project" | "global";
  critical: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationActionForm = {
  label: string;
  group: string;
  scope: "project" | "global";
  critical: boolean;
  isActive: boolean;
};

export const SCOPE_OPTIONS = [
  { value: "project", label: "De proyecto" },
  { value: "global", label: "Global" },
];

export const STATUS_OPTIONS = [
  { value: 1, label: "Activa", description: "Disponible en selectores y matriz de notificaciones", raw: true },
  { value: 0, label: "Inactiva", description: "Oculta de selectores nuevos, resuelve histórico igual", raw: false },
];
