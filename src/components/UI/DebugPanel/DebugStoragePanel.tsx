/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Storage" del DEBUG-MODE: inspector de localStorage, sessionStorage y
 * cookies legibles desde JS (las httpOnly, como la de sesión de Sanctum, NO
 * son accesibles y no aparecen). Permite ver (sanitizado), editar y eliminar
 * flags locales sin abrir las DevTools. Sin polling: se relee al cambiar de
 * área, tras editar/eliminar o con "Actualizar".
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import SegmentedControl from "@/components/UI/SegmentedControl";
import EmptyState from "@/components/UI/EmptyState";
import { readCookieRows, readStorageRows, type StorageArea, type StorageRow } from "@/utils/debugStorage";
import DebugStorageRow from "./DebugStorageRow";

const AREA_OPTIONS: { value: StorageArea; label: string }[] = [
  { value: "local", label: "localStorage" },
  { value: "session", label: "sessionStorage" },
  { value: "cookie", label: "Cookies" },
];

function readRows(area: StorageArea): StorageRow[] {
  return area === "cookie" ? readCookieRows() : readStorageRows(area);
}

interface DebugStoragePanelProps {
  /** Filtro de texto del buscador del panel. */
  search: string;
}

export default function DebugStoragePanel({ search }: DebugStoragePanelProps) {
  const [area, setArea] = useState<StorageArea>("local");
  const [rows, setRows] = useState<StorageRow[]>(() => readRows("local"));

  const refresh = useCallback(() => setRows(readRows(area)), [area]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const query = search.trim().toLowerCase();
  const visibleRows = useMemo(() => (query ? rows.filter(r => r.key.toLowerCase().includes(query)) : rows), [rows, query]);
  const totalChars = rows.reduce((sum, r) => sum + r.length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SegmentedControl ariaLabel="Área de almacenamiento" variant="pill" size="sm" accent="neutral" value={area} onChange={setArea} options={AREA_OPTIONS} />
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" /> Actualizar
        </button>
      </div>

      <p className="text-[10px] font-bold text-text-tertiary">
        {rows.length} claves · {totalChars.toLocaleString("es-VE")} caracteres. Los valores no se muestran hasta pulsar «Ver» y siempre se sanitizan.
        {area === "cookie" && " Las cookies httpOnly (sesión) no son accesibles desde JS; las cookies son de solo lectura/eliminación."}
      </p>

      {visibleRows.length === 0 ? (
        <EmptyState message={rows.length === 0 ? "Sin claves en esta área." : "Ninguna clave coincide con la búsqueda."} />
      ) : (
        <ul className="space-y-1.5">
          {visibleRows.map(row => (
            <DebugStorageRow key={`${area}:${row.key}`} area={area} row={row} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}
