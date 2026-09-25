/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Localization, LocalizationType } from "@/types";

export type ConfigLocalization = Localization;

export interface LocalizationForm {
  title: string;
  address: string;
  city: string;
  region: string;
  type: LocalizationType;
  notes: string;
  isActive: boolean;
  residentUserId: number | null;
  /** Required only when an existing location changes resident. */
  reason: string;
}

export const EMPTY_FORM: LocalizationForm = {
  title: "",
  address: "",
  city: "",
  region: "",
  type: "TIENDA",
  notes: "",
  isActive: true,
  residentUserId: null,
  reason: "",
};
