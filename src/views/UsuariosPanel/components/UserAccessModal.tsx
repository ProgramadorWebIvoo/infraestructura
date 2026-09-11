/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de configuración de accesos dinámicos de un usuario: qué vistas
 * puede ver además/en vez de las de su rol, y qué tabs de cada vista tiene
 * visibles. Cada fila es un checkbox de acceso EFECTIVO (default del rol +
 * override); tocarlo crea un override explícito que se guarda al hacer
 * clic en Guardar (marcar lo que ya traía el rol es un no-op funcional,
 * simplemente no hace falta distinguirlo en la UI).
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { KeyRound } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Spinner from "@/components/UI/Spinner";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { containerVariants, itemVariants } from "@/animations";
import type { UserRecord } from "@/hooks/useUsuarios";
import type { AccessCatalog, AccessOverridesPayload, TabAccessEntry } from "@/hooks/useUserAccess";

// Solo opacity/transform (GPU, sin layout thrashing) — pensado para listas
// de checkboxes que pueden crecer con el catálogo: nada de animar
// height/layout por fila, eso sí es caro con muchas filas.
const rowVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.12, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: "easeIn" } },
} as const;

const groupVariants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12, ease: "easeIn" } },
} as const;

interface UserAccessModalProps {
  isOpen: boolean;
  user: UserRecord | null;
  catalog: AccessCatalog | null;
  isLoading: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: AccessOverridesPayload) => void;
}

// Estado local: key de vista / "viewKey::tabKey" → true|false (override) | undefined (sin tocar, hereda catálogo)
type OverrideMap = Record<string, boolean | null>;

export default function UserAccessModal({
  isOpen,
  user,
  catalog,
  isLoading,
  isSaving,
  onClose,
  onSave,
}: UserAccessModalProps) {
  const [viewOverrides, setViewOverrides] = useState<OverrideMap>({});
  const [tabOverrides, setTabOverrides] = useState<OverrideMap>({});

  // Reinicia el estado local cada vez que llega un catálogo nuevo (al abrir
  // el modal para un usuario, o tras guardar) — nunca mezclar overrides de
  // un usuario anterior.
  useEffect(() => {
    if (!catalog) {
      setViewOverrides({});
      setTabOverrides({});
      return;
    }
    setViewOverrides(Object.fromEntries(catalog.views.map((v) => [v.key, v.override])));
    setTabOverrides(Object.fromEntries(catalog.tabs.map((t) => [`${t.viewKey}::${t.tabKey}`, t.override])));
  }, [catalog]);

  // Solo vistas con acceso EFECTIVO (rol + override, en vivo mientras el
  // admin marca/desmarca checkboxes arriba) — no tiene sentido configurar
  // tabs de una vista que este usuario no puede ni abrir.
  const tabsByView = useMemo(() => {
    const map = new Map<string, TabAccessEntry[]>();
    if (!catalog) return map;

    const accessibleViewKeys = new Set(
      catalog.views
        .filter((v) => (viewOverrides[v.key] ?? v.defaultFromRole))
        .map((v) => v.key),
    );

    for (const tab of catalog.tabs) {
      if (!accessibleViewKeys.has(tab.viewKey)) continue;
      if (!map.has(tab.viewKey)) map.set(tab.viewKey, []);
      map.get(tab.viewKey)!.push(tab);
    }
    return map;
  }, [catalog, viewOverrides]);

  const handleSave = () => {
    if (!catalog) return;
    const payload: AccessOverridesPayload = {
      viewOverrides: catalog.views.map((v) => ({ view_key: v.key, allowed: viewOverrides[v.key] ?? null })),
      tabOverrides: catalog.tabs.map((t) => ({
        view_key: t.viewKey,
        tab_key: t.tabKey,
        allowed: tabOverrides[`${t.viewKey}::${t.tabKey}`] ?? null,
      })),
    };
    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Accesos del usuario"
      badge="Configuración avanzada"
      infoLine={user?.name ?? ""}
      icon={<KeyRound className="h-5 w-5" />}
      iconColor="indigo"
      maxWidth="max-w-2xl"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !catalog} variant="primary" colorScheme="indigo" isLoading={isSaving}>
            {isSaving ? "Guardando..." : "Guardar accesos"}
          </Button>
        </div>
      }
    >
      {isLoading || !catalog ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <motion.div className="space-y-5" variants={containerVariants} initial="hidden" animate="visible">
          <motion.p variants={itemVariants} className="text-xs text-text-tertiary leading-relaxed">
            Estos accesos son adicionales/quitables sobre lo que ya trae el rol del usuario.
            Las vistas marcadas con <span className="font-bold">Rol</span> vienen por su rol;
            desmárcalas para revocarlas solo a este usuario, o marca vistas nuevas para dárselas
            aunque su rol no las incluya.
          </motion.p>

          <motion.div variants={itemVariants}>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Vistas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {catalog.views.map((view) => {
                const override = viewOverrides[view.key] ?? null;
                const effective = override ?? view.defaultFromRole;
                return (
                  <label
                    key={view.key}
                    className={`flex items-center justify-between gap-2 rounded-control border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                      effective
                        ? `${SEMANTIC_COLOR_MAP.brand.border100} ${SEMANTIC_COLOR_MAP.brand.bg50}`
                        : "border-border-default bg-surface"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={effective}
                        onChange={() => setViewOverrides((prev) => ({ ...prev, [view.key]: !effective }))}
                        className="h-4 w-4 shrink-0 accent-brand-600"
                      />
                      <span className="truncate text-text-secondary">{view.label}</span>
                    </span>
                    {view.defaultFromRole && override === null && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-text-muted">Rol</span>
                    )}
                  </label>
                );
              })}
            </div>
          </motion.div>

          <AnimatePresence initial={false}>
            {tabsByView.size > 0 && (
              <motion.div
                key="tabs-section"
                variants={groupVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  Tabs por vista <span className="font-normal normal-case text-text-muted">(por default, todas activas)</span>
                </h3>
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {Array.from(tabsByView.entries()).map(([viewKey, tabs]) => {
                      const viewLabel = catalog.views.find((v) => v.key === viewKey)?.label ?? viewKey;
                      // Al menos una tab activa por vista — una sección sin
                      // ninguna tab visible deja al usuario sin nada que
                      // mostrar al entrar a esa vista (rompe el panel, ver
                      // useSyncActiveTab). Se calcula en vivo contra
                      // tabOverrides para bloquear el último checkbox
                      // encendido del grupo en cuanto llega a 1.
                      const effectiveCount = tabs.filter(
                        (t) => (tabOverrides[`${t.viewKey}::${t.tabKey}`] ?? t.defaultActive),
                      ).length;
                      return (
                        <motion.div key={viewKey} variants={groupVariants} initial="hidden" animate="visible" exit="exit">
                          <p className="mb-1.5 text-[11px] font-bold text-text-secondary">{viewLabel}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {tabs.map((tab) => {
                              const mapKey = `${tab.viewKey}::${tab.tabKey}`;
                              const override = tabOverrides[mapKey] ?? null;
                              const effective = override ?? tab.defaultActive;
                              const isLastActive = effective && effectiveCount === 1;
                              return (
                                <motion.label
                                  key={mapKey}
                                  variants={rowVariants}
                                  title={isLastActive ? "Debe quedar al menos una tab activa en esta vista." : undefined}
                                  className={`flex items-center justify-between gap-2 rounded-control border px-3 py-2 text-xs font-semibold transition-colors duration-150 ${
                                    isLastActive ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                                  } ${
                                    effective
                                      ? `${SEMANTIC_COLOR_MAP.info.border100} ${SEMANTIC_COLOR_MAP.info.bg50}`
                                      : "border-border-default bg-surface"
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={effective}
                                      disabled={isLastActive}
                                      onChange={() => setTabOverrides((prev) => ({ ...prev, [mapKey]: !effective }))}
                                      className="h-4 w-4 shrink-0 accent-sky-600 disabled:cursor-not-allowed"
                                    />
                                    <span className="truncate text-text-secondary">{tab.label}</span>
                                  </span>
                                </motion.label>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </Modal>
  );
}
