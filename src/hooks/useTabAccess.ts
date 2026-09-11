/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Visibilidad de tabs por vista, resuelta por el backend para el usuario
 * autenticado (GET /api/auth/tabs — ver AccessResolver::resolveTabs). Mismo
 * patrón que useRoleAccess pero a nivel de tab-key dentro de una vista en
 * vez de route-path.
 *
 * Sin config para una vista → todas sus tabs quedan activas (fail-open,
 * requisito de negocio: "por default vendran todas las tabs activas"), a
 * diferencia de useRoleAccess que es fail-closed a nivel de navegación.
 *
 * Expone `isLoadingTabs` para que el consumidor pueda esperar la resolución
 * antes de pintar las tabs — sin esto, la vista renderiza el TabDefinition[]
 * completo (fail-open todavía sin datos) y, apenas llega /auth/tabs, las
 * tabs sin acceso desaparecen de golpe (flash visible). El patrón correcto
 * es sumar `isLoadingTabs` al mismo `isLoading` que ya gatea el skeleton de
 * cada panel, igual que cualquier otro fetch inicial de la vista.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { TabDefinition } from "@/components/UI/Tabs";

export function useTabAccess(authToken: string) {
  const [tabsByView, setTabsByView] = useState<Record<string, string[]>>({});
  const [isLoadingTabs, setIsLoadingTabs] = useState<boolean>(!!authToken);

  useEffect(() => {
    if (!authToken) {
      setIsLoadingTabs(false);
      return;
    }

    let cancelled = false;
    setIsLoadingTabs(true);

    apiFetch<Record<string, string[]>>("/auth/tabs", { method: "GET" })
      .then((data) => {
        if (!cancelled) setTabsByView(data);
      })
      .catch((err) => {
        if (!cancelled) logError("useTabAccess.loadTabs", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTabs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const filterTabs = useCallback(
    <T extends TabDefinition>(viewKey: string, tabs: T[]): T[] => {
      const allowed = tabsByView[viewKey];
      if (!allowed) return tabs;
      return tabs.filter((tab) => allowed.includes(tab.key));
    },
    [tabsByView],
  );

  return { filterTabs, isLoadingTabs };
}

/**
 * Corrige `activeTab` cuando la tab activa por default del panel (ej.
 * "crear", hardcodeada en el useState inicial) no está entre las tabs
 * visibles resueltas para este usuario — sin esto, un usuario cuya única
 * tab permitida es "rechazadas" seguía viendo el panel abierto en "crear"
 * (inexistente para él), con <Tabs> mostrando ninguna tab activa y el
 * contenido de una tab que no debería poder ver. Se re-evalúa en cada
 * cambio de `visibleTabs` (llega vacío mientras carga, luego resuelto) y
 * de `activeTab`; solo dispara setActiveTab cuando de verdad hace falta.
 * Un solo lugar (DRY) para las 5 vistas con tabs en vez de repetir el
 * mismo useEffect en cada panel.
 */
export function useSyncActiveTab<T extends string>(
  visibleTabs: TabDefinition[],
  activeTab: T,
  setActiveTab: (key: T) => void,
): void {
  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0].key as T);
    }
  }, [visibleTabs, activeTab, setActiveTab]);
}
