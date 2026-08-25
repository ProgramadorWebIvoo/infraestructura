/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado del toggle Tabla/Grid + el objeto listo para pasar a
 * TableToolbar.viewToggle — evita repetir `useState` + el objeto inline en
 * cada vista que alterna entre Table y GridView.
 */

import { useState } from "react";

export type TableViewMode = "table" | "grid";

export function useTableViewMode(defaultMode: TableViewMode = "table") {
  const [viewMode, setViewMode] = useState<TableViewMode>(defaultMode);
  return { viewMode, viewToggle: { value: viewMode, onChange: setViewMode } };
}
