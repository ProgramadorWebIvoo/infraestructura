/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Preferencias de vista del panel del DEBUG-MODE (acople, tamaño, opacidad,
 * compacto), persistidas por navegador en localStorage (utils/debugLayout).
 * Se guarda en cada cambio (los arrastres de tamaño solo confirman al soltar,
 * ver useDebugResize), así que no se pierde nada al cerrar el panel.
 */

import { useCallback, useRef, useState } from "react";
import { DEFAULT_DEBUG_PREFS, loadPrefs, sanitizePrefs, savePrefs, type DebugPrefs } from "@/utils/debugLayout";

export function useDebugPrefs() {
  const [prefs, setPrefsState] = useState<DebugPrefs>(loadPrefs);
  const latest = useRef(prefs);

  const commit = useCallback((next: DebugPrefs) => {
    latest.current = next;
    savePrefs(next);
    setPrefsState(next);
  }, []);

  const setPrefs = useCallback(
    (patch: Partial<DebugPrefs>) => commit(sanitizePrefs({ ...latest.current, ...patch })),
    [commit],
  );

  const reset = useCallback(() => commit(DEFAULT_DEBUG_PREFS), [commit]);

  return { prefs, setPrefs, reset };
}
