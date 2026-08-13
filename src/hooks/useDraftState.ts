/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Borrador local genérico estilo Odoo: los cambios quedan en memoria hasta
 * que algo externo decide persistirlos (ej. una barra global "Guardar
 * todo"), con guardado independiente por clave — un error en un item no
 * descarta los demás cambios pendientes. Extraído de ConfigAppPanel, donde
 * el mismo patrón (draft/dirty/persist/errors) estaba duplicado casi
 * palabra por palabra para AppSetting y para la matriz de notificaciones
 * por rol — cualquier sistema de guardado nuevo en CONFIG APP (o en otra
 * vista con el mismo patrón) lo reutiliza en vez de reimplementarlo.
 */

import { useCallback, useMemo, useState } from "react";
import { getErrorMessage } from "../services/logger";

export interface UseDraftStateOptions<K extends string | number, V> {
  /** Valor "guardado" actual de una clave — el borrador se compara contra esto para saber si está dirty. */
  savedValueOf: (key: K) => V;
  /** true si `draftValue` difiere de `savedValue` de forma significativa (ej. comparación de sets, no solo `!==`). Recibe la clave por si el criterio de "dirty" depende de metadata asociada a ella (ej. el `type` de un AppSetting). */
  isDirty: (draftValue: V, savedValue: V, key: K) => boolean;
  /** Persiste una clave — se invoca una por una desde `persist()`, en orden, para que un error no aborte el resto. */
  save: (key: K, value: V) => Promise<void>;
  /** Mensaje de error por defecto cuando `save()` rechaza sin un mensaje utilizable. */
  fallbackErrorMessage?: string;
  /**
   * true si `K` es `number` (ej. ids de AppSetting) — `Object.keys()` del
   * objeto interno de borrador SIEMPRE devuelve `string[]` en JS runtime,
   * sin importar el tipo declarado de `K`; sin esta coerción, `dirtyKeys`
   * traería `"1"` en vez de `1`, y `save(key, ...)` llamaría a la API con
   * un id-string en vez del id-number que espera. Default `false` (K = string).
   */
  numericKeys?: boolean;
}

export function useDraftState<K extends string | number, V>({
  savedValueOf,
  isDirty,
  save,
  fallbackErrorMessage = "No se pudo guardar el cambio.",
  numericKeys = false,
}: UseDraftStateOptions<K, V>) {
  const [draft, setDraft] = useState<Partial<Record<K, V>>>({});
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});

  const toKey = useCallback((raw: string): K => (numericKeys ? (Number(raw) as K) : (raw as K)), [numericKeys]);

  const valueOf = useCallback((key: K): V => (key in draft ? (draft[key] as V) : savedValueOf(key)), [draft, savedValueOf]);

  const onChange = useCallback((key: K, value: V) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const dirtyKeys = useMemo(
    () => Object.keys(draft).map(toKey).filter(key => isDirty(draft[key] as V, savedValueOf(key), key)),
    [draft, isDirty, savedValueOf, toKey],
  );

  const isKeyDirty = useCallback((key: K) => dirtyKeys.includes(key), [dirtyKeys]);

  /**
   * Persiste las claves dirty, una por una — los errores no interrumpen el
   * resto. Las que se guardan con éxito se limpian del draft; las que
   * fallan quedan con su mensaje en `errors` y siguen en el draft para
   * reintentar.
   */
  const persist = useCallback(
    async (keys: K[] = dirtyKeys): Promise<{ failedKeys: K[] }> => {
      const succeeded: K[] = [];
      const newErrors: Partial<Record<K, string>> = {};

      for (const key of keys) {
        try {
          await save(key, draft[key] as V);
          succeeded.push(key);
        } catch (err) {
          newErrors[key] = getErrorMessage(err, fallbackErrorMessage);
        }
      }

      setDraft(prev => {
        const next = { ...prev };
        for (const key of succeeded) delete next[key];
        return next;
      });

      setErrors(prev => {
        const next = { ...prev };
        for (const key of succeeded) delete next[key];
        return { ...next, ...newErrors };
      });

      return { failedKeys: Object.keys(newErrors).map(toKey) };
    },
    [dirtyKeys, draft, save, fallbackErrorMessage, toKey],
  );

  const discard = useCallback(() => {
    setDraft({});
    setErrors({});
  }, []);

  return {
    valueOf,
    onChange,
    dirtyKeys,
    isDirty: isKeyDirty,
    errors,
    persist,
    discard,
  };
}
