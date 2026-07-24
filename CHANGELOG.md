# CHANGELOG

## [2026-07-24] — Fix: Acceso a PRESIDENCIA solo para rol PRESIDENCIA
- Tipo: fix + security
- Qué: Eliminado acceso a `/presidencia` de todos los roles excepto `PRESIDENCIA` (y SUPERADMIN/ADMIN que ya no tienen acceso). Antes casi todos los roles (INFRAESTRUCTURA, CIERRE_DE_OBRA, PROCURA, ANALISTA, FINANZAS, CATALOGOS) tenían acceso a `/presidencia` en `roleAccess`.
- Por qué / causa raíz: El objeto `roleAccess` en `useRouting.ts` otorgaba acceso a `/presidencia` a casi todos los roles. El requisito es que solo el rol `PRESIDENCIA` pueda acceder a la pestaña de Presidencia.
- Archivos: `src/hooks/useRouting.ts`
- Verificación: `tsc --noEmit` 0 errores, tests pasando.

## [2026-07-24] — Fix: ProveedoresRegistrados — Eliminar modal anidado en invitación a proveedor
- Tipo: fix + refactor (UX)
- Qué: Reemplazado el `SelectModal` anidado dentro del `Modal` principal por un selector inline de obras dentro del mismo modal. El flujo anterior abría dos modales simultáneos (backdrop doble, foco confuso, UX engorrosa).
- Cambios:
  - Eliminado estado `isInviteProjectModalOpen` y handlers asociados (`setIsInviteProjectModalOpen` en open/close/reset).
  - Agregado estado `projectSearch` + `filteredProjects` derivado para búsqueda en cliente.
  - Selector inline: input de búsqueda + lista scrollable de obras activas con highlight de selección.
  - Botón "Generar enlace único" habilitado solo con obra seleccionada.
  - Mismo modal muestra resultado (link copiable) y botón "Generar para otra obra" que resetea el selector.
- Archivos: `src/views/ProveedoresRegistrados.tsx`
- Verificación: `tsc --noEmit` 0 errores (source), 379 tests pasando.

## [2026-07-24] — Fix: PropuestaMaterialesPublica — Dos problemas UX
- Tipo: fix + refactor
- Qué:
  1. **Espacios en campos de texto**: Eliminado `.trim()` del final de `sanitize()` que borraba espacios al escribir (cada `onChange` sanitizaba y recortaba). Ahora `sanitize` solo elimina HTML/JS peligroso.
  2. **Selector de unidad de tiempo desalineado**: Reemplazado `SelectModal` (modal anidado, trigger con `min-w-[200px]` que desbordaba su contenedor `w-36`) por `<select>` nativo con clases idénticas al `NumericInput` (`text-xs px-3.5 py-3 rounded-xl...`). Altura y baseline ahora coinciden pixel-perfect.
- Archivos: `src/views/PropuestaMaterialesPublica.tsx`
- Verificación: `tsc --noEmit` 0 errores (source), 379 tests pasando.

## [2026-07-24] — V2: Re-auditoría profunda completa — 106 hallazgos documentados
- Tipo: audit
- Qué: Re-auditoría completa del sistema (V2) con énfasis en código hardcodeado, seguridad, clean code, testing y configuración. Se auditaron ~120 archivos entre src/, mobile/, packages/shared/, config, BD y documentación.
- Hallazgos: 4 🔴 CRITICAL, 11 🟠 HIGH, 43 🟡 MEDIUM, 48 🟢 LOW (106 totales)
- Highlights:
  - **Código Hardcodeado**: 23 hallazgos. El más crítico: URL de producción (`https://infraestructuraback.ivoofix.com`) hardcodeada en `mobile/config.ts` y `vite.config.ts`. Intervalos de polling (`30000`) duplicados en 4 hooks. Matriz de roles, colores, modelos de IA y listas de roles hardcodeados en frontend.
  - **Seguridad**: API Keys de IA viajan completas al frontend (accesibles en React DevTools). Token JWT en localStorage sin httpOnly. .env versionado en git. Fallback silencioso a rol INFRAESTRUCTURA para roles desconocidos.
  - **Clean Code**: 4 God Components identificados (`UsuariosPanel` 742 líneas, `ProveedoresRegistrados` 608, `ProcuraPanel` 555, `PresidenciaDashboard` 476). 8 refactors M-01 a M-08 ya aplicados desde V1.
  - **Testing**: 27 suites, 379 tests, 0 fallos, 90.64% coverage lines. 6 vistas críticas aún sin tests directos.
  - **Documentación**: README.md es template de AI Studio (no describe el proyecto). FLUJO_SISTEMA.md desfasado (no incluye módulo IA). Auditoría V1 desactualizada en sección testing.
- Archivos: `AUDITORIA_front_24_07_2026 // V2.md` [NUEVO], `PENDIENTES.md`
- Verificación: `tsc --noEmit` 0 errores, 379 tests pasando.

## [2026-07-24] — M-08: Crear componente Button compartido + estandarizar AIConfigFormModal
- Tipo: refactor
- Qué: Creado `src/components/UI/Button.tsx` como componente compartido de botón con 3 variantes (primary/secondary/danger) y 2 tamaños (sm/md). Soporta `isLoading` (muestra Spinner), `icon` y atributos HTML estándar.
- `AIConfigFormModal.tsx`: reemplazados los 2 botones inline (Cancelar + Guardar) por `<Button variant="secondary">` y `<Button variant="primary" isLoading={isSaving}>`. Eliminada importación de `Loader2` (ya no necesario).
- Archivos: `src/components/UI/Button.tsx` [NUEVO], `src/components/Modals/AIConfigFormModal.tsx`
- Verificación: `tsc --noEmit` 0 errores, 379 tests pasando.

## [2026-07-24] — M-07: Reemplazar successMsg manual por Toast en InfraestructuraMantenimientoPanel
- Tipo: refactor
- Qué: Eliminado el estado local `successMsg` con `setTimeout` de auto-clear (4s) en `InfraestructuraMantenimientoPanel.tsx`. Reemplazado por `showToast(msg, "success")` del sistema de Toast centralizado.
- Cambios:
  - Eliminados: `successMsg` state, `successTimerRef`, `useEffect` de auto-clear (~10 líneas)
  - Eliminada importación de `CheckCircle` (lucide) y `useEffect`/`useRef` (React) — ya no necesarios
  - Agregado: `useToast` + `showToast`
  - `setSuccessMsg("Petición…")` → `showToast("Petición…", "success")`
  - Eliminado `<AlertBanner type="success">` del JSX
- Archivos: `src/views/InfraestructuraMantenimientoPanel.tsx`
- Verificación: `tsc --noEmit` 0 errores, 379 tests pasando.

## [2026-07-24] — M-06: Mover getPendingCount a utils/workflowStatus
- Tipo: refactor
- Qué: Extraída la función `getPendingCount` (switch role→status filter) de `InteractiveOrganigrama.tsx` a un nuevo módulo `src/utils/workflowStatus.ts`. El componente ahora importa la función compartida.
- `InteractiveOrganigrama.tsx`: eliminados ~25 líneas de lógica local (~308→~283 líneas). También eliminada importación de `ProjectStatus` (ya no lo necesita directamente).
- La función ahora recibe `projects` como primer argumento explícito (antes capturaba del closure) — más predecible, testeable y reusable por otros componentes/vistas.
- Archivos: `src/utils/workflowStatus.ts` [NUEVO], `src/components/InteractiveOrganigrama.tsx`
- Verificación: `tsc --noEmit` 0 errores, 379 tests pasando.

## [2026-07-24] — M-05: Hacer genérica signatureOf en useProjectsData
- Tipo: refactor
- Qué: `signatureOf` (deduplicación vía firma para polling) ahora es configurable mediante la opción `signatureFn` en `UseProjectsDataOptions`. Si no se provee, usa la implementación default (backward compatible).
- `defaultSignatureOf` extraída a nivel de módulo como función estable. `SignatureFn` type exportado para que callers puedan tipar su función personalizada.
- `useProjectsData` ahora acepta `{ authToken, showToast, signatureFn? }`.
- Archivos: `src/hooks/useProjectsData.ts`
- Verificación: `tsc --noEmit` 0 errores (source), 379 tests pasando.

## [2026-07-24] — M-04: Extraer useRateLimit hook de LoginScreen
- Tipo: refactor
- Qué: Extraída la lógica de rate limiting (backoff exponencial con intentos fallidos, bloqueo con countdown, limpieza al desmontar) de `LoginScreen.tsx` a un hook reutilizable `src/hooks/useRateLimit.ts`.
- El hook expone: `attempts`, `blockTimer`, `isBlocked`, `recordAttempt()` (retorna segundos de bloqueo), `resetAttempts()`. Usa `attemptsRef` para evitar stale closures en `recordAttempt`. Acepta `maxAttempts` (default 3) y `maxBlockSeconds` (default 60).
- `LoginScreen.tsx` se redujo de ~222 → ~170 líneas (-23%). Eliminados imports de `useEffect`, `useRef`, `useCallback`; ahora solo importa `useState` de React y `useRateLimit` del hook.
- Archivos: `src/hooks/useRateLimit.ts` [NUEVO], `src/views/LoginScreen.tsx`
- Verificación: `tsc --noEmit` 0 errores, 379 tests pasando (incluyendo 23 tests de LoginScreen con rate limiting).

## [2026-07-24] — M-03: Crear componente Spinner compartido — eliminar SVG duplicado
- Tipo: refactor
- Qué: Creado `src/components/UI/Spinner.tsx` como componente compartido de spinner, eliminando 7 instancias duplicadas del patrón SVG `<circle>+<path>` y spinner border-based:
  - **3 inline SVG spinners** reemplazados: `ConfirmDialog.tsx`, `CierreObraPanel.tsx`, `InfraestructuraMantenimientoPanel.tsx` → `<Spinner />` (con `data-testid` preservado en ConfirmDialog)
  - **4 border-based spinners** reemplazados: `App.tsx`, `PublicRouteShell.tsx`, `AuthenticatedRoutes.tsx`, `AuthenticatedLayout.tsx` → `<Spinner size="xl" />`
- Props del componente: `size` ("xs"|"sm"|"md"|"lg"|"xl"), `className`, `data-testid`, `aria-hidden`.
- El SVG del spinner está centralizado en un único lugar, eliminando la duplicación del patrón en 3 vistas y 4 fallbacks de Suspense.
- Archivos: `src/components/UI/Spinner.tsx` [NUEVO], `src/components/UI/ConfirmDialog.tsx`, `src/views/CierreObraPanel.tsx`, `src/views/InfraestructuraMantenimientoPanel.tsx`, `src/App.tsx`, `src/routes/PublicRouteShell.tsx`, `src/routes/AuthenticatedRoutes.tsx`, `src/components/Layout/AuthenticatedLayout.tsx`
- Verificación: `tsc --noEmit` 0 errores, 379 tests pasando.

## [2026-07-24] — M-02: Unificar KpiCard duplicado (PresidenciaDashboard + shared)
- Tipo: refactor
- Qué: Eliminada la implementación local de `KpiCard` en `PresidenciaDashboard.tsx`. El componente compartido `components/UI/KpiCard.tsx` ahora soporta ambos patrones de uso:
  - **Simple** (`value` + `sub`): display de estadística simple (usado en `UsageDashboard`)
  - **Complejo** (`children`): contenido JSX personalizado (usado en `PresidenciaDashboard`: DonutChart, progress bars, gradientes)
- Props nuevas: `accent`, `borderAccent`, `variant` ("light"|"dark"), `children`. `color` se mantiene como alias legacy de `borderAccent`.
- El componente compartido adopta la apariencia más pulida de PresidenciaDashboard (hover effects, rounded-2xl, gradient icon container, IVOO watermark), beneficiando también a `UsageDashboard`.
- `PresidenciaDashboard` eliminó ~35 líneas de código duplicado. `ReactNode` import removido (no más necesario).
- Archivos: `src/components/UI/KpiCard.tsx`, `src/views/PresidenciaDashboard.tsx`
- Verificación: `tsc --noEmit` 0 errores, 379 tests pasando.

## [2026-07-24] — V2 Audit: All 379 tests passing — fixes to useAIConfig, useProjectsData, App.test.tsx
- Tipo: testing
- Qué: Corregidos 17 tests rotos distribuidos en 3 archivos, pasando de 362→379 tests, 0 fallos:
  - **useAIConfig.test.ts (11 tests)**: Reescribito con patrón `waitForLoad` (flushAll microtasks) para resolver timing de `isLoading` en hooks con async effects. Eliminado `vi.waitFor` que nunca detectaba el cambio de estado.
  - **useProjectsData.test.ts (9 tests)**: Mismo fix: reemplazado `vi.waitFor` → `flushAll()`. Corregidos tests de data fetching, fallback, deduplication, token lifecycle, polling y exposed API.
  - **App.test.tsx (8 tests)**: 2 problemas corregidos:
    1. Router anidado: App.tsx tenía `<BrowserRouter>` hardcodeado, tests lo envolvían en `<MemoryRouter>`. Refactor: App acepta prop opcional `router` (default BrowserRouter) + spread de props extra para `initialEntries`.
    2. Lazy views no encontraban el mock vía data-testid: cambiado `screen.getByTestId` → `screen.findByTestId` + `flushAll()` para esperar que Suspense resuelva el lazy import.
- Archivos: `src/App.tsx`, `src/__tests__/hooks/useAIConfig.test.ts`, `src/__tests__/hooks/useProjectsData.test.ts`, `src/__tests__/App.test.tsx`

## [2026-07-24] — M-01: Extraer subcomponentes de App.tsx — PublicRouteShell, AccessDeniedView, AuthenticatedRoutes
- Tipo: refactor
- Qué: Extraídos 3 subcomponentes de `App.tsx` a `src/components/Routes/`:
  - **PublicRouteShell** — Renderiza las rutas públicas (ErrorBoundary + Suspense + Routes con MaterialesProveedores/PropuestaMaterialesPublica). Recibe `contractorsCount` y `onAddContractor` como props.
  - **AccessDeniedView** — Pantalla "Acceso denegado" con botón de cerrar sesión. Recibe `onLogout`.
  - **AuthenticatedRoutes** — Contiene `AuthenticatedLayout` + todas las rutas protegidas con `ProtectedRoute`. Recibe todos los datos y handlers desde `AppRoutes`.
- App.tsx bajó de 354→231 líneas (-35%). `AppRoutes` ahora tiene 138 líneas con 5 early returns limpios.
- `tsc --noEmit` 0 errores, 379 tests pasando.
- Archivos: `src/App.tsx`, `src/components/Routes/PublicRouteShell.tsx` [NUEVO], `src/components/Routes/AccessDeniedView.tsx` [NUEVO], `src/components/Routes/AuthenticatedRoutes.tsx` [NUEVO], `PENDIENTES.md`

## [2026-07-24] — Actualización PENDIENTES.md con items de auditoría V1
- Tipo: docs
- Qué: Sincronizado `PENDIENTES.md` con los hallazgos de la auditoría interna V1 del 24/07/2026 (`AUDITORIA_front_24_07_2026 / V1.md`). Se preservaron los items completados (✅ DONE) y se agregaron 21 nuevos items organizados por prioridad: 8 🔴 ALTA (tests faltantes), 8 🟡 MEDIA (refactors), 6 🟢 BAJA (mejoras/monitoreo). Se mantuvieron los items anteriores no cubiertos por V1, pruebas y auditorías pendientes.
- Archivos: `PENDIENTES.md`

## [2026-07-23] — Reemplazo pantalla verificación sesión por notificación toast + splash minimal
- Tipo: refactor (UX)
- Qué: La pantalla de "Verificando sesión…" (spinner + texto) se reemplazó por:
  - **`SessionValidationScreen`**: splash minimal con logo "IVOO" + "Cargando…" (sin spinner)
  - **Toast notification**: "Verificando sesión almacenada…" aparece como notificación en esquinita
- Por qué: El usuario solicitó que la verificación de sesión sea tipo notificación en vez de pantalla bloqueante completa.
- Nota: Se mantiene el bloqueo temprano (early return) porque los hooks de datos (`useProjects`, `useContractors`, `useCatalog`) se ejecutan incondicionalmente en `AppRoutes` y dispararían llamadas API con un token potencialmente inválido si no se bloquea, causando toasts de error antes de redirigir al login.
- Archivos: `src/App.tsx`

## [2026-07-23] — Fix skeleton infinito tras login — 3 hooks
- Tipo: fix
- Qué: Corregido bug donde los skeleton loaders se quedaban forever tras iniciar sesión (sin recargar manual la web).
- Causa raíz: En el refactor a refs con `[]` deps, `loadProjects`/`internalLoad`/`loadConfigs` se volvieron estables. El mount-effect (`useEffect(() => fn(), [fn])`) solo corre una vez. En el mount inicial con `authToken = ""`, las fn retornan early. Al hacer login, `authToken` cambia pero las fn no se re-ejecutan porque son estables — el effect no se dispara. El polling tampoco baja `isLoading` (usa `isPoll=true` que saltea `setIsLoading(false)`).
- Fix: En el `useEffect` que monitorea `prevToken → authToken`, ahora también se llama a la función de fetch cuando el token transiciona de falsy a truthy, y se movió dicho effect DESPUÉS de la definición de la fn para evitar TDZ (Temporal Dead Zone) en el arreglo de dependencias.
- Archivos: `src/hooks/useProjectsData.ts`, `src/hooks/usePolledFetch.ts`, `src/hooks/useAIConfig.ts`

## [2026-07-23] — Reubicación componentes AIConfigPanel — views/ → components/
- Tipo: refactor
- Qué: Se movieron 3 componentes de `views/AIConfigPanel/` a sus ubicaciones correctas según la convención del proyecto:
  - `AIConfigFormModal.tsx` → `components/Modals/AIConfigFormModal.tsx`
  - `MiniBarChart.tsx` → `components/UI/MiniBarChart.tsx`
  - `KpiCard.tsx` → `components/UI/KpiCard.tsx`
- Se actualizaron imports en `views/AIConfigPanel/index.tsx` y `views/AIConfigPanel/UsageDashboard.tsx`.
- `KpiCard` inline de `PresidenciaDashboard.tsx` se mantiene como local (interfaz estructuralmente incompatible con la versión compartida).
- Verificación: `tsc --noEmit` sin errores de source.
- Archivos: movidos 3, editados 2.

## [2026-07-23] — Auditoría frontend — Fix race conditions, type imports, getErrorMessage, accesibilidad
- Tipo: refactor + fix + security
- Qué:
  - **Fix race condition en `usePolledFetch`**: `authTokenRef` + `showToastRef` — callbacks con dependencias vacías leen token/showToast desde refs. Elimina recreación del callback en cada cambio de token y previene usar token stale en fetch en curso.
  - **Fix race condition en `useProjectsData`**: mismo patrón ref-based que `usePolledFetch`.
  - **Fix race condition en `useProjectsWorkflows`**: mismo patrón ref-based. Todos los handlers ahora leen `authToken`, `showToast`, `syncProject`, `refreshAuditLogs` y `getProject` desde refs en lugar de closure. Dependencias vacías en todos los `useCallback`.
  - **Type imports separados (11 archivos)**: Separados `import type` de `import` en PresidenciaDashboard, CierreObraPanel, InfraestructuraMantenimientoPanel, InteractiveOrganigrama, AnalistasPanel, ProveedoresRegistrados, FinanzasPanel, ProcuraPanel, data.ts, aiEvaluationService, EvaluacionInteligenteModal/index.
  - **`getErrorMessage()` helper en `logger.ts`**: Nueva función que extrae mensaje legible desde `unknown` (Error, string, objeto). Reemplazados 16 `(err as Error).message` en: useAIConfig, useProveedores, useUsuarios, MaterialConfigPanel, AIConfigPanel/index, ProveedoresConfigPanel, UsuariosPanel.
  - **`role="menuitem"` en logout**: SidebarNav.tsx — botón de cerrar sesión ahora con rol semántico.
  - **`aria-label` en filtros**: PresidenciaDashboard — 5 inputs/selects de búsqueda y filtros ahora tienen `aria-label`.
- Verificación: `tsc --noEmit` sin errores de source (solo error preexistente en test de Modal).
- Archivos: `src/hooks/usePolledFetch.ts`, `src/hooks/useProjectsData.ts`, `src/hooks/useProjectsWorkflows.ts`, `src/services/logger.ts`, `src/components/UI/SidebarNav.tsx`, `src/views/PresidenciaDashboard.tsx`, `src/views/CierreObraPanel.tsx`, `src/views/InfraestructuraMantenimientoPanel.tsx`, `src/components/InteractiveOrganigrama.tsx`, `src/views/AnalistasPanel.tsx`, `src/views/ProveedoresRegistrados.tsx`, `src/views/FinanzasPanel.tsx`, `src/views/ProcuraPanel.tsx`, `src/data.ts`, `src/services/aiEvaluationService.ts`, `src/components/Modals/EvaluacionInteligenteModal/index.tsx`, `src/hooks/useAIConfig.ts`, `src/hooks/useProveedores.ts`, `src/hooks/useUsuarios.ts`, `src/views/MaterialConfigPanel.tsx`, `src/views/AIConfigPanel/index.tsx`, `src/views/ProveedoresConfigPanel.tsx`, `src/views/UsuariosPanel.tsx`

## [2026-07-23] — Sprint 4.3: Push notifications — Expo Notifications + backend Laravel
- Tipo: feature
- Qué: Implementado sistema de push notifications completo:
  - **Mobile**: `expo-notifications` + `expo-device` instalados
  - **`useNotifications` hook**: solicita permisos, obtiene Expo push token, lo registra en `POST /push-tokens` del backend (con almacenamiento local para evitar re-registros), configura handler de foreground, escucha taps en frío y en caliente
  - **`NotificationHandler` component**: wrapper que interpreta `{ screen, projectId }` del payload de la notificación y navega: si `screen=proveedores` cambia a esa pestaña; si `projectId` abre el modal del proyecto
  - **Backend Laravel** (`infraestructura-back`): migración `push_tokens` (`2026_07_23_000001_create_push_tokens_table`), modelo `PushToken`, controller `PushTokenController` (store/destroy), servicio `ExpoPushService` (envía a Expo API con chunking de 100), canal `ExpoChannel`, notificación `ProjectStatusChanged` (se dispara desde `ProjectObserver::updated` cuando `status` cambia), rutas `POST/DELETE /api/push-tokens` en grupo `auth:sanctum`, registro de canal + observer en `AppServiceProvider`
- Por qué / causa raíz: los usuarios mobile no recibían alertas de cambios de estado en proyectos.
- Archivos: `mobile/package.json`, `mobile/hooks/useNotifications.ts`, `mobile/components/NotificationHandler.tsx`, `mobile/App.tsx`, y en `infraestructura-back`: migración, `app/Models/PushToken.php`, `app/Services/ExpoPushService.php`, `app/Notifications/Channels/ExpoChannel.php`, `app/Notifications/ProjectStatusChanged.php`, `app/Http/Controllers/Api/PushTokenController.php`, `app/Observers/ProjectObserver.php`, `routes/api.php`, `app/Providers/AppServiceProvider.php`

## [2026-07-23] — Sprint 4.2: Offline queue — persistencia y reprocesamiento de mutaciones sin conexión
- Tipo: feature
- Qué: Implementado sistema offline queue para la app mobile:
  - Agregado `@react-native-async-storage/async-storage` para persistencia
  - Creado `useOfflineQueue` hook: cola FIFO en AsyncStorage con reprocesamiento automático cada 30s + al reabrir la app
  - `execMutation` captura errores de red (TypeError) y encola la acción con su path, method, body y query keys a invalidar
  - Errores de API (4xx/5xx) se descartan silenciosamente (mismo comportamiento que `syncProjectAction` original)
  - Creado `OfflineBanner`: barra naranja con conteo de pendientes + botón "Reintentar"; cuando procesa, cambia a amarillo con "Sincronizando…"
- Por qué / causa raíz: las operaciones de escritura fallaban silenciosamente sin conexión. Ahora se encolan y reprocesan automáticamente.
- Archivos: `mobile/package.json`, `mobile/hooks/useOfflineQueue.ts`, `mobile/components/OfflineBanner.tsx`, `mobile/App.tsx`

## [2026-07-23] — Sprint 4.1: React Navigation + TanStack Query en mobile
- Tipo: feature
- Qué: Migrada la capa de datos y navegación de la app mobile:
  - Agregado `@react-navigation/native`, `@react-navigation/native-stack`, `@tanstack/react-query`, `react-native-screens`
  - Creados hooks `useProjects`, `useContractors`, `useMaterials`, `useAuditLogs` con `useQuery` (staleTime: 30-60s, enabled por token)
  - Eliminado `loadData()` manual + 4 `useState` de datos en App.tsx — reemplazado por TanStack Query
  - Eliminado `syncProjectAction()` — reemplazado por `execMutation()` + `queryClient.invalidateQueries`
  - App envuelta en `QueryClientProvider` + `NavigationContainer`/`Stack.Navigator`
  - Pull-to-refresh usa `queryClient.invalidateQueries` en lugar de recargar manual
  - Screens componentes siguen recibiendo datos por props (sin cambios en su interfaz)
- Por qué / causa raíz: React Navigation prepara el terreno para deep linking, transiciones y navegación real entre pantallas. TanStack Query elimina estado manual, agrega caché, deduplicación y refresco automático.
- Archivos: `mobile/package.json`, `mobile/App.tsx`, `mobile/hooks/useProjects.ts`, `mobile/hooks/useContractors.ts`, `mobile/hooks/useMaterials.ts`, `mobile/hooks/useAuditLogs.ts`

## [2026-07-23] — Sprint 3.2: Contraste badges — text-slate-400 → text-slate-600 mínimo
- Tipo: accessibility
- Qué: Corregido contraste en badges con `text-slate-400` sobre fondos claros (ratio ~2.8:1, WCAG AA requiere ≥4.5:1):
  - `IdleView.tsx`: Rating badge sin valor — `bg-slate-50 text-slate-400` → `bg-slate-100 text-slate-600`
  - `InteractiveOrganigrama.tsx`: Etiquetas Infraestructura/Mantenimiento — `text-slate-400 bg-white` → `text-slate-600 bg-white`
  - `KpiCard.tsx`: Icon container — `bg-slate-50 text-slate-400` → `bg-slate-100 text-slate-600`
- Por qué / causa raíz: WCAG 1.4.3 — contraste insuficiente en badges. Auditoría interna Sprint 3 — punto 13 del plan de acción.
- Archivos: `src/components/Modals/EvaluacionInteligenteModal/IdleView.tsx`, `src/components/InteractiveOrganigrama.tsx`, `src/views/AIConfigPanel/KpiCard.tsx`

## [2026-07-23] — Sprint 3.4: SelectModal + SidebarNav accesibilidad
- Tipo: accessibility
- Qué:
  - **SelectModal**: Eliminado `<span role="button">` anidado dentro del `<button>` trigger (HTML inválido). El botón de deselección ahora es un `<button>` hermano del trigger.
  - **SidebarNav**: Agregado `aria-label="Menú principal"` al `<nav>`. Dropdown de Configuración ahora tiene `aria-expanded` en el toggle, `role="menu"` + `aria-orientation="vertical"` en el contenedor, y `role="menuitem"` en cada NavLink hijo.
- Por qué / causa raíz: WCAG 2.4.3 (focus order) + WCAG 2.1.1 (nested interactive). Auditoría interna Sprint 3 — puntos 15 del plan de acción.
- Archivos: `src/components/UI/SelectModal.tsx`, `src/components/UI/SidebarNav.tsx`

## [2026-07-23] — Sprint 3.3: aria-describedby en validaciones inline
- Tipo: accessibility
- Qué: Agregados `id`, `aria-describedby` y `aria-invalid` a inputs con validación inline:
  - `MaterialesProveedores.tsx`: 3 campos (nombre, especialidad, correo) ahora vinculan el mensaje de error mediante `aria-describedby` y marcan `aria-invalid` cuando corresponden.
  - `UsuariosPanel.tsx`: Confirmación de contraseña ahora tiene `id`, `aria-describedby` y `aria-invalid`.
  - `AlertBanner.tsx`: Agregado `role="alert"` para tipo error/warning, `role="status"` para success/info.
- Por qué / causa raíz: WCAG 3.3.2 — inputs con error solo visual (color rojo), sin vínculo accesible entre input y mensaje de error. Auditoría interna Sprint 3 — punto 14 del plan de acción.
- Archivos: `src/views/MaterialesProveedores.tsx`, `src/views/UsuariosPanel.tsx`, `src/components/UI/AlertBanner.tsx`

## [2026-07-23] — Sprint 3.1: Auditoría heading hierarchy — normalizada en todas las vistas
- Tipo: accessibility
- Qué: Normalizada la jerarquía de encabezados (WCAG 1.3.1) en todas las vistas:
  - `SectionHeader.tsx`: `<h3>` → `<h2>` (corrige "h3 sin h2 padre" en 5 vistas: Finanzas, Procura, CierreObra, Analistas, Infraestructura/Mantenimiento)
  - Títulos de vista `<h2>` → `<h1>` visible: UsuariosPanel, ProveedoresRegistrados, MaterialConfigPanel, ProveedoresConfigPanel, AIConfigTable, UsageDashboard, ErrorBoundary
  - `PresidenciaDashboard`: Agregado `<h1 class="sr-only">`, KPI values `<h3>` → `<span>`, secciones `<h3>` → `<h2>`
  - Agregados `<h1 class="sr-only">` como título de página en CierreObraPanel, AnalistasPanel, InfraestructuraMantenimientoPanel, FinanzasPanel, ProcuraPanel
- Por qué / causa raíz: WCAG 1.3.1 — heading hierarchy inconsistente (algunas vistas usaban h3 sin h2 padre). Auditoría interna Sprint 3 — punto 12 del plan de acción.
- Archivos: `src/components/UI/SectionHeader.tsx`, `src/views/UsuariosPanel.tsx`, `src/views/ProveedoresRegistrados.tsx`, `src/views/MaterialConfigPanel.tsx`, `src/views/ProveedoresConfigPanel.tsx`, `src/views/AIConfigPanel/AIConfigTable.tsx`, `src/views/AIConfigPanel/UsageDashboard.tsx`, `src/views/PresidenciaDashboard.tsx`, `src/views/FinanzasPanel.tsx`, `src/views/ProcuraPanel.tsx`, `src/views/CierreObraPanel.tsx`, `src/views/AnalistasPanel.tsx`, `src/views/InfraestructuraMantenimientoPanel.tsx`, `src/components/ErrorBoundary.tsx`

## [2026-07-23] — Mobile consume @ivoo/shared — Fase 2 del shared package
- Tipo: refactor
- Qué: `mobile/types.ts` ahora re-exporta tipos desde `@ivoo/shared` (ProjectStatus, MaterialItem, Proposal, Project, Contractor, AuditLog) mediante relative path `../packages/shared/src/types`. Se mantienen los tipos específicos de mobile (Screen, screens, statusLabels, statusColors). `mobile/api.ts` ahora delega en `apiFetch` de `@ivoo/shared`, inicializando `setApiBaseUrl` desde `config.ts`. `requestJson` mantiene la misma firma `(token, path, options?)` para compatibilidad con App.tsx y componentes.
- Por qué / causa raíz: Cierre del punto 10 del plan de acción — eliminar duplicación de tipos y lógica HTTP entre web y mobile.
- Archivos: `mobile/types.ts`, `mobile/api.ts`

## [2026-07-23] — Shared Package @ivoo/shared — types, utils, api platform-agnostic
- Tipo: refactor
- Qué: Extraído el código compartido entre web y mobile a un paquete `packages/shared` (`@ivoo/shared`) en un monorepo con npm workspaces + TypeScript project references. Contiene:
  - `src/types.ts` — Tipos unificados (ProjectStatus como const+type, MaterialItem, Proposal, Project, Contractor, AuditLog, SupplierMaterialProposal)
  - `src/utils.ts` — delay, formatCurrency, formatNumber, formatFileSize, proposalTotal, STATUS_LABELS, getStatusLabel
  - `src/api.ts` — apiFetch, apiDownload, setApiBaseUrl, setTokenRefreshHandler (agnóstico, sin dependencias de plataforma)
  - `src/index.ts` — barrel export
- Web (`src/`): `types.ts`, `utils.ts`, `services/api.ts` ahora son re-exports desde `@ivoo/shared` + extensiones web (ROLE_COLORS, STATUS_COLORS, init de API_BASE_URL desde VITE_API_URL)
- Configuración del monorepo: `package.json` con workspaces, `tsconfig.json` con references + paths alias, `vite.config.ts` con resolve alias
- Todos los tipos existentes preservados (ProjectStatus es dual type+value para compatibilidad con `ProjectStatus.CREADO`)
- Fix: api.ts re-export usa import + export separados (export from no crea binding local)
- 206 tests pasando, build de Vite exitoso
- Por qué / causa raíz: Duplicación de tipos, utilidades y lógica de API entre web (`src/`) y mobile (`mobile/`). Cada cambio requería modificar ambos lados. Un shared package centraliza el código platform-agnostic y elimina la divergencia.
- Archivos: `packages/shared/package.json` [NUEVO], `packages/shared/tsconfig.json` [NUEVO], `packages/shared/src/index.ts` [NUEVO], `packages/shared/src/types.ts` [NUEVO], `packages/shared/src/utils.ts` [NUEVO], `packages/shared/src/api.ts` [NUEVO], `package.json`, `tsconfig.json`, `vite.config.ts`, `src/types.ts`, `src/utils.ts`, `src/services/api.ts`, `src/components/Modals/EvaluacionInteligenteModal/index.tsx`

## [2026-07-23] — Virtualización en Table — @tanstack/react-virtual, threshold >100
- Tipo: performance
- Qué: Agregada virtualización de filas en `Table.tsx` vía `@tanstack/react-virtual`. Nueva prop `virtualizeThreshold` (default `Infinity`, disabled). Cuando `data.length > virtualizeThreshold` Y `maxHeight` está configurado, la tabla cambia a renderizado virtualizado: solo las filas visibles en el viewport se renderizan (~10 de overscan), el scroll reemplaza la paginación, y el tbody usa `display: block` con posicionamiento absoluto para mantener el rendimiento con datasets grandes. El comportamiento legacy (paginación, renderizado completo) no se modifica. Los 25 tests existentes de Table siguen pasando sin cambios.
- Por qué / causa raíz: Auditoría interna (AUDITORIA_INTERNA_FRONT_2026-07-23) detectó que tablas grandes (ej. libro diario, proveedores) renderizan todos los nodos DOM aunque no estén visibles. Sprint 2 punto 9 del plan de acción.
- Archivos: `src/components/UI/Table.tsx`, `package.json`

## [2026-07-23] — Extraer AuthenticatedLayout — sacar 200+ líneas de App.tsx
- Tipo: refactor
- Qué: Extraído el shell visual del layout autenticado a `src/components/Layout/AuthenticatedLayout.tsx` (~158 líneas). El layout ahora es un componente con props tipadas que recibe las rutas como `children`. AppRoutes pasó de 440 → 329 líneas. El layout maneja internamente: `isMobileSidebarOpen`, `prefersReducedMotion`, `pageVariants/Transition`, y el Suspense + AnimatePresence con transiciones de página. También se lazy-loadeó `InspectProjectModal` dentro del layout (solo se descarga al abrir el modal).
- Por qué / causa raíz: Auditoría interna (AUDITORIA_INTERNA_FRONT_2026-07-23) señaló App.tsx monolítico (404 líneas). Sprint 2 punto 8 del plan de acción.
- Archivos: `src/App.tsx`, `src/components/Layout/AuthenticatedLayout.tsx` [NUEVO]

## [2026-07-23] — Code-splitting por ruta — React.lazy + Suspense en App.tsx
- Tipo: performance
- Qué: Reemplazados los 14 imports estáticos de vistas en `App.tsx` por `React.lazy(() => import(...))`. Agregados 3 boundaries `<Suspense>`: (1) rutas públicas, (2) login (unauthenticated), (3) layout autenticado (contenido dentro del `<main>`, sidebar visible). Cada vista ahora es un chunk independiente que se carga bajo demanda. Fallbacks visuales consistentes con el diseño actual (spinner centrado "Cargando módulo…").
- Por qué / causa raíz: Auditoría interna (AUDITORIA_INTERNA_FRONT_2026-07-23) detectó que todo el bundle (~200KB gz) cargaba al inicio. Sin code-splitting por ruta. Sprint 2 punto 7 del plan de acción.
- Archivos: `src/App.tsx`

## [2026-07-23] — Vitest coverage — @vitest/coverage-v8, threshold 70% lines
- Tipo: testing
- Qué: Configurado coverage de Vitest con `@vitest/coverage-v8`. Umbrales: lines/functions/branches/statements ≥ 70%. Excluidos: `node_modules/`, `dist/`, `src/test/`, `src/main.tsx`, `src/vite-env.d.ts`, `*.d.ts`, `*.config.*`, `**/index.ts`. Script `npm run test:coverage` añadido.
- Por qué / causa raíz: Auditoría interna (AUDITORIA_INTERNA_FRONT_2026-07-23) requería coverage ≥ 70% en Sprint 1. Cobertura actual: Lines 90.64%, Branches 75.64%, Functions 86.11%, Statements 87.89% — ya supera umbrales.
- Archivos: `vite.config.ts`, `package.json`

## [2026-07-23] — Referrer-Policy + Permissions-Policy headers (vite dev + backend)
- Tipo: security
- Qué: Agregados headers `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=()` al dev server de Vite (`vite.config.ts`) y al middleware backend `AddCspHeaders.php` (repo `infraestructura-back`).
- Por qué / causa raíz: Auditoría interna (AUDITORIA_INTERNA_FRONT_2026-07-23) detectó ausencia de ambos headers. `Referrer-Policy` controla información de referrer en navegación cross-origin. `Permissions-Policy` deshabilita APIs sensibles (cámara, micrófono, geolocalización) que la app no usa.
- Archivos: `vite.config.ts`, `infraestructura-back/app/Http/Middleware/AddCspHeaders.php`

## [2026-07-23] — CSP producción sin 'unsafe-inline' — vite.config.ts condicional por mode
- Tipo: security
- Qué: CSP en `vite.config.ts` ahora es condicional por `mode` (development vs production). En desarrollo: `script-src 'self' 'unsafe-inline'` (necesario para HMR de Vite). En producción: `script-src 'self'` sin `'unsafe-inline'`, cumpliendo CSP estricto. El header CSP se sirve desde el dev server en dev y desde el middleware backend (`AddCspHeaders.php`) en producción.
- Por qué / causa raíz: Auditoría interna (AUDITORIA_INTERNA_FRONT_2026-07-23) detectó CSP en desarrollo con `'unsafe-inline'` hardcodeado. En producción el header lo sirve el backend, pero el dev server servía CSP inseguro. Fix: condicional por `mode` en `defineConfig(({mode}) => ...)`.
- Archivos: `vite.config.ts`

## [2026-07-23] — Tests unitarios: 159 tests, todos pasando, cobertura ≥70%
- Tipo: testing
- Qué: Completados tests unitarios del Sprint 1 de auditoría. 159 tests en 9 archivos (usePolledFetch, usePolling, useAuth, LoginScreen, Table, Modal, ConfirmDialog, SelectModal, FileDropZone). Todos pasando con cobertura: Statements 88.46%, Branches 84.51%, Functions 85.03%, Lines 91.85%. Instalado `@vitest/coverage-v8` con umbrales ≥70%. Agregado `data-testid` a componentes clave (modal-backdrop, modal-icon, skeleton-row, file-input, spinner, alert-triangle, check-circle).
- Por qué / causa raíz: Auditoría interna (AUDITORIA_INTERNA_FRONT_2026-07-23) Sprint 1 requería tests unitarios con cobertura ≥70%. Se corrigieron múltiples issues de mocking (motion/react, createPortal), compatibilidad con React 19 (act desde "react"), focus trap en jsdom (solo wrap-around), y timing en hooks.
- Archivos: `vite.config.ts`, `package.json`, `src/components/UI/Modal.tsx`, `src/components/UI/Table.tsx`, `src/components/UI/FileDropZone.tsx`, `src/components/UI/ConfirmDialog.tsx`, `src/components/UI/SelectModal.tsx`, más 9 archivos de test

## [2026-07-23] — Tests críticos: api.ts (27 tests) + routing/permisos (17 tests)
- Tipo: testing
- Qué: Agregados 47 tests unitarios sobre:
  - `api.ts` (27 tests): apiFetch con todos los status codes (200, 204, 401, 403, 404, 422, 429, 503, 500, otros), extracción de errores Laravel, attemptLog en 503, refresh token vía X-Refresh-Token, headers Authorization/Content-Type, mezcla de headers custom, respuestas vacías. apiDownload con éxito, error, body message.
  - `useRouting.ts` (11 tests): canAccess por rol (SUPERADMIN, PRESIDENCIA, undefined, rol inexistente con fallback), firstAllowedRoute, activeRole. Verificación estática de roleAccess (consistencia entre roles, rutas con /).
  - `routes.tsx` (9 tests): isPublicRoute para rutas públicas y privadas, ProtectedRoute render/redirect.
- Por qué / causa raíz: Servicio central api.ts y lógica de permisos son puntos críticos sin tests. Un error en api.ts afecta toda la app; un error en permisos puede exponer rutas. Estos tests aseguran regression en cada cambio.
- Archivos: `src/__tests__/services/api.test.ts` [NUEVO], `src/__tests__/hooks/useRouting.test.ts` [NUEVO], `src/__tests__/routes.test.tsx` [NUEVO]

## [2026-07-23] — Tests movidos a src/__tests__/ con estructura de directorios espejo
- Tipo: refactor
- Qué: Los 9 archivos de test fueron movidos de sus ubicaciones junto al código fuente a un directorio centralizado `src/__tests__/` que refleja la estructura de `src/`. Los imports relativos (`./Component`) fueron reemplazados por imports absolutos vía alias `@/`. Se actualizó `coverage.exclude` en `vite.config.ts` para excluir `src/__tests__/`.
- Por qué / causa raíz: Orden y claridad — un solo directorio de tests facilita la navegación y evita contaminar el árbol de código fuente con archivos de testing.
- Archivos: `vite.config.ts`, 9 archivos de test movidos de `src/hooks/`, `src/views/`, `src/components/UI/` a `src/__tests__/{hooks,views,components/UI}/`

## [2026-07-23] — Auditoría y refactor del sistema de IA: limpieza, tipado, extracción de sub-vistas
- Tipo: refactor + fix
- Qué: Auditoría integral del código frontend relacionado con IA. Se detectaron y corrigieron 8 puntos:
  1. **Payload de evaluación AI no incluía documentos del proyecto** — revertido por instrucción del usuario (no enviar docs a la IA). El código queda limpio sin referencias a documentos en el payload.
  2. **Delay artificial de 800ms en EvaluacionInteligenteModal** — Eliminado `await delay(800)` que bloqueaba la UX antes de arrancar la evaluación.
  3. **`err: any` en 2 catch blocks** — Reemplazado por `err: unknown` con cast tipado a `Error & { attemptLog?: string[] }`.
  4. **EvaluacionInteligenteModal.tsx (679 líneas)** — Extraído a directorio con 6 archivos separados: `index.tsx` (orquestador), `IdleView.tsx`, `LoadingView.tsx`, `ResultView.tsx`, `ErrorView.tsx`, `constants.ts`, `types.ts`. El archivo original queda como re-export para backward compatibility.
  5. **apiDownload con error handling mínimo** — Mejorado para parsear `body.message ?? body.error` del servidor, mismo patrón que `apiFetch`.
  6. **Enmascaramiento de API key en AIConfigTable** — Corregido bug: keys de ≤8 caracteres se mostraban sin enmascarar (ahora se enmascaran completamente).
  7. **useAIConfig: recreación de callbacks en cada cambio de authToken** — Cambiado Patrón de `useCallback([authToken])` a ref-based (`authTokenRef.current`) para evitar recreación innecesaria de los 7 métodos en cada render.
  8. **SyncBanner detectaba error por `message.includes("Error")`** — Reemplazado por prop booleana `isError`, evitando falsos positivos con mensajes en español que contengan la palabra "Error".
- Por qué / causa raíz: El sistema de IA frontend tenía código espagueti en el modal de evaluación (679 líneas), tipos inseguros (`any`), artefacto UX (delay 800ms), y patrones inconsistentes de manejo de errores y memoización.
- Archivos:
  - `src/components/Modals/EvaluacionInteligenteModal.tsx` — re-export
  - `src/components/Modals/EvaluacionInteligenteModal/index.tsx` — [NUEVO] orquestador
  - `src/components/Modals/EvaluacionInteligenteModal/IdleView.tsx` — [NUEVO]
  - `src/components/Modals/EvaluacionInteligenteModal/LoadingView.tsx` — [NUEVO]
  - `src/components/Modals/EvaluacionInteligenteModal/ResultView.tsx` — [NUEVO]
  - `src/components/Modals/EvaluacionInteligenteModal/ErrorView.tsx` — [NUEVO]
  - `src/components/Modals/EvaluacionInteligenteModal/constants.ts` — [NUEVO]
  - `src/components/Modals/EvaluacionInteligenteModal/types.ts` — [NUEVO]
  - `src/hooks/useAIConfig.ts` — refactor (ref-based token, syncIsError)
  - `src/services/api.ts` — apiDownload mejorado
  - `src/views/AIConfigPanel/AIConfigTable.tsx` — fix enmascaramiento
  - `src/views/AIConfigPanel/SyncBanner.tsx` — prop isError
  - `src/views/AIConfigPanel/index.tsx` — syncIsError integrado

## [2026-07-23] — Fix: Token expiration no funcionaba al volver de PC apagado/suspensión
- Tipo: fix + security
- Qué: Se corrigieron 3 problemas concurrentes que impedían la expiración correcta de sesión:
  1. **Backend — AuthController.php**: `createToken()` se llamaba sin `$expiresAt`, dejando `expires_at=NULL` en DB. Sanctum igual valida por `created_at + config.expiration`, pero el middleware `RefreshSanctumToken` usaba `$token->expires_at` para la gracia de 60s. Ahora se pasa `now()->addMinutes(config('sanctum.expiration'))` explícitamente.
  2. **Frontend — useAuth.ts**: No había validación de sesión al montar la app. Si el usuario tenía un token en localStorage, se daba por autenticado sin consultar al backend, incluso si el token había expirado (>24h) o sido revocado. Ahora al montar con token guardado se llama `GET /api/user`; si falla (401), se limpia la sesión. Mientras valida, `isValidatingSession=true` impide renderizar el layout autenticado.
  3. **Frontend — useAuth.ts**: El inactivity timeout de 30min usaba `setTimeout`, que el navegador congela cuando el PC duerme o el tab pasa a segundo plano. Al volver, el timer reanudaba desde donde se quedó, no desde el tiempo real transcurrido. Reemplazado por:
     - `setInterval` cada 15s que compara `Date.now() - lastActivityRef.current >= SESSION_TIMEOUT_MS`
     - Listener `visibilitychange` para chequear inmediatamente al volver al tab
  4. **Frontend — App.tsx**: Agregada pantalla de carga ("Verificando sesión…") mientras `isValidatingSession` está activo, evitando el flash del layout autenticado con token expirado.
- Por qué / causa raíz: Tres causas concurrentes: (a) token sin `expires_at` en DB, (b) frontend confiaba ciegamente en localStorage sin validar contra backend, (c) `setTimeout` se congela durante suspensión del sistema/tab.
- Archivos:
  - `infraestructura-back/app/Http/Controllers/Api/AuthController.php`
  - `src/hooks/useAuth.ts`
  - `src/App.tsx`

## [2026-07-23] — Fix: 5 componentes violaban Rules of Hooks, nested button, autocomplete
- Tipo: fix
- Qué: Se corrigieron 3 categorías de errores de consola:
  1. **Rules of Hooks violations** (causaban `"Expected static flag was missing"` y `"change in the order of Hooks"`):
     - `CierreObraPanel`, `InfraestructuraMantenimientoPanel`, `FinanzasPanel`, `AnalistasPanel`, `PresidenciaDashboard`: tenían `if (isLoading) return <Skeleton />` ANTES de hooks. Movido después de todos los hooks. Esto también causaba los `[Violation] 'message' handler took Nms` del scheduler de React 19 (por re-renders innecesarios).
  2. **Nested `<button>`** en `SelectModal.tsx`: el botón de deselección estaba dentro del botón trigger → HTML inválido. Cambiado a `<span role="button" tabIndex={0}>`.
  3. **`autocomplete` missing** en inputs de password de `UsuariosPanel.tsx`: agregado `autoComplete="new-password"`.
- Archivos: `CierreObraPanel.tsx`, `InfraestructuraMantenimientoPanel.tsx`, `FinanzasPanel.tsx`, `AnalistasPanel.tsx`, `PresidenciaDashboard.tsx`, `SelectModal.tsx`, `UsuariosPanel.tsx`

## [2026-07-23] — Fix: CSP bloqueaba Google Fonts, report-uri 404, favicon missing
- Tipo: fix
- Qué: Tres errores de configuración:
  1. **CSP bloqueaba Google Fonts** — `style-src` no incluía `https://fonts.googleapis.com` ni `font-src` incluía `https://fonts.gstatic.com`. Las reglas estaban tanto en HTTP header (vite.config.ts) como en `<meta http-equiv>` (index.html). Se unificó en el header del dev server y se agregaron los orígenes faltantes.
  2. **report-uri /csp-violation sin handler** — El CSP incluía `report-uri /csp-violation` pero no existía endpoint → 404. Se eliminó la directiva.
  3. **favicon.ico 404** — No existía archivo ni referencias. Se creó `public/favicon.svg` y se agregó `<link>` en index.html.
- Archivos: `vite.config.ts`, `index.html`, `public/favicon.svg`

## [2026-07-23] — Fix: Modal no renderizaba (focus trap causaba re-ejecución del effect en cada render)
- Tipo: fix
- Qué: `useEffect` en Modal.tsx dependía de `handleKeyDown` (useCallback con [onClose, closeDisabled]). Como `onClose` suele ser una arrow inline, cambiaba referencia en cada render → el effect limpiaba y se re-ejecutaba en cada render → la limpieza hacía `previousFocusRef.current?.focus()` robando el foco del modal, y `AnimatePresence` interrumpía la animación de entrada.
- Cómo se corrigió: `handleKeyDown` ahora tiene deps vacías `[]` y lee `onClose` y `closeDisabled` desde refs (`onCloseRef` / `closeDisabledRef`). El `useEffect` solo depende de `[isOpen]`. Además se extrajo el selector `FOCUSABLE` a una constante con `:not(:disabled)` para evitar enfocar elementos deshabilitados.
- Archivos: `src/components/UI/Modal.tsx`

## [2026-07-23] — Auditoría UI/UX: Corrección de 22 puntos críticos, altos y medios
- Tipo: feature + refactor + security + accessibility
- Qué:
  - **Nuevos componentes:**
    - `ConfirmDialog` — Modal de confirmación reutilizable para acciones destructivas con variantes danger/warning/info y loading state.
    - `OfflineBanner` — Banner global con detección de conectividad vía `useOnlineStatus` hook.
    - `useOnlineStatus` — Hook que detecta `navigator.onLine` con eventos online/offline.
    - `useSafeMotion` — Hook centralizado que respeta `prefers-reduced-motion` en todas las animaciones.
    - `useDebounce` — Hook genérico de debounce (300ms default) para búsquedas.
  - **Fix Modal:** Focus trap con Tab/Shift+Tab + cierre con Escape + `role="dialog"` + `aria-modal="true"` + auto-focus al abrir + retorno de foco al cerrar.
  - **Fix Toast:** `role="status"` + `aria-live="polite"` para toasts no-críticos (success/info/warning), `role="alert"` solo para error. Límite de stacking a 5 toasts.
  - **Fix Table:** `aria-sort` en columnas ordenables. Eliminado `contentVisibility: "auto"` que ocultaba contenido de lectores de pantalla.
  - **Fix index.css:** `@media (prefers-reduced-motion: reduce)` global para respetar preferencia del sistema.
  - **Confirmación en acciones críticas (7 vistas):**
    - `FinanzasPanel` — ConfirmDialog en liberación de anticipos y pagos finales + estado `isPaying` con spinner.
    - `ProcuraPanel` — ConfirmDialog en adjudicación de contratista + estado `isSelecting`.
    - `AnalistasPanel` — ConfirmDialog en envío de cuadro comparativo.
    - `CierreObraPanel` — ConfirmDialog en certificación de calidad + `isSubmitting` en revisión.
    - `InfraestructuraMantenimientoPanel` — `isSubmitting` en submit del formulario con spinner.
    - `MaterialConfigPanel` — ConfirmDialog en toggle de estado (activar/desactivar).
    - `ProveedoresConfigPanel` — ConfirmDialog en toggle de estado.
    - `AIConfigPanel` — ConfirmDialog en eliminación de configuración.
  - **Accesibilidad:**
    - `PresidenciaDashboard` — `aria-label` + `role="img"` en SVG donut chart.
    - `ProveedoresRegistrados` — `aria-expanded` + `aria-controls` en acordeones de propuestas.
    - `UsuariosPanel` — Indicador de usuario inactivo con `border-l-2` + `aria-label` (no solo opacidad).
    - `AIConfigTable` — API key enmascarada en UI (solo últimos 4 caracteres visibles).
  - **UX mejoras:**
    - `FinanzasPanel` — Buscador en libro diario (por obra, proveedor, ID, voucher) con debounce.
    - `AIConfigPanel/UsageDashboard` — Costos con 2 decimales (notación `< $0.01` para valores mínimos).
    - `PropuestaMaterialesPublica` — Campo unitPrice default cambia de 0 a vacío.
    - `MaterialesProveedores` — Eliminado `rating: 4.0` hardcodeado del registro público.
    - Textareas clave con `maxLength` + contador de caracteres (descripción obra, notas cierre, motivo rechazo).
  - **App.tsx:** Integración de `OfflineBanner` global en layout autenticado.
- Por qué / causa raíz: Auditoría de UI/UX identificó 26 puntos de mejora. Sin confirmación en acciones destructivas, sin loading states en submits, sin manejo de foco en modales, sin detección offline, sin respeto a prefers-reduced-motion, inconsistencias de accesibilidad y validación.
- Archivos: 22 archivos modificados, 4 nuevos (ConfirmDialog, OfflineBanner, useOnlineStatus, useSafeMotion, useDebounce).

## [2026-07-22] — Módulo de Configuración de IA (Dashboard, LLM Selector, API Keys CRUD)
- Tipo: feature + security
- Qué:
  - **Backend — Migraciones:** 2 nuevas tablas:
    - `ai_configurations` — almacena proveedor, modelo, API key cifrada (AES-256-GCM), fallback, orden.
    - `ai_usage_logs` — tracking de tokens, costos, tiempos de respuesta por petición.
  - **Backend — Modelos:** `AiConfiguration` con accessor/mutator que cifra/descifra `api_key` transparentemente via `Crypt::encryptString/decryptString`. Método `getMaskedApiKey()` que retorna solo últimos 4 caracteres. `AiUsageLog` con casts y relación a User.
  - **Backend — AiConfigurationService:** Servicio puente que lee configs activas desde DB con cache, fallback a `config/ai.php` si no hay registros. `syncToCache()` persiste cambios en tiempo real sin reinicio de servidor.
  - **Backend — AIEvaluationService modificado:** Ahora usa `AiConfigurationService` para registrar providers. Si hay configs en DB, las usa con prioridad; si no, cae al archivo de configuración (backward compatible).
  - **Backend — AiConfigController:** 8 endpoints:
    - CRUD completo sobre `ai_configurations` (index, store, show, update, destroy)
    - `POST /{id}/test` — Health check real contra OpenAI/Anthropic/Gemini (petición liviana de validación)
    - `GET /usage` — Analytics agregados por día, proveedor y modelo (totales, tokens, costos, tasa de éxito)
    - `POST /sync` — Sincroniza DB → cache runtime (sin reinicio)
  - **Backend — Routes:** 8 rutas bajo middleware `role:SUPERADMIN,ADMIN` en grupo `ai/config`.
  - **Frontend — useAIConfig hook:** Hook completo con tipos, CRUD, test de conexión, carga de usage analytics y sync.
  - **Frontend — AIConfigPanel view:** Panel de 2 secciones:
    - *Dashboard de Uso:* KPI cards (peticiones, tokens, costo, tasa de éxito), gráfico de barras SVG de consumo diario, desglose por proveedor con barras de progreso. Selector de período (7/30/90 días).
    - *LLM Selector + API Keys:* Tabla con proveedor, modelo (mono), API key enmascarada, estado activo, badge de respaldo, acciones (test connection, editar, toggle activo, eliminar). Modal de creación/edición con selector de proveedor, modelo, API key (campo password con toggle visibilidad), base URL, max tokens, toggles activo/fallback.
  - **Frontend — Rutas:** `ROUTES.CONFIG_IA = "/config-ia"` registrada en `routes.tsx`, `roleAccess` (SUPERADMIN/ADMIN), `App.tsx` con `ProtectedRoute`, `SidebarNav` (reemplazado placeholder "Próx" por NavLink funcional con estilo violeta).
- Por qué / causa raíz: La configuración de proveedores de IA (API keys, modelos) estaba hardcodeada en `.env` y `config/ai.php`. No existía interfaz para administrar credenciales, seleccionar modelos dinámicamente, ni monitorear el consumo. Las API keys viajaban en texto plano en la BD (`.env`). Se requería centralizar, cifrar y exponer métricas de uso.
- Archivos:
  - `infraestructura-back/database/migrations/2026_07_22_000002_create_ai_configurations_table.php` — [NUEVO]
  - `infraestructura-back/database/migrations/2026_07_22_000003_create_ai_usage_logs_table.php` — [NUEVO]
  - `infraestructura-back/app/Models/AiConfiguration.php` — [NUEVO]
  - `infraestructura-back/app/Models/AiUsageLog.php` — [NUEVO]
  - `infraestructura-back/app/Services/AI/AiConfigurationService.php` — [NUEVO]
  - `infraestructura-back/app/Services/AI/AIEvaluationService.php` — modificado (usa AiConfigurationService)
  - `infraestructura-back/app/Http/Controllers/Api/AiConfigController.php` — [NUEVO]
  - `infraestructura-back/routes/api.php` — +8 rutas
  - `src/hooks/useAIConfig.ts` — [NUEVO]
  - `src/views/AIConfigPanel.tsx` — [NUEVO]
  - `src/routes.tsx` — +ROUTES.CONFIG_IA
  - `src/hooks/useRouting.ts` — +/config-ia en SUPERADMIN/ADMIN
  - `src/App.tsx` — +import + ruta ProtectedRoute
  - `src/components/UI/SidebarNav.tsx` — "Modelos de IA" de placeholder → NavLink
  - `CHANGELOG.md` — actualizado

## [2026-07-22] — Fix: no se podía cambiar el rol de usuario en el panel de edición

- Tipo: fix
- Qué:
  - **Backend — UserController@update:** Agregado `role` a las reglas de validación (`Rule::in(VALID_ROLES)`) y asignación condicional en el método `update()`.
  - **Frontend — useUsuarios.ts:** Agregado `role?: string` a la interfaz `UpdateUserPayload`.
  - **Frontend — UsuariosPanel.tsx:** Agregado estado `editRole`, inicializado en `startEditing()` e incluido en el payload de `saveEditing()`. Nueva fila en el panel de edición inline con selector de roles (mismos roles que el formulario de creación).
- Por qué / causa raíz: El panel de edición inline de usuarios solo permitía cambiar nombre, email y estado. No había campo para cambiar el rol, y el backend no lo aceptaba en el endpoint `PATCH /users/{id}`.
- Archivos:
  - `infraestructura-back/app/Http/Controllers/Api/UserController.php`
  - `src/hooks/useUsuarios.ts`
  - `src/views/UsuariosPanel.tsx`
  - `CHANGELOG.md` — actualizado

## [2026-07-22] — Buscador + filtro por estado en lista de usuarios

- Tipo: feature
- Qué:
  - **UsuariosPanel.tsx:** Agregada barra de búsqueda (por nombre o correo) con icono Search y filtro de estado (Todos/Activos/Inactivos) debajo del header de la lista. El conteo de usuarios muestra `filtrados / total` cuando hay filtros activos. El empty state diferencia "No hay usuarios registrados" vs "Sin resultados" cuando los filtros no coinciden.
- Por qué / causa raíz: Al crecer el número de usuarios, no había forma de buscar por nombre/correo ni filtrar por estado sin hacer scroll manual sobre toda la lista.
- Archivos:
  - `src/views/UsuariosPanel.tsx`
  - `CHANGELOG.md` — actualizado

## [2026-07-22] — Animaciones smooth en expansiones de Cards/Contenedores (5 vistas)

- Tipo: feature + refactor
- Qué:
  - **ProcuraPanel.tsx:** El formulario de autorización de inversión (`activeReviewProject`) y el formulario de rechazo (`isRejectingThis`) ahora usan `AnimatePresence` + `motion.div` con animación de opacidad + altura (`0.22s easeOut`), eliminando el salto visual abrupto.
  - **ProveedoresRegistrados.tsx:** El detalle expandible de cada propuesta (`expandedProposal`) ahora usa `AnimatePresence` + `motion.div` con `height`/`opacity` animados.
  - **CierreObraPanel.tsx:** El formulario de revisión de cálculos (`activeProject`) ahora usa `AnimatePresence` + `motion.form` con transición smooth.
  - **AnalistasPanel.tsx:** El panel de registro de ofertas (`activeProject`) ahora usa `AnimatePresence` + `motion.div` con transición smooth.
  - **Patrón usado en todos:** `initial={{ opacity: 0, height: 0 }}` → `animate={{ opacity: 1, height: "auto" }}` con `duration: 0.22, ease: "easeOut"`, y overflow-hidden para evitar saltos de layout. Sin sacrificar velocidad de apertura.
- Por qué / causa raíz: Las expansiones condicionales (`{cond && <Componente/>}`) se renderizaban instantáneamente sin transición, dando una sensación abrupta que degradaba la UX, especialmente en el flujo de Procura (Gerencia de Procura).
- Archivos:
  - `src/views/ProcuraPanel.tsx`
  - `src/views/ProveedoresRegistrados.tsx`
  - `src/views/CierreObraPanel.tsx`
  - `src/views/AnalistasPanel.tsx`
  - `CHANGELOG.md` — actualizado

## [2026-07-22] — Animaciones stagger/spring aplicadas a todas las vistas autenticadas

- Tipo: feature + refactor
- Qué:
  - **src/animations.ts:** [NUEVO] Variantes compartidas `containerVariants` (staggerChildren: 0.08, delayChildren: 0.15) y `itemVariants` (spring: stiffness 100, damping 15) extraídas del patrón usado originalmente en UsuariosPanel.
  - **UsuariosPanel.tsx:** Refactorizado para importar variantes desde `src/animations.ts` en lugar de definiciones inline.
  - Vistas con animaciones aplicadas (root `motion.div` + secciones principales con `itemVariants`):
    - ProveedoresConfigPanel, MaterialConfigPanel, PresidenciaDashboard, FinanzasPanel, ProcuraPanel, ProveedoresRegistrados, InfraestructuraMantenimientoPanel, CierreObraPanel, AnalistasPanel
  - **CierreObraPanel.tsx:** Corregidos cierres de `motion.div` de SECTION 2 y root (estaban como `</div>`) para que cierren correctamente.
  - **InfraestructuraMantenimientoPanel.tsx:** Corregido cierre de left column (`</div>` → `</motion.div>`).
  - **ProveedoresRegistrados.tsx:** Corregidos cierres de header (`</div>` → `</motion.div>`), contractor table (`<div>` → `<motion.div>`), proposals section (`</div>` → `</motion.div>`).
  - **AnalistasPanel.tsx:** Envueltas ambas columnas en `motion.div` con `itemVariants`. Corregidos cierres de left column y right column.
- Por qué / causa raíz: Las vistas tenían estilos de animación inconsistentes (solo UsuariosPanel tenía la entrada animada). Se estandarizó el patrón de entrada fade+slide-up con stagger en todas las vistas, eliminando duplicación de variantes y logrando una experiencia visual cohesiva.
- Archivos:
  - `src/animations.ts` — [NUEVO]
  - `src/views/UsuariosPanel.tsx` — refactor
  - `src/views/ProveedoresConfigPanel.tsx`
  - `src/views/MaterialConfigPanel.tsx`
  - `src/views/PresidenciaDashboard.tsx`
  - `src/views/FinanzasPanel.tsx`
  - `src/views/ProcuraPanel.tsx`
  - `src/views/ProveedoresRegistrados.tsx`
  - `src/views/InfraestructuraMantenimientoPanel.tsx`
  - `src/views/CierreObraPanel.tsx`
  - `src/views/AnalistasPanel.tsx`
  - `CHANGELOG.md` — actualizado

## [2026-07-22] — Fix: canAccess no detectaba nuevas rutas por stale closure en useCallback

- Tipo: fix
- Qué:
  - **useRouting.ts:** Eliminados los wrappers `useCallback` de `canAccess` y `firstAllowedRoute`. Al estar el objeto `roleAccess` definido a nivel de módulo, `useCallback` capturaba el array original del closure en el momento de la primera ejecución. Si el módulo se recargaba (HMR/rebuild) con nuevas rutas, el closure seguía apuntando al objeto `roleAccess` antiguo, y `includes()` no encontraba las rutas nuevas. Ahora son funciones planas que siempre leen el `roleAccess` actual del módulo.
- Por qué / causa raíz: Al agregar `/config-materiales` al `roleAccess`, SUPERADMIN no podía acceder porque `canAccess("/config-materiales")` seguía evaluando contra el array anterior (sin la ruta nueva) debido al closure congelado por `useCallback`.
- Archivos: `src/hooks/useRouting.ts`

## [2026-07-22] — Nueva pestaña: Configuración Materiales (CRUD + soft delete)

- Tipo: feature
- Qué:
  - **Backend — MaterialController:** Nuevo controlador con 5 endpoints para administración del catálogo de materiales:
    - `GET /api/materials/config` — listado completo con nombre, unidad, precio, estado y timestamps
    - `POST /api/materials/config` — creación de material con validación de unique (name + unit)
    - `GET /api/materials/config/{material}` — detalle individual
    - `PATCH /api/materials/config/{material}` — actualización de datos y estado
    - `POST /api/materials/config/{material}/toggle-status` — alterna is_active (true → false → true)
  - **Backend — Routes:** 5 rutas registradas bajo middleware `role:SUPERADMIN,ADMIN` en el grupo de configuración.
  - **Frontend — Ruta `/config-materiales`:** Nueva constante `ROUTES.CONFIG_MATERIALES`, con `ProtectedRoute` y acceso para roles SUPERADMIN/ADMIN.
  - **Frontend — MaterialConfigPanel.tsx:** Panel completo de gestión de materiales:
    - Tabla con 6 columnas (ID, nombre, unidad, precio est., estado, acciones)
    - Búsqueda por nombre o unidad
    - Botón "Nuevo material" con modal de creación (nombre, unidad, precio)
    - Edición inline vía modal con los mismos campos + toggle de estado (Activo/Inactivo)
    - Toggle de estado con spinner por fila
    - Badge de estado (Activo/Inactivo) con colores diferenciados (emerald/slate)
    - Paginación de 20 registros
    - Diseño consistente con el ecosistema (border-l accent emerald, gradientes, Table component)
  - **Frontend — SidebarNav:** El ítem "Material" en el dropdown de Configuración ya no es un placeholder deshabilitado con badge "Próx"; ahora es un NavLink funcional a `/config-materiales` con estilo emerald.
  - **Frontend — roleAccess:** SUPERADMIN y ADMIN incluyen `/config-materiales` en sus rutas permitidas.
- Por qué: El dropdown de configuración tenía el ítem "Material" como placeholder deshabilitado ("Próx"). Se necesitaba un panel CRUD para administrar el catálogo maestro de materiales (crear, editar, activar/desactivar), usando soft delete (is_active) en lugar de eliminación física.
- Archivos:
  - `infraestructura-back/app/Http/Controllers/Api/MaterialController.php` — [NUEVO]
  - `infraestructura-back/routes/api.php` — +5 rutas admin + import
  - `src/routes.tsx` — +ROUTES.CONFIG_MATERIALES
  - `src/hooks/useRouting.ts` — +/config-materiales en SUPERADMIN/ADMIN
  - `src/views/MaterialConfigPanel.tsx` — [NUEVO]
  - `src/components/UI/SidebarNav.tsx` — "Material" de placeholder → NavLink
  - `src/App.tsx` — +ruta CONFIG_MATERIALES con ProtectedRoute
  - `CHANGELOG.md` — actualizado

## [2026-07-22] — Fix: Proveedores operativos solo muestran ACTIVE + polling en useContractors

- Tipo: fix
- Qué:
  - **Backend — SupportController@contractors():** Agregado `->where('status', 'ACTIVE')` para que el endpoint `GET /api/contractors` solo devuelva contratistas activos. Los inactivos y pendientes ya no aparecen en las vistas operativas (ProveedoresRegistrados, AnalistasPanel). El endpoint de configuración (`/contractors/config`) no se ve afectado y sigue retornando todos.
  - **Frontend — useContractors.ts:** Agregado polling (30s) con deduplication por firma (código+nombre+rating) y silencio en errores de poll, siguiendo el mismo patrón de useProjectsData y useProveedores. Mantiene la tabla actualizada cuando se registra un nuevo proveedor vía portal público o se modifica desde configuración.
- Por qué / causa raíz: El endpoint `GET /api/contractors` no filtraba por status, retornando todos los contratistas (PENDING_REVIEW, ACTIVE, INACTIVE) a las vistas operativas, lo que podía causar problemas con soft-delete y mostrar proveedores no aptos para selección/invitación. Además, la tabla no tenía polling, por lo que nuevos registros del portal público no se reflejaban sin refresh manual.
- Archivos:
  - `infraestructura-back/app/Http/Controllers/Api/SupportController.php` — filter ACTIVE
  - `src/hooks/useContractors.ts` — +polling 30s con dedupe + silent poll errors

## [2026-07-22] — Nueva pestaña: Configuración Proveedores (CRUD + gestión de estado)

- Tipo: feature
- Qué:
  - **Backend — ContractorController:** Nuevo controlador con 5 endpoints para administración del catálogo de proveedores:
    - `GET /api/contractors/config` — listado completo con origen, estado y timestamps
    - `POST /api/contractors/config` — creación de proveedor con origen INTERNAL
    - `GET /api/contractors/config/{contractor}` — detalle individual
    - `PATCH /api/contractors/config/{contractor}` — actualización de datos y estado
    - `POST /api/contractors/config/{contractor}/toggle-status` — ciclo PENDING_REVIEW → ACTIVE → INACTIVE → ACTIVE
  - **Backend — Routes:** 5 rutas registradas bajo middleware `role:SUPERADMIN,ADMIN` en el grupo de configuración.
  - **Frontend — Ruta `/config-proveedores`:** Nueva constante `ROUTES.CONFIG_PROVEEDORES`, con `ProtectedRoute` y acceso para roles SUPERADMIN/ADMIN.
  - **Frontend — ProveedoresConfigPanel.tsx:** Panel completo de gestión de proveedores:
    - Tabla con 8 columnas (código, nombre, especialidad, contacto, rating, origen, estado, acciones)
    - Búsqueda por nombre/código/especialidad/contacto
    - Botón "Nuevo proveedor" con modal de creación (nombre, especialidad, contacto, rating, estado)
    - Edición inline vía modal con los mismos campos
    - Toggle de estado con spinner por fila
    - Badges de origen (Interno, Portal público, Seed) y estado (Activo/Inactivo/Pendiente) con colores diferenciados
    - Paginación de 20 registros
    - Diseño consistente (border-l accent, gradientes, Table component)
  - **Frontend — SidebarNav:** El ítem "Proveedores" en el dropdown de Configuración ya no está deshabilitado; ahora es un NavLink funcional a `/config-proveedores` con estilo indigo.
- Por qué: El dropdown de configuración tenía el ítem "Proveedores" como placeholder deshabilitado ("Próx"). Se necesitaba un panel CRUD para administrar el catálogo maestro de proveedores (crear, editar, activar/desactivar), separado de la vista operativa de ProveedoresRegistrados (`/catalogos`).
- Archivos:
  - `infraestructura-back/app/Http/Controllers/Api/ContractorController.php` — [NUEVO]
  - `infraestructura-back/routes/api.php` — +5 rutas admin
  - `src/routes.tsx` — +ROUTES.CONFIG_PROVEEDORES
  - `src/hooks/useRouting.ts` — +/config-proveedores en SUPERADMIN/ADMIN
  - `src/views/ProveedoresConfigPanel.tsx` — [NUEVO]
  - `src/components/UI/SidebarNav.tsx` — "Proveedores" de disabled span → NavLink
  - `src/App.tsx` — +ruta CONFIG_PROVEEDORES con ProtectedRoute
  - `CHANGELOG.md` — actualizado

## [2026-07-22] — Sidebar: dropdown de configuración (Usuarios, Proveedores, Material, IA Models)

- Tipo: refactor
- Qué:
  - **Dropdown "Configuración"** — Reemplazado el NavLink de Usuarios (comentado) por un botón desplegable con icono `Settings` y chevron animado (`rotate-180` al abrir).
  - **Sub-items activos:** Usuarios (`/usuarios`) y Proveedores (`/catalogos`) como NavLinks funcionales con estilo consistente al resto de la sidebar.
  - **Sub-items pendientes:** Material e IA Models renderizados como `<span>` deshabilitados (opacity 50%, cursor-not-allowed, badge "Próx") para indicar que están próximos, sin generar navegación a rutas inexistentes.
  - **Permisos:** El dropdown completo se muestra bajo el mismo guard `canAccess("/usuarios")` que el link original.
- Por qué: El navbar de usuarios necesitaba convertirse en un menú de opciones configurables. Los items Material e IA Models son vistas pendientes de crear; se marcan como "Próx" en vez de crear rutas placeholder.
- Archivos: `src/components/UI/SidebarNav.tsx`

## [2026-07-22] — CRUD usuarios: status, update, toggle, password reset link

- Tipo: feature
- Qué:
  - **Backend — Migración:** `add_status_to_users_table` agrega columna `status` (string, default 'Active') a la tabla `users`.
  - **Backend — User model:** +`status` en `$fillable`, scopes `active()`/`inactive()`, helpers `isActive()`/`isInactive()`, override `sendPasswordResetNotification()` para usar frontend URL.
  - **Backend — AuthController:** login bloqueado si el usuario está `Inactive` (mensaje "Esta cuenta ha sido desactivada.").
  - **Backend — UserController:** 3 nuevos métodos:
    - `update()` — PATCH /users/{user}: actualiza name, email, status (validación individual con `sometimes`).
    - `toggleStatus()` — POST /users/{user}/toggle-status: alterna Active/Inactive, revoca tokens al desactivar.
    - `sendResetLink()` — POST /users/{user}/send-reset-link: envía email con link de restablecimiento usando `Password::sendResetLink()`.
  - **Backend — Custom Notification:** `UserPasswordReset` con frontend URL desde `config('app.frontend_url')`, asunto y cuerpo en español.
  - **Backend — Routes:** 3 rutas nuevas dentro del grupo `role:SUPERADMIN,ADMIN`.
  - **Frontend — useUsuarios.ts:** 3 nuevos métodos (`handleUpdateUser`, `handleToggleUserStatus`, `handleSendPasswordReset`) con actualización optimista del estado local.
  - **Frontend — UsuariosPanel.tsx:**
    - **Status visual:** badge "Activo" (verde) / "Inactivo" (gris) con indicador circular en cada usuario.
    - **Usuarios inactivos:** opacidad reducida (50% → 70% hover) para diferenciarlos visualmente.
    - **Edición inline:** clic en lápiz expande la fila con inputs para nombre, email y select de status; botones Guardar/Cancelar con loading state.
    - **Toggle status:** botón con icono `UserX`/`RotateCcw` que activa/desactiva al usuario; spinner durante la operación.
    - **Password reset:** botón `Send` que envía el link; deshabilitado si el usuario está inactivo.
    - **Per-user loading:** `togglingId`/`sendingId` evita interferencia entre operaciones simultáneas.
- Por qué / causa raíz: El panel de usuarios solo tenía Create, faltaban Update (nombre, correo, status), soft delete (desactivar usuario) y envío de link de restablecimiento de contraseña.
- Archivos:
  - `infraestructura-back/database/migrations/2026_07_22_000001_add_status_to_users_table.php` — [NUEVO]
  - `infraestructura-back/app/Models/User.php`
  - `infraestructura-back/app/Notifications/UserPasswordReset.php` — [NUEVO]
  - `infraestructura-back/app/Http/Controllers/Api/UserController.php`
  - `infraestructura-back/app/Http/Controllers/Api/AuthController.php`
  - `infraestructura-back/routes/api.php`
  - `infraestructura-back/config/app.php`
  - `infraestructura/src/hooks/useUsuarios.ts`
  - `infraestructura/src/views/UsuariosPanel.tsx`

## [2026-07-22] — Mejora visual completa de UsuariosPanel

- Tipo: refactor (visual)
- Qué:
  - **Header del panel** — Icono con gradiente `from-sky-500 to-sky-600` en vez de flat `bg-sky-500`.
  - **Formulario** — `border-l-4 border-l-sky-400`; icono de cabecera con gradiente, borde y sombra.
  - **Banners success/error** — `border-l-4` (emerald/rose), fondo con gradiente, icono decorativo (`CheckCircle`/`XCircle`).
  - **Inputs** — `pointer-events-none` en íconos, `transition-all duration-200`, `focus:shadow-sm`, `placeholder:text-slate-400`.
  - **Select de rol** — ChevronDown decorativo superpuesto con `pointer-events-none`.
  - **Botón submit** — Gradiente `from-sky-600 to-sky-500`, `shadow-md`, `hover:shadow-lg hover:-translate-y-0.5`, spinner animado en estado loading.
  - **Feedback de validación** — Hint "contraseñas no coinciden" con icono `XCircle` inline.
  - **Lista de usuarios** — `border-l-4 border-l-indigo-400`; cabecera con gradiente `from-indigo-50/30 to-white`.
  - **Badge de conteo** — Gradiente `from-indigo-50 to-white` con `shadow-xs`.
  - **Loading spinner** — Más grande (w-8/h-8), color indigo, borde más grueso.
  - **Empty state** — Icon container con gradiente, borde, sombra y textos refinados.
  - **Items de usuario** — Hover con gradiente `from-indigo-50/30 to-white`, avatar con gradiente y sombra que se intensifica en hover, nombre oscurece en hover.
- Por qué: UsuariosPanel era visualmente plana (sin border-l accents, sin gradientes en botones, iconos o fondos) y se veía desalineada con el design language del sistema (FinanzasPanel, CierreObraPanel, InfraestructuraMantenimientoPanel).
- Archivos: `src/views/UsuariosPanel.tsx`

## [2026-07-22] — Sidebar: scrollbar custom integrada al tema oscuro

- Tipo: style
- Qué:
  - Agregada clase `.sidebar-scrollbar` en `index.css` con scrollbar delgada (6px), track transparente y thumb `slate-400/15` que se intensifica a `slate-400/30` en hover.
  - `@supports (scrollbar-color: auto)` para Firefox con `scrollbar-width: thin`.
  - Aplicada al `<nav>` del sidebar.
- Por qué: La scrollbar nativa del sidebar (tema oscuro `#0F172A`) se veía fuera de estilo — track blanco/genérico que rompía la inmersión visual.
- Archivos: `src/index.css`, `src/components/UI/SidebarNav.tsx`

## [2026-07-21] — Mejora visual de ProveedoresRegistrados

- Tipo: refactor (visual)
- Qué:
  - **border-l-4 accent** — Header card con `border-l-4 border-l-sky-400`; ambas table cards (contratistas y propuestas) con `border-l-4 border-l-indigo-400`, alineándose con el design language de FinanzasPanel, CierreObraPanel e InfraestructuraMantenimientoPanel.
  - **Botones CTA con gradientes** — "Abrir registro publico" (`from-sky-600 to-sky-500`), "Guardar evaluacion" (`from-amber-600 to-amber-500`), "Generar enlace unico" (`from-indigo-600 to-indigo-500`), "Copiar enlace" (`from-emerald-600 to-emerald-500` / `from-indigo-600 to-indigo-500`), todos con `shadow-md`, `hover:shadow-lg`, `hover:-translate-y-0.5` y `transition-all duration-200`.
  - **Badges con gradientes** — Rating badge (`from-amber-50 to-amber-100/50`), proposal ID badge (`from-indigo-50 to-indigo-100/50`), total count badges (`from-slate-50 to-white`), footer de items table (`from-slate-50 to-white`).
  - **Proposal expanded detail box** — `bg-gradient-to-br from-indigo-50/40 to-white border border-indigo-100/60` en vez de bg plano.
  - **Generated link box** — `bg-gradient-to-br from-emerald-50/40 to-white border border-emerald-200/60` en el modal de invitación.
  - **Action icon buttons** — Edit rating y invite buttons con `hover:shadow-md hover:-translate-y-0.5` y `transition-all duration-200`.
  - **Botones secundarios** — Cancelar y reset buttons con `transition-all duration-200 hover:shadow-md`.
- Por qué: ProveedoresRegistrados era la única vista con cards sin border-l accent, botones CTA planos sin gradientes ni sombras, y badges sin gradientes. Estaba visualmente desalineada con el resto del sistema.
- Archivos: `src/views/ProveedoresRegistrados.tsx`

## [2026-07-21] — Fix: Providers de IA — ConnectionException no capturado + failover + visibilidad de errores

- Tipo: fix + feature
- Qué:
  - **ConnectionException no capturado (causa raíz del 500)** — `Illuminate\Http\Client\ConnectionException` extiende `HttpClientException → Exception`, NO `RuntimeException`. El `catch (RuntimeException $e)` en `AIEvaluationService::evaluate()` y `AIEvaluationController::evaluate()` no lo capturaba, provocando un 500 en vez de un 503 con failover. Cambiado a `catch (\Throwable $e)` en ambos.
  - **Typo en `evaluateWithProvider`** — `$this->attempLog` → `$this->attemptLog` (2 ocurrencias). El log de intentos forzado se escribía en una propiedad inexistente y se devolvía vacío.
  - **Try/catch en `evaluateWithProvider` (forced provider)** — La ruta de proveedor forzado no tenía manejo de excepciones. Ahora captura `\Throwable`, registra en el log y re-lanza como `RuntimeException` con el provider original como `$previous`.
  - **HTTP retry en los 3 providers** — Agregado `->retry(2, 1000)` a las llamadas `Http::post()` en `OpenAIProvider`, `GeminiProvider` y `AnthropicProvider`. Los timeouts transitorios ahora reintentan automáticamente antes de failover.
  - **Timeout aumentado de 30s a 60s** — `AI_TIMEOUT` en `config/ai.php` y `.env` pasado de 30 a 60. Las evaluaciones de propuestas con múltiples contratistas necesitan más tiempo.
  - **`attemptLog` en respuesta de error** — El controlador ahora incluye `attemptLog` en la respuesta JSON de error (503), mostrando qué proveedores se intentaron y sus errores.
  - **Frontend: parseo de errores 503** — `api.ts` ahora parsea el cuerpo JSON de respuestas 503 y extrae `error` + `attemptLog`, adjuntándolos al objeto `Error`. Antes mostraba un genérico "Error interno del servidor".
  - **Frontend: visibilidad del failover** — `EvaluacionInteligenteModal.tsx` muestra el `attemptLog` del backend (éxitos y fallos de cada proveedor) en el log de failover, tanto en caso de éxito como de error. `AIEvaluationResult` incluye `attemptLog?`.
  - **`.env.example` actualizado** — Agregadas las variables de configuración de AI (`AI_TIMEOUT`, `OPENAI_*`, `GEMINI_*`, `ANTHROPIC_*`).
- Por qué / causa raíz: El error `cURL error 28 (timeout)` lanzaba `ConnectionException` que no era capturado por el `catch (RuntimeException)`, resultando en 500 y sin información de qué proveedores se intentaron. El frontend mostraba un error genérico sin el log de failover.
- Archivos:
  - `infraestructura-back/app/Services/AI/AIEvaluationService.php` — catch \Throwable, typo fix, try/catch forced provider
  - `infraestructura-back/app/Http/Controllers/Api/AIEvaluationController.php` — catch \Throwable, attemptLog en error response
  - `infraestructura-back/app/Services/AI/Providers/OpenAIProvider.php` — +retry
  - `infraestructura-back/app/Services/AI/Providers/GeminiProvider.php` — +retry
  - `infraestructura-back/app/Services/AI/Providers/AnthropicProvider.php` — +retry
  - `infraestructura-back/config/ai.php` — timeout default 30→60
  - `infraestructura-back/.env` — AI_TIMEOUT=60
  - `infraestructura-back/.env.example` — vars AI agregadas
  - `src/services/api.ts` — parseo 503 + attemptLog en Error
  - `src/services/aiEvaluationService.ts` — attemptLog en AIEvaluationResult
  - `src/components/Modals/EvaluacionInteligenteModal.tsx` — mostrar attemptLog del backend

## [2026-07-21] — Fix: aiEvaluationService no retornaba resultados por desenvolvimiento doble de apiFetch

- Tipo: fix
- Qué:
  - **Doble desenvolvimiento de `json.data`** — `apiFetch()` ya desenvuelve `json.data ?? json`, retornando el objeto interno directamente. Pero `aiEvaluationService.ts` seguía esperando la estructura `{ success, data }` completa y verificaba `!result.success || !result.data`. Como el resultado ya era el `AIEvaluationResult` interno (sin campos `success`/`data`), la condición siempre era verdadera y lanzaba "La evaluación no devolvió resultados" aunque el backend respondiera 200 OK con todos los datos.
  - Eliminada la interfaz `AIEvaluationResponse` (ya no usada).
  - `apiFetch<AIEvaluationResult>` retorna directamente el resultado; el manejo de errores (503) lo hace `apiFetch` lanzando `Error` con el mensaje del backend.
- Por qué / causa raíz: Después del refactor de `api.ts` que agregó el desenvolvimiento automático de `json.data`, `aiEvaluationService.ts` no se actualizó, manteniendo la lógica obsoleta de verificación de `success`/`data`.
- Archivos: `src/services/aiEvaluationService.ts`

## [2026-07-21] — Mejora visual de FinanzasPanel

- Tipo: refactor (visual)
- Qué:
  - **Cards con border-l accent** — Anticipos con `border-l-4 border-l-rose-400`, Liquidaciones con `border-l-4 border-l-sky-400`, Libro Diario con `border-l-4 border-l-slate-400`.
  - **Botones CTA con gradientes** — Reemplazados `bg-rose-500`/`bg-sky-500` planos por `bg-gradient-to-r from-{color}-600 to-{color}-500`, `shadow-md shadow-{color}-500/20`, `hover:shadow-lg hover:shadow-{color}-500/30 hover:-translate-y-0.5`.
  - **Paneles de detalle con gradientes** — Grid de info de anticipos ahora usa `bg-gradient-to-br from-rose-50/40 to-white border border-rose-100/60`. Grid de liquidaciones usa `from-sky-50/40 to-white border border-sky-100/60`.
  - **Badges con gradientes** — "Anticipo Pendiente" usa `from-amber-50 to-amber-100/50`, "Aprobación de Calidad OK" usa `from-sky-50 to-sky-100/50`.
  - **Libro Diario con SectionHeader** — Header custom reemplazado por `<SectionHeader>` con `color="slate"` e icono `ArrowUpRight`, unificando el patrón con las demás vistas.
  - **Badges de tipo en tabla** — Tipo Egreso usa `bg-gradient-to-br` en vez de bg plano para consistencia con el design language.
  - **Icono voucher** — Cambiado de `text-rose-500` a `text-slate-400` para alinearse con el tema slate del ledger.
- Por qué: FinanzasPanel era la única vista sin border-l accent, con botones planos sin gradientes ni sombras, paneles de info sin gradientes, y header custom del ledger sin SectionHeader. Estaba visualmente desalineado con CierreObra, Infraestructura y Procura.
- Archivos: `src/views/FinanzasPanel.tsx`

## [2026-07-21] — Mejora visual de Cierre de Obra

- Tipo: refactor (visual)
- Qué:
  - **Card de revisión de cálculos** — `border-l-4 border-l-sky-400`, selector con gradient activo y `contentVisibility: auto` para scroll performance, detalle de inversión con gradient bg y bullets en materiales, submit button con gradient y hover translate.
  - **Card de auditoría de fin de obra** — `border-l-4 border-l-emerald-400`, items en `bg-white` con hover `border-emerald-200`, botón de certificación con gradient emerald y shadow, scroll container con `will-change` y cada item con `contain`.
  - **Info box flujo de retornos** — `border-l-4 border-l-slate-400`, `bg-white`, pasos numerados con badge circular, layout más limpio.
- Archivos: `src/views/CierreObraPanel.tsx`

## [2026-07-21] — Mejora visual completa de Infraestructura/Mantenimiento

- Tipo: refactor (visual)
- Qué:
  - **Formulario de creación** — `border-l-4 border-l-sky-400`, botones de tipo con gradient y shadow en active, submit button con gradient `from-sky-500 to-sky-600` y hover animations.
  - **Configurar materiales** — `border-l-4 border-l-emerald-400`, header con icon container (mismo patrón que Presidencia), tabs rediseñados como toggle pills con fondo `bg-slate-100/60`, form background con `bg-gradient-to-br from-emerald-50/30 to-white`, botón Agregar en emerald.
  - **Columna derecha** — Dark info card con `border-l-4 border-l-sky-400`, icon container, steps con badge circular. Lista de peticiones con `border-l-4 border-l-slate-400`, header unificado, items con hover shadow, empty state, max-height scroll.
- Archivos: `src/views/InfraestructuraMantenimientoPanel.tsx`

## [2026-07-21] — Auditoría: buscador con filtro por rol + modal de detalles

- Tipo: feature
- Qué:
  - **AuditInspectModal** — Nuevo componente en `src/components/Modals/AuditInspectModal.tsx` que muestra todos los campos de un `AuditLog` en formato limpio y legible (proyecto, acción, detalles completos, metadatos).
  - **Columnas de auditoría simplificadas** — `PresidenciaDashboard.tsx` reemplazó las 7 columnas originales (incluyendo projectTitle, projectId, details) por 4 columnas compactas (timestamp, rol, usuario, acción) más un botón "Inspeccionar" en cada fila que abre el modal.
  - Se eliminaron los truncamientos (`line-clamp`) y la sobrecarga visual de la tabla de trazabilidad.
  - **Buscador con filtro por rol y rango de fechas** — Nueva barra de búsqueda en la tabla de auditoría que permite buscar por acción, proyecto, usuario o detalles. Además, filtro por rol (Presidencia, Infraestructura, Cierre de Obra, Procura, Analistas, Finanzas, Sistema) y filtro por rango de fechas (desde/hasta) con inputs de tipo `date`, todo con el mismo patrón de UI que el Master de Obras.
- Archivos: `src/components/Modals/AuditInspectModal.tsx` (nuevo), `src/views/PresidenciaDashboard.tsx`

## [2026-07-21] — Fixes post-testing: CSP, sanitización XSS, rate limiting, token refresh

- Tipo: fix
- Qué:
  - **CSP backend** — Nuevo middleware `AddCspHeaders.php` agregado al grupo `api` en Kernel. Todas las respuestas API ahora incluyen `Content-Security-Policy` con `default-src 'self'`, `frame-ancestors 'none'`, etc.
  - **Sanitización XSS mejorada** — `sanitize()` en `MaterialesProveedores.tsx` y `PropuestaMaterialesPublica.tsx` ahora también elimina `javascript:` URIs, event handlers (`onerror=`, `onclick=`, etc.) y llamadas JS peligrosas (`alert()`, `prompt()`, `confirm()`, `print()`, `open()`, `write()`). Backend: `SupportController@storeContractor` agrega `strip_tags()` en name/specialty/contact como defensa en profundidad.
  - **Rate limiting** — Corregido comando de prueba en `TESTING_GUIDE.md`: usa `http://localhost:8000` (no HTTPS), sintaxis PowerShell con `Invoke-WebRequest` + alternativa curl para Git Bash.
  - **Token refresh** — Nuevo comando Artisan `token:age {email}` que envejece el último token del usuario a 23h atrás para probar el refresh sin esperar. Guía actualizada con pasos claros.
- Por qué / causa raíz: Reporte de pruebas manuales del 21-Jul: CSP ausente en API responses, sanitización no eliminaba `alert(1)` del texto, comando curl usaba protocolo incorrecto, token refresh no era testeable sin modificar BD manualmente.
- Archivos:
  - `infraestructura-back/app/Http/Middleware/AddCspHeaders.php` — [NUEVO]
  - `infraestructura-back/app/Http/Kernel.php` — registro del middleware
  - `infraestructura-back/app/Http/Controllers/Api/SupportController.php` — strip_tags()
  - `infraestructura-back/app/Console/Commands/AgeUserToken.php` — [NUEVO]
  - `infraestructura/src/views/MaterialesProveedores.tsx` — sanitize() mejorado
  - `infraestructura/src/views/PropuestaMaterialesPublica.tsx` — sanitize() mejorado
  - `infraestructura/TESTING_GUIDE.md` — comandos corregidos, token refresh guía

---

## [2026-07-21] — Feature: Links de invitación single-use + invalidación automática

- Tipo: feature
- Qué:
  - **Migración** — `database/migrations/2026_07_21_000001_add_link_status_to_supplier_invitations.php`: agregadas columnas `used_at` (timestamp nullable) y `replaced_by` (char(36) nullable) a `supplier_invitations`.
  - **Modelo** — `SupplierInvitation.php`: nuevo método `isValid()` que retorna `true` solo si `used_at IS NULL AND replaced_by IS NULL`. Nuevos campos en `$fillable` y `$casts`.
  - **Single-use** — `storeSupplierMaterialProposal`: después de crear la propuesta exitosamente, marca `used_at = now()` en la invitación. El mismo link no puede usarse dos veces.
  - **Invalidación al re-invitar** — `createSupplierInvitation`: al crear una nueva invitación para el mismo `project_id + supplier_contact`, marca todas las invitaciones activas previas con `replaced_by = {nuevo_uuid}`. El proveedor siempre usa el link más reciente.
  - **Frontend**: sin cambios — los mensajes de error ya decían "Enlace no valido o expirado."
- Por qué / causa raíz: los links de invitación nunca expiraban ni se invalidaban. Re-invitar al mismo proveedor generaba múltiples links activos, permitiendo propuestas duplicadas.
- Archivos:
  - `infraestructura-back/database/migrations/2026_07_21_000001_add_link_status_to_supplier_invitations.php` — [NUEVO]
  - `infraestructura-back/app/Models/SupplierInvitation.php`
  - `infraestructura-back/app/Http/Controllers/Api/SupportController.php`
  - `CHANGELOG.md` — actualizado

---

## [2026-07-21] — Security audit + hardening de rutas públicas (Fase 1 + 2)

- Tipo: security + feature
- Qué: Auditoría y endurecimiento completo de las 2 rutas públicas del sistema (`/registro-proveedores` y `/propuesta-materiales/:token`) más seguridad estructural del frontend y backend.

### BACKEND (Laravel — `infraestructura-back/`)

1. **CORS restringido** — `config/cors.php`: `allowed_origins` cambiado de `['*']` a `[env('FRONTEND_URL', 'http://localhost:3000')]`. Se agregó `FRONTEND_URL` a `.env`.
2. **Rate limiter dedicado para endpoints públicos** — `app/Providers/RouteServiceProvider.php`: nuevo rate limiter `public-api` con 10 req/min por IP. Aplicado a `POST /login`, `POST /contractors`, `GET /public/invitations/{token}`, `POST /public/invitations/{token}/proposal` via `->middleware('throttle:public-api')`.
3. **Audit logging de accesos públicos** — `app/Http/Controllers/Api/SupportController.php`: nuevo método `logPublicAccess()` que registra en Laravel Log cada acceso a rutas públicas con IP, User-Agent, acción y timestamp. Integrado en `storeContractor`, `getInvitationPublicInfo`, `storeSupplierMaterialProposal`.
4. **Firma de método corregida** — `getInvitationPublicInfo(string $token)` → `getInvitationPublicInfo(Request $request, string $token)` para poder acceder al request.

### FRONTEND (React SPA — `infraestructura/`)

5. **Content Security Policy (CSP)** — `index.html`: meta tag CSP que restringe `script-src 'self'`, `connect-src 'self' https://infraestructuraback.ivoofix.com`, `form-action 'self'`, `frame-ancestors 'none'`, etc. También configurado via `server.headers` en `vite.config.ts` para modo desarrollo.
6. **Sanitización de inputs (XSS)** — `PropuestaMaterialesPublica.tsx`: agregada función `sanitize()` (elimina etiquetas HTML/XML) aplicada a todos los inputs de texto: `materialName`, `notes`, `unit`, `generalNotes`. También en `handleSubmit` como defensa en profundidad. Se agregaron `maxLength` coincidiendo con validación backend (materialName=220, notes=500, unit=60, generalNotes=1000).
7. **Sanitización de errores del backend** — `services/api.ts`: errores HTTP mapeados a mensajes genéricos en español. 401→"Sesión expirada", 403→"Sin permiso", 404→"No encontrado", 422→primer error de validación, 429→"Demasiadas solicitudes", 500+→"Error interno". Ya no se expone `body.error` crudo del servidor.
8. **Rate limiting client-side** — `MaterialesProveedores.tsx` y `PropuestaMaterialesPublica.tsx`: backoff exponencial tras 5 intentos fallidos (2^N seg, max 120s). Botón deshabilitado con cuenta regresiva, cleanup de interval en unmount.
9. **Manejo de X-Refresh-Token** — `services/api.ts`: nuevo `setTokenRefreshHandler()` callback que `useAuth.ts` registra al montar. Cuando el backend Laravel envía `X-Refresh-Token` header (middleware `RefreshSanctumToken`), se persiste automáticamente en localStorage y estado.
10. **Timeout de sesión por inactividad** — `useAuth.ts`: 30 minutos sin actividad (mousedown, keydown, touchstart, scroll, mousemove) cierra sesión automáticamente y recarga la aplicación.

### PRUEBAS

11. **Tests actualizados** — `useAuth.test.ts`: agregado `setTokenRefreshHandler` al mock de `../services/api` para que los 14 tests existentes sigan funcionando.
12. **37/37 tests pasan** — `npm test` exitoso con Test Files: 2 passed, Tests: 37 passed.

- Archivos backend:
  - `infraestructura-back/config/cors.php`
  - `infraestructura-back/.env`
  - `infraestructura-back/app/Providers/RouteServiceProvider.php`
  - `infraestructura-back/routes/api.php`
  - `infraestructura-back/app/Http/Controllers/Api/SupportController.php`
- Archivos frontend:
  - `index.html`
  - `vite.config.ts`
  - `src/services/api.ts`
  - `src/hooks/useAuth.ts`
  - `src/hooks/useAuth.test.ts`
  - `src/views/MaterialesProveedores.tsx`
  - `src/views/PropuestaMaterialesPublica.tsx`
- CHANGELOG.md — actualizado

---

## [2026-07-21] — Fix: Skeleton loading no se activaba tras login + test suite

- Tipo: fix
- Qué:
  - **Causa raíz:** Los hooks `useProjectsData`, `useContractors` y `useCatalog` se montan con `authToken = ""` (vista login). El `useEffect` ejecuta el loader, que ve `!authToken` y llama `setIsLoading(false)` inmediatamente, fijando `isLoading = false` **antes** de que el usuario haga login. Cuando luego el usuario se autentica, el loader arranca pero `isLoading` ya es `false`, por lo que nunca se muestra el skeleton: las vistas renderizan vacío/"0" durante la carga.
  - **Fix (3 hooks):**
    1. Eliminado `setIsLoading(false)` en el early return `if (!authToken)` — sin token no se toca `isLoading`.
    2. Agregado `useEffect` con `useRef(prevToken)` que detecta la transición falsy→truthy de `authToken` y resetea `setIsLoading(true)`. Esto cubre tanto login inicial como logout→login con distinto usuario.
    3. `isLoading` se mantiene `true` desde el mount hasta que el primer fetch con token real completa.
  - **Archivos:** `src/hooks/useProjectsData.ts`, `src/hooks/useContractors.ts`, `src/hooks/useCatalog.ts`
  - Tests pasan: 37/37.

---

## [2026-07-21] — Security + UX: LoginScreen rediseñado y useAuth endurecido

- Tipo: security + feature + refactor
- Qué:
  - **useAuth.ts** — endurecimiento de seguridad:
    - Sanitización de email: `trim().toLowerCase()` antes de enviar
    - Validación client-side defensiva (formato email, no vacío, longitud máx 254)
    - Parseo seguro de `localStorage` con try/catch + cleanup si corrupto
    - Tipado estricto de `safeUser` con coerción a String/undefined
  - **LoginScreen.tsx** — rediseño completo de UX/seguridad:
    - **Fondo**: gradiente oscuro con 3 orbes difusos (sky/indigo) + grid pattern sutíl, sin distraer
    - **Tarjeta**: glassmorphism (backdrop-blur-xl + bg-white/95 + borde translúcido), sombra profunda
    - **Password**: toggle visibilidad con iconos Eye/EyeOff + aria-label descriptivo
    - **Autocomplete**: `autoComplete="email"` y `autoComplete="current-password"` en inputs
    - **Rate limiting**: refactor con `useRef` para interval, cleanup en unmount (evita fugas), constantes con nombre
    - **Botón submit**: gradiente `from-sky-500 to-sky-600`, hover/active con scale, spinner SVG animado en loading
    - **Errores**: `role="alert"` con icono AlertCircle, mensaje del servidor preservado (no hardcodeado)
    - **Estados**: disabled en inputs durante bloqueo, feedback visual claro (opacity 60%)
    - **Accesibilidad**: aria-labels, aria-hidden en decorativos, roles semánticos
    - **Footer**: año dinámico
- Por qué / causa raíz: el login no tenía validación client-side, el password era visible sin toggle, el fondo era plano (#0F172A), el rate limiting no limpiaba interval en unmount, no había feedback visual de carga, y faltaban atributos de autocompletado/seguridad.
- Archivos:
  - `src/hooks/useAuth.ts` — sanitización, validación, parseo seguro
  - `src/views/LoginScreen.tsx` — rediseño completo
  - `src/views/LoginScreen.test.tsx` — [NUEVO] 23 tests unitarios
  - `src/hooks/useAuth.test.ts` — [NUEVO] 14 tests unitarios
  - `src/test/setup.ts` — [NUEVO] setup de testing-library/jest-dom
  - `vite.config.ts` — configuración vitest (globals, jsdom, setup)
  - `package.json` — script `test` y `test:watch` + dependencias vitest/testing-library

---

## [2026-07-21] — Refactor: Enrutador encapsulado en src/routes.tsx (ROUTES + ProtectedRoute)

- Tipo: refactor
- Qué:
  - Creado `src/routes.tsx` con:
    - `ROUTES` — objeto constante con los 11 paths del sistema (`ROUTES.PRESIDENCIA`, `ROUTES.INFRAESTRUCTURA`, etc.), eliminando todos los strings mágicos.
    - `isPublicRoute(path)` — reemplaza a `isPublicPath` (que estaba en useRouting.ts), centraliza la detección de rutas públicas.
    - `ProtectedRoute` — componente guard que envuelve elementos de rutas auth. Si `canAccess` es false redirige a `redirectTo` vía `<Navigate replace>`, eliminando el patrón ternario `canAccess ? <View /> : <Navigate />` que se repetía 8 veces.
  - `App.tsx` simplificado:
    - `fallbackRoute` computado una sola vez, no 9 veces.
    - Las 8 rutas auth usan `<ProtectedRoute>` en vez del ternario inline.
    - Todos los paths son `ROUTES.*` — cero strings hardcodeados.
    - `firstAllowedRoute` sin fallback redundante (`authUser?.role ?? "PRESIDENCIA"`).
  - `useRouting.ts` limpiado: eliminados `publicRoutes` e `isPublicPath` (movidos a routes.tsx).
- Por qué / causa raíz: las rutas estaban definidas como strings mágicos en 3 lugares (roleAccess, paths de Route, Navigate); el patrón `canAccess + Navigate` se duplicaba en cada Route; `firstAllowedRoute` se recomputaba en cada ruta. Esto violaba DRY y hacía que cambiar un path requiriera editar múltiples archivos.
- Archivos:
  - `src/routes.tsx` — [NUEVO]
  - `src/App.tsx` — refactor (usa ROUTES, ProtectedRoute, isPublicRoute)
  - `src/hooks/useRouting.ts` — limpieza (eliminados publicRoutes/isPublicPath)

---

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
- `src/routes.tsx` — Definiciones de rutas: constantes `ROUTES`, guard `ProtectedRoute`, detección `isPublicRoute`
- `src/App.tsx` — Layout + composición de hooks por dominio. Usa `ROUTES.*` y `ProtectedRoute` de routes.tsx
- `src/hooks/useAuth.ts` — Autenticación (login/logout/token)
- `src/hooks/useRouting.ts` — Control de acceso por rol (`canAccess`, `firstAllowedRoute`)
- `src/hooks/useProjects.ts` — Estado global de proyectos + todos los handlers del workflow (12 handlers)
- `src/hooks/useContractors.ts` — Catálogo de contratistas
- `src/hooks/useCatalog.ts` — Catálogo de materiales
- `src/components/InspectProjectModal.tsx` — Modal de trazabilidad de obra (createPortal a body)
- `src/components/UI/` — Componentes de UI encapsulados y reutilizables (SidebarNav, MobileTopBar, Toast)
- `src/views/` — 11 vistas (ruteables), reciben handlers por props desde App.tsx
- `src/services/api.ts` — Cliente HTTP centralizado (apiFetch, apiDownload)
- `src/services/aiEvaluationService.ts` — Servicio de llamada a backend Laravel para evaluación IA con failover
- `src/types.ts` — Interfaces `Project`, `Proposal`, `Contractor`, `ProjectStatus` y más
- `src/services/logger.ts` — Logging centralizado (`logError`, `logWarn`, `logInfo`) con prefijo `[IVOO]`
- `src/components/ErrorBoundary.tsx` — Error boundary con UI de fallback y botón reintentar
- `mobile/types.ts`, `mobile/api.ts`, `mobile/styles.ts`, `mobile/hooks/`, `mobile/components/` — App mobile refactorizada en módulos
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

## [2026-07-23] — Fix: STATUS_BADGE not defined en ProveedoresConfigPanel

- Tipo: fix
- Qué:
  - Agregada constante `STATUS_BADGE` con entradas para ACTIVE, INACTIVE y PENDING_REVIEW (label + clases Tailwind), ubicada después de `SOURCE_BADGE`.
- Por qué / causa raíz: La columna "Estado" de la tabla de proveedores referenciaba `STATUS_BADGE[c.status]` en su render, pero la constante nunca fue definida. `SOURCE_BADGE` existía pero su equivalente para status no, causando el ReferenceError en runtime.
- Archivos: `src/views/ProveedoresConfigPanel.tsx`

## [2026-07-23] — Mejora visual: card "Base de datos unificada" (oculta en mobile) + footer

- Tipo: refactor
- Qué:
  - **Card "Base de datos unificada":** Ocultada en mobile (`hidden sm:flex`). Agregado icono `Database` de lucide-react junto al badge. Fondo con gradiente `from-sky-50/40 to-white` para mejor jerarquía visual.
  - **Footer:** Rediseñado con dos secciones (brand + links). Incluye icono IVOO con gradiente, separadores `|`, y año dinámico. Fondo con gradiente `from-white to-slate-50/60`. Estructura responsive (columnas en mobile, fila en desktop).
- Por qué / causa raíz: La card ocupaba espacio innecesario en viewports móviles. El footer era una línea de texto plana sin identidad de marca ni estructura visual.
- Archivos: `src/App.tsx`

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

## [2026-07-23] — Clean code: refactor auditoría frontend (hallazgos resueltos)

- Tipo: refactor + fix
- Qué:
  - **package.json**: `name` corregido de `react-example` a `ivoo-gestion-infraestructura`
  - **useAuth.ts**: eliminado antipatrón `handlerRegistered` con `useState` → reemplazado por `useEffect(() => {...}, [])`
  - **Modal.tsx**: eliminado `@ts-ignore` en import `createPortal` (redundante)
  - **ErrorBoundary**: creado `src/components/ErrorBoundary.tsx` con UI de fallback y botón reintentar
  - **logger.ts**: creado `src/services/logger.ts` con `logError`, `logWarn`, `logInfo` y prefijo `[IVOO]`
  - **console.error → logError**: reemplazados en 6 hooks y 2 vistas (useProjectsWorkflows, usePolledFetch, useProjectsData, useAIConfig, MaterialConfigPanel, ProveedoresConfigPanel)
  - **PresidenciaDashboard**: `totalApprovedInvestment`, `totalReleasedFunds`, `pendingFunds`, `releasedPercent` envueltos en `useMemo` (fix bug: vars no retornadas del memo)
  - **aiEvaluationService.ts**: creado tipo `AIEvaluationProposalPayload` con `Pick` eliminando duplicación de campos
  - **LoginScreen**: componente `Spinner` inline eliminado, reemplazado por `<Loader2>` de lucide-react
  - **CSP**: agregado `report-uri /csp-violation` en `vite.config.ts`
  - **AIConfigPanel**: dividido en 7 sub-componentes en `src/views/AIConfigPanel/` (index, UsageDashboard, AIConfigTable, AIConfigFormModal, SyncBanner, KpiCard, MiniBarChart, ProviderIcon) — entry point original re-exporta desde index
  - **mobile/App.tsx**: refactorizado de 1165→228 líneas, dividido en types, api, styles, hooks, y 17 componentes
  - **App.tsx**: lazy loading (`React.lazy`) + `Suspense` con `RouteFallback` — revertido por bug de spinner en cada navegación
  - **SelectModal.tsx + Modal.tsx + Table.tsx**: tipos ampliados (`maxWidth` con `max-w-sm`/`max-w-md`, `value` acepta `boolean` en SelectModalOption, `rowKey` acepta `boolean`)
  - **MaterialConfigPanel.tsx**: `statusOptions` cambiado de `boolean` a `1`/`0` para compatibilidad con `SelectModalOption<boolean>`
  - **PropuestaMaterialesPublica.tsx + ProveedoresConfigPanel.tsx**: pre-existing errors resueltos (maxWidth type)
  - **tsc --noEmit**: 0 errores
- Por qué / causa raíz: Auditoría frontend halló 24 hallazgos; esta sesión resuelve los pendientes de clean code, refactor y errores de tipo preexistentes.
- Archivos:
  - `package.json`
  - `src/hooks/useAuth.ts`
  - `src/components/UI/Modal.tsx`
  - `src/components/ErrorBoundary.tsx` — [NUEVO]
  - `src/services/logger.ts` — [NUEVO]
  - `src/hooks/useProjectsWorkflows.ts`
  - `src/hooks/usePolledFetch.ts`
  - `src/hooks/useProjectsData.ts`
  - `src/hooks/useAIConfig.ts`
  - `src/views/PresidenciaDashboard.tsx`
  - `src/views/LoginScreen.tsx`
  - `src/services/aiEvaluationService.ts`
  - `vite.config.ts`
  - `src/views/AIConfigPanel.tsx` → `src/views/AIConfigPanel/index.tsx`
  - `src/views/AIConfigPanel/UsageDashboard.tsx` — [NUEVO]
  - `src/views/AIConfigPanel/AIConfigTable.tsx` — [NUEVO]
  - `src/views/AIConfigPanel/AIConfigFormModal.tsx` — [NUEVO]
  - `src/views/AIConfigPanel/SyncBanner.tsx` — [NUEVO]
  - `src/views/AIConfigPanel/KpiCard.tsx` — [NUEVO]
  - `src/views/AIConfigPanel/MiniBarChart.tsx` — [NUEVO]
  - `src/views/AIConfigPanel/ProviderIcon.tsx` — [NUEVO]
  - `src/views/MaterialConfigPanel.tsx`
  - `src/views/ProveedoresConfigPanel.tsx`
  - `mobile/App.tsx`
  - `mobile/types.ts` — [NUEVO]
  - `mobile/api.ts` — [NUEVO]
  - `mobile/styles.ts` — [NUEVO]
  - `mobile/hooks/useAuth.ts` — [NUEVO]
  - `mobile/components/` (17 archivos) — [NUEVOS]
  - `src/App.tsx`
  - `src/components/UI/SelectModal.tsx`
  - `src/components/UI/Table.tsx`
