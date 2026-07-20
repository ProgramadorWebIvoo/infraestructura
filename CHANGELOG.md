# CHANGELOG

## [2026-07-20] — Feature: Transiciones suaves entre vistas (route transitions)

- Tipo: feature
- Qué:
  - `<Routes>` autenticado envuelto en `AnimatePresence mode="wait"` + `motion.div` keyed por `location.pathname`. Cada cambio de ruta ahora hace fade + slide vertical (y: 12 → 0 → -12, 0.22s easeOut) en vez de intercambio brusco.
  - `useReducedMotion()` de `motion/react`: si el SO tiene "reduce motion" activo, las variantes colapsan a opacity 1 / duration 0 (sin movimiento).
  - `useEffect` en `location.pathname` que hace `window.scrollTo(0,0)` para que cada vista entre desde arriba limpio.
  - Eliminado el `<div className="transition-all duration-300">` muerto (no animaba nada real).
- Por qué / causa raíz: el wrapper previo no producía transición alguna; el contenido de las vistas se reemplazaba instantáneamente, dando sensación de "salto" y mal feeling de UX. El stack ya incluía `motion` v12 (usado en Modal) y `react-router-dom` v7, así que no se añaden dependencias.
- Archivos: `src/App.tsx`

---

## [2026-07-20] — Refactor: PresidenciaDashboard des-espaguetizado (sin sobre-ingeniería)

- Tipo: refactor
- Qué:
  - Extraídos 3 componentes presentacionales locales (single-use, sin nuevo archivo): `KpiCard` (4 usos, reemplaza 4 bloques copiados de ~77 líneas), `DonutChart` (SVG donut autocontenido, ~59 líneas fuera del render), `DistributionBar` (2 barras de leyenda duplicadas).
  - Columnas de ambas `Table` movidas a constantes/factory de módulo: `AUDIT_COLUMNS` (const) y `getProjectColumns(onSelectProject)` (factory, cierra sobre el handler). El cuerpo del render ya no define arrays inline.
  - Eliminado `STATUS_LABEL_MAP` (redefinía `STATUS_LABELS` de `utils.ts` con etiquetas divergentes → inconsistencia) y `getStatusBadge`. Ahora usa `<StatusBadge code={status} />` que cae a `STATUS_LABELS` del utils (única fuente de verdad). Nota: el dashboard ahora muestra las etiquetas cortas canónicas ("Creado", no "Enviado a Cierre de Obra").
  - Corrección menor: `totalApprovedInvestment += p.approvedInvestmentAmount ?? p.estimatedTotal` (antes `if (p.approvedInvestmentAmount)` trataba 0 como falsy y caía a `estimatedTotal`).
  - Eliminados imports muertos: `Filter`, `TrendingUp`, `AlertTriangle`, `SkeletonBlock`.
- Por qué / causa raíz: el render tenía ~307 líneas porque 4 KPI cards idénticos, un donut SVG y dos arrays `columns` estaban inline en el JSX; además duplicaba el mapa de etiquetas de estado del utils.
- Archivos: `src/views/PresidenciaDashboard.tsx`

---

## [2026-07-20] — Feature: Polling en zonas esenciales (projects/auditLogs + supplier proposals)

- Tipo: feature
- Qué:
  - `useProjectsData`: `loadProjects` acepta `{ isPoll? }`; dedupe por firma (ref `lastSig`) para no re-renderizar si no hay cambios; en poll falla silencioso (sin toast, sin fallback INITIAL, sin `isLoading`). `usePolling` de 25s sobre `/projects` + `/audit-logs` con `enabled = !!authToken`.
  - `useProveedores`: `loadProposals` con mismo patrón (dedupe por ids); `usePolling` de 12s sobre `/supplier-material-proposals` (push externo del portal público de proveedores).
  - `useProjects`: effect que re-synca `inspectedProject` desde `projects` en cada actualización del poll (el modal abierto refleja cambios de otros roles).
  - `usePolling` (infraestructura): eliminados `console.log` de debug; guarda de overlap (`isRunning`); pausa por `visibilitychange` (no gasta requests con la pestaña oculta). Corregido bug estructural de llaves que dejaba `tick` sin invocar (polling no arrancaba) y con doble agendado + fuga de listeners.
- Por qué / causa raíz: `projects`, `auditLogs` y `supplier-material-proposals` son mutados por otras sesiones/roles/dispositivo (incl. app móvil y portal de proveedores sin auth). Sin polling esos cambios no llegaban al viewer sin refresh manual. La sinopsis declara trazabilidad "en tiempo real" para la bitácora de auditoría.
- Archivos:
  - `src/hooks/usePolling.ts`
  - `src/hooks/useProjectsData.ts`
  - `src/hooks/useProveedores.ts`
  - `src/hooks/useProjects.ts`

---

## [2026-07-20] — Refactor: hooks atomizados (10 archivos) sin sobre-ingeniería

**Tipo:** refactor

**Qué:** Reestructuración de `src/hooks/` de 5 hooks planos (con God Hook `useProjects` de 361 líneas) a 10 hooks atómicos organizados por dominio:
- `useAuth.ts` — solo auth (login/logout/token). Routing extraído.
- `useRouting.ts` — `roleAccess`, `publicRoutes`, `isPublicPath`, `useRoleAccess`.
- `useProjects.ts` — facade que compone data + workflows. Ya NO carga contratistas/materiales para otros hooks (acoplamiento eliminado).
- `useProjectsData.ts` — GET /projects + /audit-logs.
- `useProjectsWorkflows.ts` — los 12 handlers de workflow en UN archivo, agrupados por dominio (infra, procura, analistas, finanzas, cierre).
- `useContractors.ts` — estado + GET /contractors + handlers (antes solo POST, dependía de useProjects).
- `useCatalog.ts` — estado + GET /materials + handlers (antes no fetcheaba).
- `useUsuarios.ts` — extraído de `UsuariosPanel` (GET/POST /users).
- `useProveedores.ts` — extraído de `ProveedoresRegistrados` (GET/POST supplier endpoints).
- `usePolling.ts` — sin cambios (ya atómico).

**Por qué / causa raíz:** `useProjects` era un God Hook (361 líneas) que hacía fetch, state, sync y 12 handlers, además de cargar datos de OTROS dominios vía callbacks (acoplamiento cruzado). Las llamadas a API estaban dispersas entre hooks y componentes (usuarios/proveedores tenían `apiFetch` directo en el componente). El usuario reportó no poder ubicar los GET de AuditLogs/usuarios.

**Archivos:**
- `src/hooks/useAuth.ts` — refactor (sin routing)
- `src/hooks/useRouting.ts` — [NUEVO] routing extraído
- `src/hooks/useProjects.ts` — facade (compone data + workflows)
- `src/hooks/useProjectsData.ts` — [NUEVO] fetch proyectos + audit logs
- `src/hooks/useProjectsWorkflows.ts` — [NUEVO] 12 handlers agrupados
- `src/hooks/useContractors.ts` — +GET /contractors
- `src/hooks/useCatalog.ts` — +GET /materials
- `src/hooks/useUsuarios.ts` — [NUEVO] extraído de UsuariosPanel
- `src/hooks/useProveedores.ts` — [NUEVO] extraído de ProveedoresRegistrados
- `src/App.tsx` — usa useRouting, sin callbacks cruzados
- `src/views/UsuariosPanel.tsx` — usa useUsuarios
- `src/views/ProveedoresRegistrados.tsx` — usa useProveedores

---

## [2026-07-20] — Fix: Resueltos todos los hallazgos pendientes de auditoría frontend

**Tipo:** fix + security + accessibility

**Qué:** Se resolvieron los 12 hallazgos de auditoría que aún estaban pendientes en frontend y mobile:

### 🔴 Críticos
- **C1** — Clases Tailwind v4 inválidas (`h-4.5`, `w-4.5`, `pl-9.5`, `p-4.5`) reemplazadas por valores válidos (`h-[18px]`, `w-[18px]`, `pl-10`, `p-5`) en SidebarNav, ProveedoresRegistrados, PresidenciaDashboard, InfraestructuraMantenimientoPanel.

### 🟠 Graves
- **G1** — `InteractiveOrganigrama.tsx` (307 líneas dead code) eliminado del disco.

### 🟡 Moderados
- **M2** — `strict: true` activado en `tsconfig.json` + instalado `@types/react-dom` como devDependency. 0 errores de compilación.
- **M4** — Eliminado `as any` cast en `App.tsx` (`onContractorsLoaded`), tipado correcto con `Contractor[]`.
- **M8** — Verificado: no existe código comentado legacy en App.tsx.

### 🔵 Leves
- **L1** — `index.html`: `lang="en"` → `lang="es"`.
- **L3** — Contraste bajo de `text-slate-400` sobre fondo blanco: cambiados labels, descripciones, footer y placeholders a `text-slate-500` en todas las vistas (LoginScreen, UsuariosPanel, FinanzasPanel, InspectProjectModal, EmptyState, App.tsx footer, etc.).
- **L4** — Agregados `aria-label` a icon-only buttons: sidebar close, hamburger menu, password toggle, acción editar/invitar en proveedores.
- **L5** — Rate limiting client-side en LoginScreen: contador de intentos con backoff exponencial (2s, 4s, 8s… máx 60s), botón deshabilitado con cuenta regresiva visible.

### 📱 Mobile
- **X1** — Props `visible`/`transparent` en Modal de React Native cambiadas a `visible={true}`/`transparent={true}`.
- **X2** — URL de API movida a `mobile/config.ts` con documentación de configuración.
- **X3** — Credenciales por defecto (`admin@ivoo.local` / `Admin12345`) eliminadas de initial state.

### 🧹 Otras limpiezas
- Eliminados dead exports `handleTriggerDemo` y `handleResetApp` de `useProjects.ts` (no usados en ningún componente).
- Eliminados imports no utilizados de `data.ts` en `useCatalog.ts` y `useContractors.ts`.

**Archivos:**
- `src/components/UI/SidebarNav.tsx` — C1, L4
- `src/components/UI/MobileTopBar.tsx` — L4
- `src/components/UI/EmptyState.tsx` — L3
- `src/components/UI/Toast.tsx` — L4 (ya tenía aria-label)
- `src/views/ProveedoresRegistrados.tsx` — C1, L3, L4
- `src/views/PresidenciaDashboard.tsx` — C1
- `src/views/InfraestructuraMantenimientoPanel.tsx` — C1, L3
- `src/views/LoginScreen.tsx` — L3, L5
- `src/views/UsuariosPanel.tsx` — L3, L4
- `src/views/FinanzasPanel.tsx` — L3
- `src/views/MaterialesProveedores.tsx` — L3
- `src/views/PropuestaMaterialesPublica.tsx` — L3
- `src/views/ProcuraPanel.tsx` — L3
- `src/views/CierreObraPanel.tsx` — L3
- `src/views/AnalistasPanel.tsx` — L3
- `src/components/Modals/InspectProjectModal.tsx` — L3
- `src/App.tsx` — M4, L3
- `src/hooks/useProjects.ts` — dead code removal
- `src/hooks/useCatalog.ts` — unused import removal
- `src/hooks/useContractors.ts` — unused import removal
- `tsconfig.json` — M2 (strict: true)
- `index.html` — L1 (lang="es")
- `package.json` — @types/react-dom añadido
- `mobile/App.tsx` — X1, X2, X3
- `mobile/config.ts` — [NUEVO] configuración centralizada
- `src/components/InteractiveOrganigrama.tsx` — [ELIMINADO]
- `CHANGELOG.md` — actualizado
- `PENDIENTES.md` — actualizado

---

## [2026-07-20] — Feature: Paginación integrada en Table + activada en 7 tablas

**Tipo:** feature

**Qué:**

1. **Table component mejorado** con paginación integrada:
   - Nueva prop `pageSize?: number` — al definirla, la tabla entra en modo paginado
   - UI de paginación: barra fuera del overflow container (siempre visible) con:
     - "Mostrando X — Y de Z registros"
     - Botones Anterior/Siguiente con ChevronLeft/ChevronRight
     - Páginas numeradas con ellipsis (...) para conjuntos grandes
     - Página activa destacada con bg-sky-500 + shadow
   - Reseteo automático a página 1 al cambiar ordenamiento
   - Sincronización vía `useEffect` cuando el total de páginas se reduce (filtrado externo)
   - Skeleton rows se adaptan al `pageSize`

2. **Paginación activada en 7 tablas**:

   | Tabla | pageSize | Criterio |
   |-------|----------|----------|
   | PresidenciaDashboard — Audit Logs | 25 | Volumen alto de logs |
   | PresidenciaDashboard — Projects Master | 15 | 50+ proyectos |
   | FinanzasPanel — Ledger Financiero | 20 | Múltiples transacciones |
   | InfraestructuraMantenimientoPanel — Materiales | 10 | Editor, pocos items |
   | ProveedoresRegistrados — Contratistas | 20 | Lista maestra de proveedores |
   | ProveedoresRegistrados — Items Propuesta | 10 | Items por propuesta |
   | ProcuraPanel, EvaluacionInteligenteModal | sin pageSize | Tablas pequeñas (<10 filas) |

**Por qué / causa raíz:** Las tablas renderizaban todos los datos simultáneamente (tablas infinitas). Con datos crecientes (logs, proyectos, transacciones), el renderizado se degrada. La paginación parte los datos en lotes y reduce nodos DOM activos.

**Archivos:**
- `src/components/UI/Table.tsx` — paginación integrada
- `src/views/PresidenciaDashboard.tsx` — pageSize en ambas tablas
- `src/views/FinanzasPanel.tsx` — pageSize
- `src/views/InfraestructuraMantenimientoPanel.tsx` — pageSize
- `src/views/ProveedoresRegistrados.tsx` — pageSize en ambas tablas

---

## [2026-07-20] — Refactor: Tabla genérica encapsulada (Table) + refactor de 9 tablas en vistas

**Tipo:** refactor

**Qué:**

1. **Creado `src/components/UI/Table.tsx`** — componente de tabla genérico que encapsula:
   - `Column<T>` — definición de columna con key, label, align, width, sortable, className y render personalizado
   - `Table<T>` — props: columns, data, rowKey, isLoading (skeleton rows automático), loadingRows, emptyMessage/emptyState, footer (tfoot), maxHeight, stickyHeader, containerClassName, rowHoverClass, alternating
   - Sorting integrado por columna (click header) con iconos ChevronsUpDown/ChevronUp/ChevronDown
   - Skeleton rows que matchean el número de columnas cuando `isLoading=true`
   - Default cell render con `—` para valores null/vacío

2. **Refactorizadas 9 tablas en 6 vistas** para usar `<Table>`:

   | Vista | Tabla | Columnas | Particularidades |
   |-------|-------|----------|-----------------|
   | `PresidenciaDashboard` | Audit Logs | 7 | stickyHeader, maxHeight=350px, rowHoverClass="hover:bg-sky-50/30" |
   | `PresidenciaDashboard` | Projects Master | 6 | maxHeight=350px, acción "Inspeccionar" + avoid inline lambda |
   | `FinanzasPanel` | Ledger Financiero | 6 | emptyMessage personalizado, sin is-loading (data ya computada) |
   | `ProcuraPanel` | Propuestas Comparativa | 7 | scope closure con `p.id` para onSelectContractor |
   | `InfraestructuraMantenimientoPanel` | Materiales | 5 | tfoot con subtotal, acción "Remover", footer condicional |
   | `ProveedoresRegistrados` | Contratistas | 5 | isLoading=true con skeleton, search filtering upstream |
   | `ProveedoresRegistrados` | Items Propuesta (expandible) | 6 | tfoot con total, dentro de expandable row |
   | `EvaluacionInteligenteModal` | Propuestas (idle view) | 6 | dentro de Modal, rating con color condicional |

3. **No refactorizado** (por diseño):
   - `PropuestaMaterialesPublica` — tabla editable con section divider, inline inputs (NumericInput + text), filas custom con botón remover. Es un editor/form no una tabla de datos display. Mantiene HTML nativo.

**Por qué / causa raíz:** 9 tablas en 6 archivos repetían el mismo patrón de ~50-80 líneas de HTML cada una (styling de header, hover, alternado, empty state, skeleton). No existía un componente que centralizara estas responsabilidades.

**Archivos:**
- `src/components/UI/Table.tsx` — [NUEVO]
- `src/views/PresidenciaDashboard.tsx` — refactor 2 tablas
- `src/views/FinanzasPanel.tsx` — refactor 1 tabla
- `src/views/ProcuraPanel.tsx` — refactor 1 tabla
- `src/views/InfraestructuraMantenimientoPanel.tsx` — refactor 1 tabla
- `src/views/ProveedoresRegistrados.tsx` — refactor 2 tablas
- `src/components/Modals/EvaluacionInteligenteModal.tsx` — refactor 1 tabla

---

## [2026-07-20] — Fix críticos/graves de auditoría (C2, C3, C4, G1) + endurecimiento FileDropZone

**Tipo:** fix + security

**Qué:**

1. **C2 — Falso positivo confirmado.** `.env` con `GEMINI_API_KEY` nunca estuvo en git. Solo `.env.example` fue commiteado. El `.gitignore` con `.env*` funciona correctamente. Se documenta como resuelto.

2. **C3 — 8 dependencias no utilizadas eliminadas + `vite` duplicado corregido:**
   - Eliminadas de `dependencies`: `@google/genai`, `dotenv`, `express`, `postcss`, `react-icons`, `vite` (duplicado)
   - Eliminadas de `devDependencies`: `@types/express`, `@types/react-native-vector-icons`, `autoprefixer`, `esbuild`, `tsx`, `vite` (duplicado)
   - `vite` se mantiene solo en `devDependencies` (uso correcto)
   - Validadas como NO importadas en ningún archivo del proyecto

3. **C4 — Endurecimiento de seguridad en `FileDropZone`:**
   - **Validación de extensión** contra `accept` prop (existente)
   - **MIME type validation**: mapeo `EXT_MIME_MAP` con 14 extensiones y sus MIME types válidos; si el browser reporta `file.type` y no coincide, se rechaza
   - **Límite de tamaño** configurable vía `maxSizeBytes` (default: 10 MB)
   - **Callback `onFileRejected`**: notifica al padre con nombre + razón para mostrar feedback UX (implementado en CierreObraPanel vía `showToast`)
   - La validación client-side es defensiva en profundidad; la validación real debe hacerse en backend Laravel

4. **G1 — `InteractiveOrganigrama.tsx` eliminado:**
   - 307 líneas de código muerto que no se importaba en ningún lado
   - Sin referencias residuales en el código

**Archivos:**
- `package.json` — limpieza de dependencias
- `src/components/UI/FileDropZone.tsx` — validación triple (extensión + MIME + tamaño)
- `src/views/CierreObraPanel.tsx` — integración `onFileRejected` con toast
- `src/components/InteractiveOrganigrama.tsx` — [ELIMINADO]
- `CHANGELOG.md` — actualizado

---

## [2026-07-20] — Modal genérico unificado + refactor de ambos modales existentes

**Tipo:** refactor

**Qué:**
1. **Creado `src/components/UI/Modal.tsx`** — componente modal genérico que centraliza:
   - `createPortal` a `document.body` (evita roturas de z-index/stacking)
   - `AnimatePresence` + `motion.div` con animación opacity/scale/y (0.2s) para entrada/salida
   - Slot `header`: icono (con 6 colores), badge, título, infoLine, close button
   - Slot `children`: body scrollable (`flex-1 overflow-y-auto p-6 space-y-6`)
   - Slot `footer`: contenedor estructural (`p-4 border-t border-slate-100 bg-slate-50 shrink-0`)
   - Props: `isOpen`, `onClose`, `maxWidth`, `closeDisabled`, `hideCloseButton`

2. **InspectProjectModal refactorizado** (~268 → ~265 líneas):
   - Ahora usa `<Modal>` internamente, eliminando backdrop, panel, header, footer duplicados
   - Agregado `isOpen` prop + `project` nullable para compatibilidad con AnimatePresence
   - Footer con botón "Entendido" como slot
   - App.tsx: cambia de `{inspectedProject && <InspectProjectModal ... />}` a `<InspectProjectModal isOpen={!!inspectedProject} ... />`

3. **EvaluacionInteligenteModal refactorizado** (~722 → ~600 líneas):
   - Ahora usa `<Modal>` internamente, eliminando ~40 líneas de estructura duplicada (backdrop, motion.div, header, body wrapper, footer wrapper, close button)
   - Header, close button disabled durante loading, footer contextual pasados como props de Modal
   - Eliminados imports: `X`, `AnimatePresence` (ahora en Modal)
   - Sub-vistas (IdleView, LoadingView, ResultView, ErrorView) sin cambios estructurales

4. **Corregido error de tipos preexistente** en ResultView:
   - `result.risks` → `result.riskFactors` (nombre real del campo en AIEvaluationResult)
   - `result.qualitativeAnalysis` → `result.summary` (nombre real del campo en AIEvaluationResult)

**Por qué / causa raíz:** Dos modales con ~40 líneas de estructura idéntica duplicada (backdrop, panel, header, close button, body wrapper, footer). InspectProjectModal usaba createPortal pero sin animaciones; EvaluacionInteligenteModal tenía animaciones pero sin createPortal. Inconsistencia visual y de comportamiento. Además, EvaluacionInteligenteModal importaba `AnimatePresence` pero nunca lo usaba.

**Archivos:**
- `src/components/UI/Modal.tsx` — [NUEVO]
- `src/components/InspectProjectModal.tsx` — refactor
- `src/components/EvaluacionInteligenteModal.tsx` — refactor
- `src/App.tsx` — actualizado render de InspectProjectModal

---

## [2026-07-20] — Refactor: UI components, eliminación de código duplicado y debug en vistas

**Tipo:** refactor

**Qué:**
1. **Creados 7 componentes UI reutilizables** en `src/components/UI/`:
   - `Card` — contenedor bento con hover opcional
   - `SectionHeader` — icono + título + descripción (reemplaza 12+ patrones duplicados)
   - `NumericInput` — input numérico seguro (sanetiza e/E, negativos, paste)
   - `AlertBanner` — success/error/warning/info con animación
   - `StatusBadge` — badge de estado/rol con colores unificados desde utils
   - `EmptyState` — placeholder vacío con icono y mensaje
   - `FileDropZone` — drag & drop con 4 temas de color

2. **Creado `src/utils.ts`** — funciones compartidas:
   - `formatCurrency`, `formatNumber`, `formatFileSize`
   - `getRoleColor`, `ROLE_COLORS`, `getStatusColor`, `STATUS_COLORS`, `STATUS_LABELS`

3. **Refactorizados 4 paneles** para usar los nuevos componentes:
   - `CierreObraPanel` — FileDropZone, Card, SectionHeader, EmptyState, StatusBadge; eliminado formatFileSize inline
   - `ProcuraPanel` — Card, SectionHeader, StatusBadge; eliminada IIFE
   - `FinanzasPanel` — Card, SectionHeader, NumericInput; eliminados cards duplicados
   - `InfraestructuraMantenimientoPanel` — NumericInput, Card, SectionHeader, AlertBanner, FileDropZone; setTimeout con cleanup; skeleton dedicado sin children en SkeletonCard

4. **Refactorizados 4 paneles adicionales** (segunda tanda):
   - `AnalistasPanel` — Card, SectionHeader, NumericInput, AlertBanner, EmptyState; eliminados console.log, lógica random de testing, inputs manuales e/E prevention
   - `PresidenciaDashboard` — reemplazada función `getStatusBadge` (120 líneas switch) por `<StatusBadge>`; eliminada `getRoleColor` local en favor de utils
   - `UsuariosPanel` — eliminado `ROLE_BADGE` local (8 entradas) en favor de `<StatusBadge isRole>`
   - `PropuestaMaterialesPublica` — 4 inputs numéricos con e/E prevention reemplazados por NumericInput

5. **Eliminados debug logs:**
   - `LoginScreen.tsx`: `console.error(loginError)` en catch (línea 22)
   - `AnalistasPanel.tsx`: `console.log(selectedProjectId,contractorCode)` (línea 75)

6. **Build verificado:** `tsc --noEmit` + `vite build` sin errores.

**Por qué / causa raíz:** Las vistas tenían patrones UI duplicados (SectionHeader, Card, input handlers, badges) con lógica de sanitización inline repetida. El código espagueti dificultaba el mantenimiento y la consistencia visual.

**Archivos:**
- `src/utils.ts` — [NUEVO]
- `src/components/UI/Card.tsx` — [NUEVO]
- `src/components/UI/SectionHeader.tsx` — [NUEVO]
- `src/components/UI/NumericInput.tsx` — [NUEVO]
- `src/components/UI/AlertBanner.tsx` — [NUEVO]
- `src/components/UI/StatusBadge.tsx` — [NUEVO]
- `src/components/UI/EmptyState.tsx` — [NUEVO]
- `src/components/UI/FileDropZone.tsx` — [NUEVO]
- `src/views/CierreObraPanel.tsx` — refactor
- `src/views/ProcuraPanel.tsx` — refactor
- `src/views/FinanzasPanel.tsx` — refactor
- `src/views/InfraestructuraMantenimientoPanel.tsx` — refactor
- `src/views/AnalistasPanel.tsx` — refactor
- `src/views/PresidenciaDashboard.tsx` — refactor
- `src/views/UsuariosPanel.tsx` — refactor
- `src/views/PropuestaMaterialesPublica.tsx` — refactor
- `src/views/LoginScreen.tsx` — fix
- `src/views/ProveedoresRegistrados.tsx` — (input rating con lógica específica mantenido)
- `CHANGELOG.md` — actualizado

## [2026-07-20] — Refactor: separación por dominios (hooks) + InspectProjectModal extraído

**Tipo:** refactor

**Qué:**
1. **Extraído InspectProjectModal** (`src/components/InspectProjectModal.tsx`):
   - Modal inline de ~240 líneas movido a su propio componente
   - Renderiza `createPortal` internamente, App.tsx solo lo importa
   - Props limpias: `project: Project`, `onClose: () => void`
   - Eliminados imports de `createPortal`, `X`, `MapPin`, `Calendar`, `CheckCircle` de App.tsx

2. **Creado `src/hooks/useAuth.ts`**:
   - Encapsula: authToken, authUser, handleLogin, handleLogout
   - Exporta constantes de ruteo (`roleAccess`, `publicRoutes`, `isPublicPath`)
   - `canAccess` y `firstAllowedRoute` derivados de `authUser.role`
   - `handleLogout` solo limpia auth (el caller resetea datos de la app)

3. **Creado `src/hooks/useProjects.ts`**:
   - Encapsula: projects, auditLogs, isLoadingApi, inspectedProject
   - Todos los handlers del workflow (addProject, reviewProject, approveInvestment, addProposal, removeProposal, importSupplierProposals, submitComparative, selectContractor, rejectProposals, payAdvance, verifyCompletion, payFinal)
   - `loadApiData` con guarda de reentrada + fallback a INITIAL_DATA
   - `syncProject` centralizado (actualiza projects + inspectedProject + refreshAuditLogs)
   - Acepta `onContractorsLoaded` / `onMaterialsLoaded` para poblar hooks hermanos
   - `handleTriggerDemo` y `handleResetApp` incluidos

4. **Creado `src/hooks/useContractors.ts`**: contractors, handleAddContractor, handleUpdateContractorRating

5. **Creado `src/hooks/useCatalog.ts`**: materialsCatalog, handleAddCatalogItem

6. **App.tsx refactorizado** (580 → ~120 líneas):
   - Composición plana de hooks: `useAuth()` + `useProjects()` + `useContractors()` + `useCatalog()`
   - `handleLogout` compuesto: authLogout → resetData → resetContractors → resetCatalog → navigate
   - Routing + layout únicamente, sin lógica de negocio
   - Eliminados imports: `useRef`, `createPortal`, `Project`, `ProjectStatus`, `Contractor`, `AuditLog`, `Proposal`, `data`, `apiFetch`, iconos lucide

**Por qué / causa raíz:** App.tsx era un God Component de 824 líneas con 20+ handlers inline, estado global mezclado con UI, modal inline de 240 líneas y prop drilling de authToken. La lógica de negocio no era testeable ni mantenible por separado.

**Archivos:**
- `src/hooks/useAuth.ts` — [NUEVO]
- `src/hooks/useProjects.ts` — [NUEVO]
- `src/hooks/useContractors.ts` — [NUEVO]
- `src/hooks/useCatalog.ts` — [NUEVO]
- `src/components/InspectProjectModal.tsx` — [NUEVO]
- `src/App.tsx` — refactor completo

---

## [2026-07-20] — Fix críticos App.tsx + Sistema de notificaciones Toast + alert() → toast global

**Tipo:** refactor + fix

**Qué:**
1. **Eliminada redundancia** `refreshAuditLogs()` en `syncProject()` (ya incluido en `loadApiData()`).
2. **Guarda de reentrada `isFetchingRef`** en `loadApiData()` — previene StrictMode double-fetch y race conditions. El toast de error ahora aparece una sola vez.
3. **`syncProject` optimizado**: ya no llama `loadApiData()` (4 endpoints), solo `refreshAuditLogs()` (1 endpoint). Las mutaciones ya actualizan estado local con la respuesta del server.
4. **Fallback INITIAL data** cuando la API falla en `loadApiData()` (antes arrays vacíos sin mensaje).
3. **handleLogout consistente**: resetea a `[]` en vez de INITIAL (consistente con estado inicial).
4. **activeRole** ahora usa `authUser?.role` en vez de derivarse del pathname (podía mostrar rol incorrecto).
5. **handleTriggerDemo** solo navega si `handleAddProject` no lanza error.
6. **Modal con `createPortal`** a `document.body` — previene rotura de z-index/position:fixed por stacking contexts.
7. **ToastProvider + useToast** — sistema de notificaciones tipo toast con 4 variantes (success/error/warning/info), animación slide-up, auto-dismiss 4s.
8. **Todos los `alert()` reemplazados** por `showToast()`:
   - 10 handlers en App.tsx
   - 3 en CierreObraPanel
   - 1 en AnalistasPanel
   - 2 en MaterialesProveedores
   - 3 en ProcuraPanel
   - 2 en PropuestaMaterialesPublica
   - 2 en ProveedoresRegistrados

**Archivos:**
- `src/components/UI/Toast.tsx` — [NUEVO]
- `src/index.css` — animación `slide-up`
- `src/App.tsx` — múltiples fixes
- `src/views/CierreObraPanel.tsx` — alerts → toast
- `src/views/AnalistasPanel.tsx` — alerts → toast
- `src/views/MaterialesProveedores.tsx` — alerts → toast
- `src/views/ProcuraPanel.tsx` — alerts → toast
- `src/views/PropuestaMaterialesPublica.tsx` — alerts → toast
- `src/views/ProveedoresRegistrados.tsx` — alerts → toast
- `CHANGELOG.md` — actualizado

---

## [2026-07-20] — Service: src/services/api.ts creado + eliminado prop drilling apiBaseUrl

**Tipo:** refactor

**Qué:**
1. Creado `src/services/api.ts` con:
   - `API_BASE_URL` — única fuente de verdad para la URL del backend
   - `apiFetch<T>(path, options?)` — wrapper fetch tipado con auth automático, Content-Type, error handling y unwrap de `.data` Laravel
   - `apiDownload(path, options?)` — wrapper para descarga de archivos (blob)
2. Refactorizados todos los `fetch()` dispersos en `App.tsx`, vistas y servicios para usar `apiFetch<T>`:
   - `App.tsx` — ~30 llamadas reemplazadas
   - `MaterialesProveedores.tsx` — 1 llamada
   - `UsuariosPanel.tsx` — 2 llamadas
   - `ProveedoresRegistrados.tsx` — 2 llamadas
   - `PropuestaMaterialesPublica.tsx` — 2 llamadas
   - `aiEvaluationService.ts` — 1 llamada
3. Eliminado prop drilling de `apiBaseUrl`:
   - `ProcuraPanel.tsx` — ya no recibe `apiBaseUrl` por props, usa `apiDownload` del service
   - `EvaluacionInteligenteModal.tsx` — eliminada prop `apiBaseUrl`
   - `aiEvaluationService.ts` — eliminado parámetro `apiBaseUrl` de `evaluateProposals`
   - `App.tsx` — ya no pasa `apiBaseUrl` a `ProcuraPanel`
4. Corregido doble punto y coma `;;` en `MaterialesProveedores.tsx` y `UsuariosPanel.tsx`
5. Eliminados `import React` innecesarios en vistas (React 19)
6. Tipado correcto de `materialsCatalog` en `App.tsx`

**Por qué / causa raíz:** No existía un cliente HTTP centralizado. C ada componente y servicio declaraba su propia copia de `VITE_API_URL` y repetía headers, error handling y lógica de parsing. La cadena de prop drilling `apiBaseUrl` atravesaba 4 niveles (App → ProcuraPanel → EvaluacionInteligenteModal → aiEvaluationService) innecesariamente.

**Archivos:**
- `src/services/api.ts` — nuevo
- `src/App.tsx` — refactor fetch calls + eliminar apiBaseUrl prop
- `src/views/ProcuraPanel.tsx` — eliminar apiBaseUrl prop, usar apiDownload
- `src/views/MaterialesProveedores.tsx` — usar apiFetch
- `src/views/UsuariosPanel.tsx` — usar apiFetch
- `src/views/ProveedoresRegistrados.tsx` — usar apiFetch
- `src/views/PropuestaMaterialesPublica.tsx` — usar apiFetch
- `src/components/EvaluacionInteligenteModal.tsx` — eliminar apiBaseUrl prop
- `src/services/aiEvaluationService.ts` — usar apiFetch, eliminar apiBaseUrl param

---

## [2026-07-20] — Refactor: views/ folder, alias fix, LoginScreen extraction, normalization

**Tipo:** refactor

**Qué:**
1. Creada carpeta `src/views/` y migradas las 10 vistas (componentes ruteables) desde `src/components/`.
2. Extraído `LoginScreen` de `App.tsx` a `src/views/LoginScreen.tsx`.
3. Corregido alias `@` en `vite.config.ts` y `tsconfig.json`: apuntaba a raíz (`./`), ahora apunta a `./src`.
4. Agregado `"types": ["vite/client"]` en `tsconfig.json` y excluido `mobile/` para limpiar type-checking.
5. Eliminado `import React` innecesario en `App.tsx` (React 19 + react-jsx).
6. Limpiados iconos no utilizados del import de lucide-react en `App.tsx`.

**Por qué / causa raíz:** Los componentes vista y los componentes reutilizables estaban mezclados sin separación de propósito. El alias incorrecto podía causar confusión y errores de resolución de módulos.

**Archivos:**
- `src/views/` (11 archivos — nuevo directorio)
- `src/components/` (quedan: `UI/`, `SkeletonLoader.tsx`, `EvaluacionInteligenteModal.tsx`)
- `src/App.tsx` — imports actualizados + LoginScreen extraído
- `vite.config.ts` — alias `@` → `./src`
- `tsconfig.json` — alias `@/*` → `./src/*`, +types, +exclude

---

## [2026-07-20] — Fix: overflow horizontal en header de lista de usuarios (UsuariosPanel)

**Tipo:** fix

**Qué:** El contenedor de la lista de usuarios en `UsuariosPanel` usaba simultáneamente `flex flex-col` y `grid grid-cols-1`, clases CSS incompatibles que provocaban que el header "Usuarios del sistema - n° usuarios" se estirara horizontalmente sin control. Además contenía la clase mal escrita `scrool-smooth` y un hack de scrollbar (`pr-2 -mr-2`).

**Causa raíz:** `grid grid-cols-1` sobreescribe `flex flex-col` como display. Al ser un grid de 1 columna, el header (flex item del grid) ocupaba todo el ancho disponible del contenedor sin restricción de overflow.

**Cambios:**
- Eliminado `grid grid-cols-1` (conflicto con flex)
- Eliminado `pr-2 -mr-2` (hack de scrollbar innecesario)
- Corregido `scrool-smooth` → eliminado (clase mal escrita, no existe en Tailwind)
- Se conserva `flex flex-col overflow-y-auto max-h-148`

**Archivos:**
- `src/components/UsuariosPanel.tsx`

---

## [2026-07-20] — Refactor: Sidebar nav extraído a componente UI + mejoras visuales

**Tipo:** refactor + feature

**Qué:**
1. Sidebar nav (antes inline en `App.tsx` ~170 líneas) encapsulado en `src/components/UI/SidebarNav.tsx`
2. Mejoras visuales para UX más fluida y moderna:

### Refactor
- Creada carpeta `src/components/UI/` y componente `SidebarNav` con props tipadas (`isOpen`, `onClose`, `user`, `onLogout`, `canAccess`)
- `App.tsx` reducido en ~170 líneas; eliminadas dependencias de 6 iconos lucide-react y función `NavLink`
- Compilación 100% limpia (0 errores nuevos)

### Mejoras visuales
- **Header**: Gradiente `from-sky-400 to-sky-600` en logo + glow difuso en background
- **Nav items**: `border-l-2` con color de sección como indicador activo, efecto `hover:translate-x-0.5`, íconos con `group-hover:scale-110 group-hover:rotate-[3deg]`
- **Section label**: Indicador LED pulsante `bg-sky-500/60 animate-pulse`
- **Footer**: Avatar con iniciales del usuario (`bg-gradient-to-br from-sky-400 to-sky-600`), nombre y email truncados
- **Logout**: `group-hover:translate-x-0.5` en icono
- **Mobile backdrop**: Transición `opacity` con `duration-300 ease-out` en vez de render condicional brusco
- **Sutilezas**: `border-slate-800/80` en separadores, `shadow-sm` en items activos, `ring-1 ring-white/10` en avatares

**Archivos:**
- `src/components/UI/SidebarNav.tsx` — [NUEVO]
- `src/App.tsx` — import SidebarNav, eliminado bloque inline y funciones auxiliares

---

## [2026-07-17] — Feature: Importación automática de propuestas de proveedores al cuadro comparativo (Analistas)

**Tipo:** feature

**Qué:** Nuevo botón "Traer del portal" en el panel de Analistas que importa automáticamente las propuestas de materiales recibidas desde el portal público de proveedores (`SupplierMaterialProposal`) como propuestas del cuadro comparativo (`ProjectProposal`).

**Flujo completo:**
1. El analista selecciona un expediente en estado `CONFIRMADO_PROCURA`
2. Hace clic en "Traer del portal" (integrado en el header de "Propuestas Ingresadas")
3. El frontend llama al nuevo endpoint `POST /api/projects/{project}/import-supplier-proposals`
4. El backend busca todas las `SupplierMaterialProposal` del proyecto, matchea cada una con un `Contractor` registrado (por email o nombre), calcula `materialCost` (suma de items), convierte duración a semanas, y crea los `ProjectProposal` correspondientes
5. Si el contratista ya tiene una propuesta en el proyecto, se omite (deduplicación)
6. El proyecto se actualiza en tiempo real en el frontend

**UX:**
- Botón integrado en el header de la sección de propuestas (antes estaba como bloque independiente entre la card de inversión y las propuestas)
- Loading state con spinner y texto "Importando..."
- Feedback success en banner verde con fade-out suave: 5s visible → 700ms transición `max-height` + `opacity` + `margin` → colapso sin saltos de layout
- Feedback error en banner rojo (permanente hasta nuevo intento)
- Mensaje de empty state actualizado para mencionar la opción de importación

**Backend — nuevo endpoint:**
- `POST /api/projects/{project}/import-supplier-proposals` en `ProjectController::importSupplierProposals`
- Sin body, sin validación extra (opera sobre datos ya existentes en BD)
- Retorna `{ message, imported, skipped, errors, project }`

**Archivos frontend:**
- `src/components/AnalistasPanel.tsx` — nuevo prop `onImportSupplierProposals`, estados `isImporting`/`importFeedback`, handler `handleImport`, botón integrado en header, feedback con transición smooth
- `src/App.tsx` — nuevo handler `handleImportSupplierProposals` (línea 359), pasado a AnalistasPanel en ruta `/analistas`

**Archivos backend:**
- `app/Http/Controllers/Api/ProjectController.php` — nuevo método `importSupplierProposals` (línea 179), import `SupplierMaterialProposal`
- `routes/api.php` — nueva ruta `POST /projects/{project}/import-supplier-proposals` (línea 47)

---

## [2026-07-17] — Feature: Skeleton loading en todas las vistas del sistema

**Tipo:** feature

**Qué:** Implementación de skeleton loaders animados en todas las vistas principales del frontend. Cuando `isLoadingApi` es `true` (carga inicial de datos desde Laravel), cada panel muestra un esqueleto visual que coincide con su layout bento — tarjetas KPI, tablas, listas y cards — en vez de renderizar arrays vacíos que mostraban mensajes de "No hay nada pendiente" erróneamente.

**Causa raíz (hallazgos G3/L2):**
- `isLoadingApi` se declaraba en App.tsx (línea 192) pero **nunca se consumía** en ningún componente.
- Los estados `projects`, `contractors`, `auditLogs`, `materialsCatalog` inician como `[]`.
- Durante los ~2-5 segundos que tarda `loadApiData()`, los paneles renderizan con arrays vacíos → mostraban el mensaje de "empty state" ("No hay obras", "No hay proveedores", etc.).
- Al completar la carga, los datos aparecían de golpe → parpadeo visual y confusión del usuario.

**Solución:**

1. **`src/components/SkeletonLoader.tsx`** (NUEVO) — Componente con primitivas reutilizables:
   - `SkeletonBlock` — bloque genérico animate-pulse con `bg-slate-200 rounded-xl`
   - `SkeletonCard` — card bento completa con header (icono + título) + 3 bloques de contenido
   - `SkeletonStats` / `SkeletonStatsDark` — KPI cards para el dashboard de Presidencia
   - `SkeletonTable` — tabla completa con header + N filas skeleton
   - `SkeletonList` — lista de items skeleton
   - `SkeletonBadge`, `SkeletonButton` — elementos pequeños

2. **Cada panel** recibe `isLoading?: boolean` y muestra su skeleton correspondiente cuando está en `true`:
   - `PresidenciaDashboard` → 4 KPI cards + chart card + audit table + projects table
   - `CierreObraPanel` → cards en grid 7/5 + listas
   - `ProcuraPanel` → card de formulario + tabla comparativa
   - `AnalistasPanel` → cards en grid 7/5 + comparative panel
   - `FinanzasPanel` → 2 cards en grid + ledger table
   - `InfraestructuraMantenimientoPanel` → skeleton en "Peticiones del Departamento" (sidebar)
   - `ProveedoresRegistrados` → skeleton rows en tabla de contratistas

3. **`App.tsx`** — Se pasa `isLoading={isLoadingApi}` a cada panel en las rutas.

**Estética:** Los skeletons usan `animate-pulse` de Tailwind con `bg-slate-200`, bordes `rounded-xl`/`rounded-2xl` que matchean el diseño bento existente. Sin animaciones bruscas ni colores distractores.

**Archivos:**
- `src/components/SkeletonLoader.tsx` — [NUEVO]
- `src/components/PresidenciaDashboard.tsx` — isLoading prop + PresidenciaSkeleton
- `src/components/CierreObraPanel.tsx` — isLoading prop + CierreObraSkeleton
- `src/components/ProcuraPanel.tsx` — isLoading prop + ProcuraSkeleton
- `src/components/AnalistasPanel.tsx` — isLoading prop + AnalistasSkeleton
- `src/components/FinanzasPanel.tsx` — isLoading prop + FinanzasSkeleton
- `src/components/InfraestructuraMantenimientoPanel.tsx` — isLoading prop + skeleton en sidebar
- `src/components/ProveedoresRegistrados.tsx` — isLoading prop + skeleton rows en tabla
- `src/App.tsx` — isLoading={isLoadingApi} en todas las rutas

---

## [2026-07-17] — Fix: input type="number" se incrusta en 0 al borrar y tipear nuevo valor

**Tipo:** fix

**Qué:** En todos los `<input type="number">` controlados con estado `number`, cuando el usuario borraba todo el contenido el valor se forzaba a `0` vía `parseFloat(e.target.value) || 0`. Al tipear un nuevo dígito, el `0` se quedaba "incrustado" en el input porque React y el browser nativo se desincronizaban (bug conocido de controlled number inputs con valor `0`).

**Causa raíz:** El patrón `parseFloat(e.target.value) || FALLBACK` en el onChange devolvía `0` cuando el string estaba vacío (`parseFloat("")` = `NaN`), causando que el estado siempre fuera `number` y nunca `""`. React re-renderizaba el input con `value={0}`, y el navegador nativo no podía reemplazar limpiamente ese `0` cuando el usuario tipeaba un nuevo número.

**Solución (Opción 2):** Cambiar el tipo de estado a `number | ""` y preservar el string vacío en el onChange cuando el usuario borra el campo:
- Estado: `useState<number | "">(INITIAL)`
- onChange: `e.target.value === "" ? "" : parseFloat(e.target.value) || FALLBACK`
- Normalización a número en los handlers de submit/uso (via `Number(valor || DEFAULT)`)
- Se mantiene el mismo patrón ya probado en `estimatedDays` de `PropuestaMaterialesPublica.tsx`

**Archivos modificados:**
- `src/components/AnalistasPanel.tsx` — `deliveryWeeks`, `materialCost`, `laborCost`: estados `number | ""`, handlers actualizados, normalización en `handleAddProposal`
- `src/components/ProcuraPanel.tsx` — `approvedAmount`: estado `number | ""`, handler actualizado, normalización en `handleApproveInvestment`
- `src/components/InfraestructuraMantenimientoPanel.tsx` — `materialQty`, `customMaterialPrice`: estados `number | ""`, handlers actualizados, normalización en `handleAddMaterial`
- `src/components/ProveedoresRegistrados.tsx` — `editRating`: estado `number | ""`, handler actualizado con early return para `""`, normalización en `handleSave`
- `src/components/PropuestaMaterialesPublica.tsx` — `ItemRow` sobrescribe `unitPrice` y `quantity` como `number | ""`, `updateItem` normaliza en totalPrice, 3 onChange handlers actualizados, submit handler normaliza antes de enviar a API

### Adicional: Sanitización de notación científica ('e'/'E')

**Qué:** Los `<input type="number">` del navegador aceptan el caracter 'e' como parte de notación científica (ej. `5e2` = 500). En un flujo contable esto genera riesgo de error humano: un usuario que teclea `5e2` pensando que escribe `52` obtiene `500` sin advertencia.

**Fix:** Se agregó `.replace(/[eE]/g, '')` a `e.target.value` en todos los onChange handlers de inputs numéricos. Esto elimina cualquier caracter 'e'/'E' antes del parseFloat/parseInt, previniendo la interpretación de notación científica.

**Archivos:** Mismos 5 archivos + `PropuestaMaterialesPublica.tsx` (estimatedDays)

## Sinopsis del Proyecto

**Stack:** React 19 + TypeScript 5.8 + Vite 6 + TailwindCSS 4 (Frontend SPA) — Laravel + Sanctum (Backend API) — MySQL/MariaDB.

**Propósito:** Sistema multi-rol para gestionar el ciclo de vida completo de obras de infraestructura y mantenimiento. Cada obra pasa secuencialmente por 8 departamentos (Infraestructura → Cierre de Obra → Procura → Analistas → Finanzas → etc.) con trazabilidad en tiempo real mediante bitácora de auditoría.

**Estructura clave:**
- `src/App.tsx` — Routing + layout únicamente. Compone hooks por dominio.
- `src/hooks/useAuth.ts` — Autenticación, control de acceso por rol, constantes de ruteo
- `src/hooks/useProjects.ts` — Estado global de proyectos + todos los handlers del workflow (12 handlers)
- `src/hooks/useContractors.ts` — Catálogo de contratistas
- `src/hooks/useCatalog.ts` — Catálogo de materiales
- `src/components/InspectProjectModal.tsx` — Modal de trazabilidad de obra (createPortal a body)
- `src/components/UI/` — Componentes de UI encapsulados y reutilizables (SidebarNav, MobileTopBar, Toast)
- `src/views/` — 11 vistas (ruteables), reciben handlers por props desde App.tsx
- `src/services/api.ts` — Cliente HTTP centralizado (apiFetch, apiDownload)
- `src/services/aiEvaluationService.ts` — Servicio de llamada a backend Laravel para evaluación IA con failover
- `src/types.ts` — Interfaces `Project`, `Proposal`, `Contractor`, `ProjectStatus` y más
- `src/components/SkeletonLoader.tsx` — Primitivas de skeleton loading (SkeletonBlock, SkeletonCard, SkeletonTable, etc.)
- `src/data.ts` — ⚠️ Datos de respaldo legacy (por limpiar — ver PENDIENTES.md)
- `mobile/App.tsx` — App mobile React Native con los mismos paneles (lectura y acciones básicas)
- `database.sql` — Schema completo MySQL con migrations y seed data

---

## [2026-07-17] — Auditoría completa del frontend (24 hallazgos documentados)

**Tipo:** audit

**Qué:** Auditoría integral del frontend (web + mobile) cubriendo configuración, dependencias, seguridad, calidad de código, estilos visuales, rendimiento y accesibilidad. Se documentaron 24 hallazgos clasificados por severidad.

**Hallazgos por categoría:**

### 🔴 Críticos (3)

| ID | Hallazgo | Archivos | Impacto |
|----|----------|----------|---------|
| C1 | Clases Tailwind v4 inválidas (`h-4.5`, `w-4.5`, `pl-9.5`, `p-4.5`) no generan CSS — iconos del sidebar sin dimensión, padding de inputs de búsqueda roto | `src/App.tsx`, `src/components/ProveedoresRegistrados.tsx`, `src/components/PresidenciaDashboard.tsx`, `src/components/InfraestructuraMantenimientoPanel.tsx` | Iconos del sidebar toman tamaño SVG nativo (24×24) en vez de 18×18; el icono Search en inputs de búsqueda se superpone con el texto |
| C2 | `.env` con `GEMINI_API_KEY` trackeado por git (pese a `.gitignore`) | `.env` | Exposición de secretos si se hace push; el archivo no debe estar en el repo ✅ **Falso positivo — .env nunca estuvo en git** |
| C3 | 8 dependencias no utilizadas + `vite` duplicado en dependencies y devDependencies | `package.json` | Bundle inflado, mantenibilidad degradada ✅ **Resuelto 2026-07-20** |
| C4 | Carga de archivos NO DESEADOS | `package.json` | Los inputs de carga de archivos permiten cargar archivos fuera de lo que son .PDF, .DWG, .DXF, .PNG, .JPG, .SVG ✅ **Resuelto 2026-07-20 — validación triple (extensión + MIME + tamaño) en FileDropZone** |

### 🟠 Graves (5)

| ID | Hallazgo | Archivos | Impacto |
|----|----------|----------|---------|
| G1 | `InteractiveOrganigrama.tsx` — 307 líneas de código nunca importado | `src/components/InteractiveOrganigrama.tsx` | Código muerto mantenido sin propósito ✅ **Resuelto 2026-07-20 — archivo eliminado** |
| G2 | `syncProject()` llama `refreshAuditLogs()` + `loadApiData()` — hace 6 fetchs por mutación | `src/App.tsx:258-263` | 6 peticiones HTTP donde 1-2 bastan; race condition potencial |
| G3 | `isLoadingApi` nunca se consume — el layout se renderiza con arrays vacíos hasta que carga la API | `src/App.tsx:187-193,232-238` | El usuario ve dashboard con $0, 0 obras, 0 proveedores durante ~segundos, luego parpadea |
| G4 | `activeRole` derivado de la URL, no del rol del usuario autenticado | `src/App.tsx:167` | Badge "Terminal: X" puede mostrar rol incorrecto |
| G5 | Doble punto y coma `;;` en dos archivos | `src/components/MaterialesProveedores.tsx:10`, `src/components/UsuariosPanel.tsx:19` | Código sucio |

### 🟡 Moderados (8)

| ID | Hallazgo | Archivos |
|----|----------|----------|
| M1 | Componente muerto InteractiveOrganigrama (duplica G1) | `src/components/InteractiveOrganigrama.tsx` | ✅ **Resuelto 2026-07-20** |
| M2 | `strict: false` implícito en tsconfig.json → `useState([])` infiere `never[]` | `tsconfig.json`, `src/App.tsx:190` |
| M3 | Alias `@` apunta a la raíz del proyecto, no a `./src` | `vite.config.ts:11` |
| M4 | `setMaterialsCatalog(never[])` + `handleAddCatalogItem` agrega elemento no-tipado | `src/App.tsx:190,463-465` |
| M5 | `handleResetApp` y `handleLogout` mezclan datos de respaldo locales vs API | `src/App.tsx:483-521` |
| M6 | Solo `handleSelectContractor` propaga errores al caller; los demás usan `alert()` | `src/App.tsx` (múltiples handlers) |
| M7 | `refreshAuditLogs()` redundante porque `loadApiData()` lo incluye | `src/App.tsx:240-261` |
| M8 | Código comentado legacy (initial state con datos mock) | `src/App.tsx:182-186` |

### 🔵 Leves (5)

| ID | Hallazgo | Archivos |
|----|----------|----------|
| L1 | `html lang="en"` cuando la UI está en español | `index.html:2` |
| L2 | Sin loading skeleton en carga inicial (ídem G3) | `src/App.tsx` |
| L3 | `text-slate-400` sobre `bg-white` tiene contraste ~3.2:1 (WCAG AA requiere 4.5:1) | Múltiples componentes |
| L4 | Icon-only buttons sin `aria-label` | `src/App.tsx` (botones X, menú hamburguesa) |
| L5 | Sin rate limiting visual ni CAPTCHA en login | `src/App.tsx` |

### 📱 Mobile (3)

| ID | Hallazgo | Archivos |
|----|----------|----------|
| X1 | Props `visible` y `transparent` en Modal sin valor explícito (`={true}`) | `mobile/App.tsx:746` |
| X2 | URL del API hardcodeada en vez de configurable | `mobile/App.tsx:22` |
| X3 | Credenciales por defecto hardcodeadas (admin@ivoo.local / Admin12345) | `mobile/App.tsx:436-437` |

**Archivos:**
- (hallazgos cubren todo el frontend — no hay cambios aplicados, solo diagnóstico documentado)

---

## [2026-07-17] — Seed masivo de datos en infraestructura_ivoo (50+ registros por tabla)

**Tipo:** feature

**Qué:** Población completa de la base de datos `infraestructura_ivoo` con 50+ registros en cada tabla para propósitos de depuración y pruebas visuales/funcionales.

**Detalle por tabla (registros finales):**
- `app_modules`: 12 (4 nuevos)
- `contractors`: 55 (50 nuevos)
- `material_catalog`: 55 (45 nuevos)
- `projects`: 53 (ninguno nuevo, solo actualización de estados)
- `project_materials`: 55 (45 nuevos)
- `project_proposals`: 53 (50 nuevos)
- `project_payments`: 50 (48 nuevos)
- `audit_logs`: 58 (50 nuevos)
- `users`: 58 (51 nuevos)
- `project_documents`: 50 (50 nuevos)

**Workflow:** Los 53 proyectos ahora están distribuidos en los 9 estados del workflow (CREADO→COMPLETADO_PAGADO), simulando un pipeline realista. 40 proyectos tienen propuestas vinculadas, 50 pagos con referencias a propuestas.

**Archivos:** (temporales eliminados)
- seed_full.sql → seed_v2.sql (eliminados post-ejecución)

---

## [2026-07-17] — Fix overflow horizontal en CierreObraPanel (causa raíz identificada y resuelta)

**Tipo:** fix

**Qué:** El contenedor de "Revisión de Cálculos y Planos" en `CierreObraPanel` se expandía horizontalmente sin control al mostrar proyectos con títulos largos. Fix integral en TODA la cadena de contenedores.

**Causa raíz:** El componente original NO tenía NINGUNA protección contra overflow horizontal:
- Sin `max-w-full` en el root grid → el grid podía expandirse según contenido
- Sin `min-w-0` en grid/flex items → no podían encogerse por debajo del `min-content` del texto
- Sin `overflow-hidden` en cards/secciones → overflow no se recortaba
- `line-clamp-1` en títulos → `-webkit-box` intrínseco = texto completo (~1950px)
- Sin `truncate` en location → locations largos empujaban containers

**Cambios integrales:**
- **Root grid**: `max-w-full overflow-hidden` — límite superior contraído
- **Section 1 & 2**: `min-w-0 overflow-hidden` — permiten encoger, recortan overflow
- **Cards**: `overflow-hidden` — recortan cualquier desbordamiento interno
- **`space-y-5` / `space-y-2.5` divs**: `min-w-0` — eslabones intermedios quebradizos
- **Botones**: `min-w-0 overflow-hidden` — encogen y recortan
- **Títulos**: `line-clamp-1` → `truncate` — sin `-webkit-box` intrinsic bug
- **Location**: `truncate` → texto largo con elipsis
- **Form y detalles**: `min-w-0 overflow-hidden break-words` — protección del formulario activo
- **Badges/Status**: `shrink-0` — no se comprimen en flex
- **Section 2 items**: `truncate` en títulos, `truncate` en location con `<span>` wrapper

**Archivos:**
- `src/components/CierreObraPanel.tsx`

---

## [2026-07-16]

### Cambio: Plan de Integración de Evaluación Inteligente con IA (Procura)

Se definió e inició la implementación del sistema de Evaluación Inteligente de Ofertas para el módulo de Procura. El sistema evaluará las propuestas de contratistas usando 3 proveedores de IA (ChatGPT, Gemini, Claude) con failover automático entre ellos.

**Arquitectura decidida:**
- Backend AI Proxy en **Laravel** (endpoints nuevos en el API existente)
- Frontend React llama al endpoint Laravel `POST /api/ai/evaluate-proposals`
- Failover en orden: ChatGPT → Gemini → Claude
- Rol del prompt: "Ingeniero en Infraestructura con experiencia en finanzas y contratación"
- Se incluye el campo `observations` en `Proposal` para datos contextuales (tasa dólar, garantía, disponibilidad de material, etc.)

**Archivos afectados (frontend - este repo):**
- `src/types.ts` — agregar `observations` a `Proposal`
- `src/components/ProcuraPanel.tsx` — columna Observaciones + botón Evaluación Inteligente
- `src/services/aiEvaluationService.ts` — [NUEVO] servicio de llamada al proxy AI
- `src/components/EvaluacionInteligenteModal.tsx` — [NUEVO] modal con estados carga → resultado → error
- `database.sql` — columna `observations` en `project_proposals`

**Archivos afectados (backend - repo Laravel):**
- `app/Http/Controllers/Api/AIEvaluationController.php` — [NUEVO]
- `app/Services/AIEvaluationService.php` — [NUEVO] orquestador con failover
- `app/Services/Providers/OpenAIProvider.php` — [NUEVO]
- `app/Services/Providers/GeminiProvider.php` — [NUEVO]
- `app/Services/Providers/AnthropicProvider.php` — [NUEVO]
- `config/ai.php` — [NUEVO] configuración de API keys
- Migration para columna `observations` en `project_proposals`

**Causa raíz:** No existía análisis cualitativo automatizado para la selección de contratistas. La decisión se tomaba solo con datos cuantitativos (precio, plazo, % anticipo) sin considerar factores contextuales ni análisis financiero profundo.

---

## [2026-07-16] — Implementación Frontend

### Cambio: Implementación completa del frontend para Evaluación Inteligente

- **`src/types.ts`** — Agregado campo `observations?: string` a interfaz `Proposal` (uso interno para contexto AI: tasa dólar, garantía, disponibilidad material).
- **`database.sql`** — Agregada columna `observations TEXT` en tabla `project_proposals`.
- **`src/services/aiEvaluationService.ts`** — [NUEVO] Servicio que llama al endpoint Laravel `POST /api/ai/evaluate-proposals`. Tipado completo de request/response.
- **`src/components/EvaluacionInteligenteModal.tsx`** — [NUEVO] Modal con 3 estados:
  - *idle*: Resumen del proyecto, tabla de propuestas, botón "Iniciar Evaluación con IA"
  - *loading*: Animación con indicador del proveedor activo (ChatGPT → Gemini → Claude), barra de progreso, bitácora de failover en vivo
  - *result*: Score de confianza, tarjeta del ganador destacada, matriz comparativa (fortalezas/debilidades/riesgos), análisis cualitativo, recomendación final, botón "Aceptar recomendación"
  - *error*: Mensaje + botón reintentar
- **`src/components/ProcuraPanel.tsx`** — Agregado botón "Evaluación Inteligente" (icono BrainCircuit) en el header de cada proyecto con estado `COMPARATIVA_ENVIADA`. Al hacer clic abre el modal conectado al servicio AI.

**Arquitectura del flujo:**
```
Botón → setAiEvalProject → Modal (idle)
  → "Iniciar" → evaluateProposals() → POST /api/ai/evaluate-proposals
    → Loading (anima proveedor activo + log failover)
    → Result | Error
      → "Aceptar recomendación" → onSelectContractor()
```

**Próximo paso:** Implementar el backend Laravel (AIEvaluationController, AIEvaluationService con 3 providers, failover y rate-limit handling).

**Archivos:**
- `src/types.ts`
- `src/services/aiEvaluationService.ts`
- `src/components/EvaluacionInteligenteModal.tsx`
- `src/components/ProcuraPanel.tsx`
- `database.sql`

---

## [2026-07-16] — Feature Completa: Evaluación Inteligente con Selección de Proveedor

### Frontend (React + TypeScript)

**Nuevas capacidades:**
- **Selector de proveedor IA** en el modal: Automático (failover), ChatGPT, Gemini, Claude
- **Feedback visual correcto** según modo seleccionado:
  - Modo específico: muestra el proveedor elegido (ej. "Consultando: Gemini (Google)")
  - Modo automático: muestra "Automático (Failover: ChatGPT → Gemini → Claude)"
- **Log inicial dinámico**: "Iniciando evaluación con [proveedor]..." o "Iniciando evaluación en modo automático..."
- **Iconos Lucide** por proveedor: Network (auto), Bot (ChatGPT), Sparkles (Gemini), Brain (Claude)

**Archivos actualizados:**
- `src/components/EvaluacionInteligenteModal.tsx` — Selector, loading dinámico, logs correctos
- `src/services/aiEvaluationService.ts` — Parámetro opcional `provider` en `evaluateProposals()`

### Backend (Laravel)

**Endpoint mejorasel API)**
- `POST /api/ai/evaluate-proposals` acepta parámetro opcional `provider` (`chatgpt` | `gemini` | `claude`)
- Si se envía `provider`: usa **solo** ese proveedor (sin failover)
- Si no se envía: failover automático ChatGPT → Gemini → Claude
- Validación con `Rule::in(['chatgpt','gemini','claude'])`

**Archivos actualizados:**
- `app/Http/Controllers/Api/AIEvaluationController.php` — Parámetro `provider` opcional
- `app/Services/AI/AIEvaluationService.php` — Método `evaluateWithProvider()` para modo forzado

---

### Estado Final: Feature Completa ✅

**Para producción solo falta configurar API keys en `.env` del backend:**
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## [2026-07-16] — Eliminada columna `observations` (redundante)

**Causa:** La columna `observations` era redundante ya que `description` en `Proposal` cubre el mismo propósito. Los datos contextuales para la evaluación IA (tasa dólar, garantías, disponibilidad de material) se ingresarán en `description`.

**Cambios:**
- `src/types.ts` — eliminado campo `observations?: string` de interfaz `Proposal`
- `src/services/aiEvaluationService.ts` — eliminado `observations` del payload y tipo inline
- `database.sql` — eliminada columna `observations` de tabla `project_proposals`

**Archivos:**
- `src/types.ts`
- `src/services/aiEvaluationService.ts`
- `database.sql`

---

## [2026-07-16] — Fix UX: Feedback visual al adjudicar contratista desde modal IA

**Tipo:** fix

**Qué:** El modal de Evaluación Inteligente se quedaba con el estado "Adjudicando..." indefinidamente después de aceptar la recomendación, sin mostrar éxito o error. El callback `onSelectContractor` se ejecutaba fire-and-forget y el estado `accepting` nunca se resetaba.

**Causa raíz:**
1. `handleAccept` en el modal no hacía `await` del callback `onSelectContractor` (tipado como `void`)
2. `handleSelectContractor` en App.tsx atrapaba errores con `alert()` sin re-lanzar, por lo que el modal nunca se enteraba del resultado
3. No existían estados de `acceptSuccess` ni `acceptError` para renderizar feedback

**Cambios:**
- `src/components/EvaluacionInteligenteModal.tsx`:
  - Tipado de `onSelectContractor` cambiado a `Promise<void>`
  - `handleAccept` hecho `async` con `await` al callback + try/catch
  - Nuevos estados: `acceptSuccess` (boolean) y `acceptError` (string | null)
  - `ResultView`: al success muestra badge animado "¡Adjudicado!" con CheckCircle; al error muestra banner rojo con AlertTriangle + mensaje
  - Footer: texto dinámico según estado, badge "Adjudicado" animado en éxito
  - Auto-cierre del modal 1.8s después del éxito vía `setTimeout(() => onClose(), 1800)`
  - Reset de los nuevos estados al reabrir el modal
- `src/App.tsx` (`handleSelectContractor`): eliminado `alert()` y agregado `throw error` para propagar al modal
- `src/components/ProcuraPanel.tsx`: tipado de `onSelectContractor` actualizado a `Promise<void>`

**Archivos:**
- `src/components/EvaluacionInteligenteModal.tsx`
- `src/App.tsx`
- `src/components/ProcuraPanel.tsx`

---

## [2026-07-16] — Feature: Rating del contratista como criterio en evaluación IA

**Tipo:** feature

**Qué:** El `confidenceScore` asignado por la IA ahora considera también el `rating` (1.0–5.0) del contratista, que refleja su desempeño histórico, calidad y cumplimiento.

**Cambios:**
- `src/types.ts` — agregado `contractorRating: number` a interfaz `Proposal`
- `src/components/AnalistasPanel.tsx` — al crear una propuesta se incluye `contractorRating: contractor.rating`
- `src/services/aiEvaluationService.ts` — `contractorRating` incluido en el payload enviado al backend AI

**Archivos:**
- `src/types.ts`
- `src/components/AnalistasPanel.tsx`
- `src/services/aiEvaluationService.ts`

---

## [2026-07-16] — Fix overflow horizontal en CierreObraPanel (Revisión de Cálculos y Planos)

**Tipo:** fix

**Qué:** El contenedor de "Revisión de Cálculos y Planos" en el panel de Cierre de Obra se expandía horizontalmente sin límite al mostrar proyectos con títulos/locations largos (195+ caracteres). Se aplicaron 3 capas de defensa + scrollbar custom con estilo bento.

**Causa raíz:** CSS Grid items tienen `min-width: auto` por defecto, impidiendo que los botones del selector se encojan por debajo del tamaño de su contenido. Los textos largos expandían los grid items, y estos estiraban el contenedor padre horizontalmente. No había `overflow-x` que cortara el desbordamiento.

**Cambios:**
- `src/index.css` — nueva clase `.scrollbar-thin` (webkit + Firefox) con diseño thin, color slate-300/400, bordes redondeados, que matchea la estética bento de la app
- `src/components/CierreObraPanel.tsx`:
  - Card contenedor: `overflow-x-auto scrollbar-thin` — scroll horizontal solo cuando el contenido excede, con scrollbar estilizado
  - Grid items (botones): `min-w-0` — permite que se encojan por debajo del contenido, activando el truncamiento
  - Location text: `truncate` — equivalente a `overflow-hidden text-ellipsis whitespace-nowrap`
  - (Título ya tenía `line-clamp-1`)

**Archivos:**
- `src/index.css`
- `src/components/CierreObraPanel.tsx`

---

## [2026-07-16] — [RESUELTO 2026-07-17] Overflow horizontal en CierreObraPanel (Revisión de Cálculos y Planos)

**Tipo:** fix (resuelto el 2026-07-17)

**Qué:** El contenedor de "Revisión de Cálculos y Planos" en el panel de Cierre de Obra se expande horizontalmente sin control al mostrar 53 proyectos con títulos largos (~195 chars). El error persiste a pesar de múltiples intentos de fix.

**Intentos realizados (todos fallaron):**

1. `overflow-x-auto` en el card + `min-w-0` en botones + `truncate` en location
2. `min-w-0` en Section 1 wrapper (`lg:col-span-7`)
3. `overflow-x-auto` en `<main>` y route wrapper (App.tsx) + eliminado `transition-all`
4. `overflow-hidden` en botones + cards + Section 1
5. `min-w-0` en Section 2 wrapper (`lg:col-span-5`) + grid root `max-w-full`
6. Cambio de `display: grid` a `flex flex-wrap` con `width: calc(50%-6px)` en botones
7. Estilos inline con `maxWidth: '100%', overflow: 'hidden'` en grid root

**Hipótesis actual:** El `display: -webkit-box` de `line-clamp-1` en el título tiene un `min-content` intrínseco igual al ancho del texto completo (195 chars) que el navegador usa para calcular el ancho mínimo del botón como grid/flex item, y ese ancho se propaga hacia arriba en la cadena de contenedores a pesar de `min-w-0` y `overflow-hidden`.

**Archivos modificados (cambios actuales en disco pendientes de solución):**
- `src/App.tsx` — `<main>`: `min-w-0 overflow-x-auto`; route wrapper: `min-w-0 overflow-x-auto` (sin `transition-all`) — se mantienen como safety net
- `src/components/CierreObraPanel.tsx` — fix aplicado (ver entrada 2026-07-17)
- `src/index.css` — limpio (sin cambios pendientes)
