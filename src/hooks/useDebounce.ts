/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useDebounce — Debounce genérico para búsquedas y filtros.
 * Retorna el valor desfasado después de `delay` ms sin cambios.
 */

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
