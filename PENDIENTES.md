# PENDIENTES

Basado en la auditoría interna V1 del 24/07/2026 (`AUDITORIA_front_24_07_2026 / V1.md`).

---

## ✅ DONE — Items completados en sprints anteriores

1. ✅ **VERIFICAR** — Contenedores con extensión infinita sin límite.
2. ✅ **VERIFICAR** — Inputs numéricos no permitían borrar el 1.
3. ✅ **REALIZAR** — Concatenar observación general + notas de cada producto en solicitudes de contratistas para analistas.
4. ✅ **REALIZAR** — Mejorar cabecera del Sidebar.
5. ✅ **REALIZAR ESENCIAL** — Paginación/límite en tablas y selects con modal de tabla paginada.
6. ✅ **OPCIONAL** — Mejorar transición entre vistas (SPA UserFriendly).
7. ✅ **CRÍTICO** — Corregir todos los puntos de auditorías internas BACKEND y FRONTEND (C1–C4, G1–G5, M2–M4, M8, L1–L5).
8. ✅ **REALIZAR / EVALUAR** — Reestructuración COMPONENTES → SERVICIOS → VISTAS.
9. ✅ **CORREGIR** — Tokens JWT no expiraban.
10. ✅ **OPCIONAL / CRÍTICO** — Polling en toda la aplicación.
11. ✅ **REALIZAR** — Enrutador liviano, atómico y encapsulado.
12. ✅ **REALIZAR** — Mejorar seguridad y visualización del login.
13. ✅ **REALIZAR** — Skeleton loading al entrar desde login.
14. ✅ **REALIZAR** — Notificación 'Traer al portal' migrada a Toast.
15. ✅ **REALIZAR** — Modal de calificación de proveedores usa componente genérico.
16. ✅ **REALIZAR** — Mejorar estilos del enlace público.
17. ✅ **REALIZAR** — Seguridad reforzada en enlaces públicos.
18. ✅ **REALIZAR** — Navbar y topbar desaparecían entre 780px–870px.
19. ✅ **REALIZAR / URGENTE** — Búsqueda en tabla de auditoría + polling.
20. ✅ **REALIZAR** — Mejorar estilos visuales de todas las vistas.
21. ✅ **REALIZAR** — Card de peticiones con tamaño estático + overflow-y-auto.
22. ✅ **REALIZAR** — Ver detalles de petición en Infraestructura.
23. ✅ **URGENTE** — API key de IA filtrándose por errores Laravel + URL; provider Gemini no conectaba.
24. ✅ **REALIZAR** — Buscador de usuarios + edición (soft delete, cambio contraseña).
25. ✅ **REALIZAR** — Verificación de estado de polling.
26. ✅ **URGENTE** — Pestañas de configuración: Proveedores, Usuarios, Materiales, IA Models.
27. ✅ **REALIZAR** — Select con acumulación de registros → modal con tabla paginada + buscador.
28. ✅ **REALIZAR** — Token no expiraba con PC apagada (corregido con setInterval + visibilitychange).
29. ✅ **URGENTE** — Mejoras de seguridad y traza de error en IA providers.
30. ✅ **AUDITORIA** — Auditorías FRONTEND y BACKEND realizadas.
31. ✅ **AUDITORIA** — Auditoría completa enlace público (Backend + Frontend).
32. ✅ **ALTA — Tests para `useProjectsWorkflows`** — 12 handlers de negocio cubiertos, 379 tests totales.
33. ✅ **ALTA — Tests para `useProjectsData`** — Fetch, signature, polling y token lifecycle cubiertos.
34. ✅ **ALTA — Tests para vistas principales** — PresidenciaDashboard, InfraestructuraMantenimientoPanel, CierreObraPanel, ProcuraPanel, AnalistasPanel, FinanzasPanel.
35. ✅ **ALTA — Tests para hooks de dominio** — `useContractors`, `useCatalog`, `useProveedores`, `useUsuarios`, `useAIConfig`.
36. ✅ **ALTA — Tests para `App.tsx`** — Orquestación principal con router, lazy views y roles.
37. ✅ **ALTA — Tests para `AuthenticatedLayout`, `SidebarNav`, `Toast`** — Componentes de layout y UI.
38. ✅ **ALTA — Tests para `InteractiveOrganigrama`** — Renderizado y conteo de pendientes por rol.
39. ✅ **ALTA — Tests para hooks livianos** — `useOnlineStatus`, `useDebounce`, `useSafeMotion`.
40. ✅ **MEDIA — Extraer subcomponentes de `App.tsx`** — `PublicRouteShell`, `AccessDeniedView`, `AuthenticatedRoutes` separados. App.tsx 354→231 líneas.
41. ✅ **MEDIA — Unificar `KpiCard` duplicado** — Versión local de `PresidenciaDashboard` reemplazada por componente compartido `components/UI/KpiCard.tsx` con soporte de `children`, `variant` y `accent`.
42. ✅ **MEDIA — Crear componente `Spinner` compartido** — `components/UI/Spinner.tsx` centraliza el SVG. Eliminadas 7 duplicaciones (3 inline + 4 border-based).
43. ✅ **MEDIA — Extraer `useRateLimit` de `LoginScreen.tsx`** — Rate-limit con backoff exponencial movido a `hooks/useRateLimit.ts`. LoginScreen reducido ~23%.
44. ✅ **MEDIA — Hacer genérica `signatureOf()` en `useProjectsData`** — Ahora acepta `signatureFn` opcional; default preserva comportamiento original.
45. ✅ **MEDIA — Mover `getPendingCount()` a `utils/workflowStatus`** — Switch role→status extraído de `InteractiveOrganigrama`. Componente reducido ~25 líneas.
46. ✅ **MEDIA — Reemplazar timeout manual de successMsg por Toast** — `InfraestructuraMantenimientoPanel` usa `showToast` en lugar de estado local + setTimeout.
47. ✅ **MEDIA — Estandarizar botones en `AIConfigFormModal`** — Creado `components/UI/Button.tsx` con variantes primary/secondary/danger. AIConfigFormModal usa `<Button>`.

---

## 🔴 PENDIENTES — V2 Audit (24/07/2026)

Basado en la re-auditoría profunda V2 (`AUDITORIA_front_24_07_2026 // V2.md`). 106 hallazgos totales (4 CRITICAL, 11 HIGH, 43 MEDIUM, 48 LOW).

### 🔴 CRITICAL — Sprint Inmediato (Seguridad)

| # | Ítem | Detalle | Esfuerzo | Dependencia |
|---|------|---------|----------|-------------|
| 1 | ✅ **API Keys de IA expuestas en DOM** — Fix aplicado: backend envía `hasApiKey` + solo últimos 4 chars. Frontend actualizado. | `AiConfiguration.php`, `AIConfigTable.tsx`, `useAIConfig.ts` | 0.5 día | Backend |
| 2 | ✅ **Token JWT en localStorage sin HttpOnly** — Migrado a cookie httpOnly + Secure. Backend: TokenFromCookie middleware, login/logout setean/eliminan cookie. Frontend: useAuth.ts sin localStorage, api.ts con useCookieAuth. Mobile sigue con Bearer token. | 10 archivos (backend + frontend) | 2–3 días | Backend |
| 3 | ✅ **Contraseñas en texto plano en requests** — Forzar HTTPS + CSP upgrade-insecure-requests. Evaluar hashing cliente | `useAuth.ts`, `UsuariosPanel.tsx` | 0.5 día | Frontend |
| 4 | ✅ **URL producción hardcodeada en mobile** — Mover `API_BASE_URL` a variable de entorno `EXPO_PUBLIC_API_URL` | `mobile/config.ts` | 0.5 día | Mobile |

### 🟠 HIGH — Sprint 2 (Testing + Arquitectura)

| # | Ítem | Detalle | Esfuerzo |
|---|------|---------|----------|
| 6 | ✅ **Mocks globales en setup.ts** — Agregado mock de `matchMedia`, `IntersectionObserver`, `ResizeObserver` | `src/test/setup.ts` | 0.5 día |
| 8 | ✅ **Centralizar intervalos de polling** — Constante `DEFAULT_POLL_INTERVAL = 30_000` en `src/constants.ts`, usada como default en `usePolledFetch` (los 4 hooks ya no repiten el valor) | `src/constants.ts`, `usePolledFetch.ts` | 0.5 día |
| 9 | ✅ **Corregir fallback de rol** — `canAccess` ahora retorna `false` (`?? []`) en lugar de heredar `roleAccess["INFRAESTRUCTURA"]` para roles desconocidos | `useRouting.ts` | 0.1 día |
| 11 | ✅ **`usesCleartextTraffic: true`** — `app.json` → `app.config.js` dinámico: solo `true` si `EXPO_PUBLIC_API_URL` es `http://` (dev), `false` automáticamente con `https://` en producción | `mobile/app.config.js` | 0.1 día |
| 12 | ✅ **Corregir mobile registerPublicContractor** — Usa `requestJson` en vez de `fetch` directo. `rating` ya no se hardcodea (el backend ya defaultea a 4.0) | `mobile/App.tsx` | 0.5 día |

### 🟡 MEDIUM — Sprint 3 (Clean Code + Refactor)

| # | Ítem | Detalle | Esfuerzo |
|---|------|---------|----------|
| 13 | **Refactor God Components** — Extraer subcomponentes de UsuariosPanel (742→400), ProveedoresRegistrados (608→350), ProcuraPanel (555→350) | 3 vistas | 3 días |
| 14 | **Extraer lógica financiera** — Mover cálculos de PresidenciaDashboard a hook `useProjectFinancials` | `PresidenciaDashboard.tsx` | 1 día |
| 15 | **Migrar matriz de permisos a backend** — `roleAccess` servido desde `GET /api/auth/permissions` | `useRouting.ts` + Backend | 2 días |
| 16 | **Migrar modelos IA a endpoint** — `PROVIDER_MODELS` servido desde `GET /ai/config/models` | `useAIConfig.ts` + Backend | 1 día |
| 17 | **Migrar lista de roles a endpoint** — `ROLES` servido desde `GET /api/roles` | `UsuariosPanel.tsx` + Backend | 1 día |
| 18 | **Migrar colores de roles a backend/algoritmo** — `ROLE_COLORS` por hash o endpoint | `utils.ts` + Backend | 0.5 día |
| 19 | **Validación de contraseña en backend** — La validación de 8 caracteres mínimo debe replicarse en backend | `UsuariosPanel.tsx` + Backend | 0.5 día |
| 20 | **Sanitización XSS en proveedores** — Sanitizar `supplierName`/`supplierContact` con DOMPurify | `useProveedores.ts` | 0.5 día |
| 21 | **CSP: remover `http://localhost:*` en producción** — Condicional por modo dev/prod | `vite.config.ts` | 0.2 día |
| 22 | **IDs secuenciales → UUIDs** — Migrar PKs VARCHAR a UUIDs en BD + backend | `database.sql` + Backend | 1 día |
| 23 | **Timezone BD a UTC** — Cambiar `SET time_zone = "-04:00"` a `"+00:00"` | `database.sql` | 0.2 día |
| 24 | **Inconsistencia BD/docs** — Agregar columnas `user_id` y `user_name_snapshot` a `audit_logs` en SQL | `database.sql` | 0.3 día |
| 25 | **Columnas Table inline sin memo** — Mover definiciones de columnas fuera del componente o envolver en `useMemo` | ProveedoresRegistrados, PresidenciaDashboard, AIConfigTable | 0.5 día |
| 26 | **Key prop con índice en lugar de ID** — Cambiar `rowKey={(_item, idx) => idx}` por `rowKey={(item) => item.id}` | `ProveedoresRegistrados.tsx` | 0.1 día |
| 27 | **Doble fetch en useAIConfig** — Unificar dos useEffect que llaman loadConfigs() | `useAIConfig.ts` | 0.3 día |
| 28 | **Exponer setters directos desde hook** — `setSyncMessage` → `dismissSyncMessage()` | `useAIConfig.ts` | 0.2 día |
| 29 | **Copiar auditoría V1 a carpeta sin espacio** — Renombrar `AUDITORIA_front_24_07_2026 /` → `AUDITORIA_front_24_07_2026` | Carperta | 0.1 día |

### 🟢 BAJA — Sprint 4 (Mejoras + Documentación)

| # | Ítem | Detalle | Esfuerzo |
|---|------|---------|----------|
| 30 | **Reescribir README.md** — Describir proyecto real, stack, instalación, testing, monorepo | `README.md` | 0.5 día |
| 31 | **Actualizar FLUJO_SISTEMA.md** — Agregar módulo IA, Actualizar a V2.0, corregir fecha | `FLUJO_SISTEMA.md` | 1 día |
| 32 | **Actualizar AUDITORIA V1.md** — Testing: 8→27 suites, Cobertura: 35%→90% | `AUDITORIA_front_24_07_2026 / V1.md` | 0.5 día |
| 33 | **Subir thresholds coverage a 85%** — Subir de 70% a 85% en `vite.config.ts` | `vite.config.ts` | 0.1 día |
| 34 | **Tests para useRateLimit, logger, aiEvaluationService** — Completar brechas de testing | 3 archivos | 1 día |
| 35 | **Migrar a CSS modules para remover `'unsafe-inline'` de CSP** | Todos los componentes | 2 días |
| 36 | **Agregar optimizaciones de rendimiento** — useMemo en filtros, memo en SkeletonLoader, eliminar content-visibility innecesario | Varios archivos | 0.5 día |
| 37 | **DonutChart responsive** — Reemplazar dimensiones absolutas por relativas | `PresidenciaDashboard.tsx` | 0.3 día |
| 38 | **Agregar meta tags SEO en index.html** — description, OG tags, theme-color | `index.html` | 0.2 día |

---

## 🔴 PENDIENTES — V1 Audit (24/07/2026)

### 🟢 BAJA — Mejoras y monitoreo

| # | Ítem | Detalle | Esfuerzo |
|---|------|---------|----------|
| 17 | **Logger en producción expone `console.error/warn/info`** — Implementar servicio externo (Sentry/Logtail) y desactivar console en producción | `src/services/logger.ts` | 1 día |
| 18 | **Fallback a datos locales sin autenticación (`INITIAL_PROJECTS`)** — Solo usar fallbacks en desarrollo o mostrar empty state en producción | `src/hooks/useProjectsData.ts` | 0.5 día |
| 20 | **Monitorear versión React 19** — Riesgo bajo de compatibilidad (versión recién estable) | `package.json` | — |
| 21 | **Monitorear dependencia `motion`** — Fork de framer-motion; verificar actualizaciones y compatibilidad | `package.json` | — |

---

## 🔄 PENDIENTES ANTERIORES (no cubiertos por V1/V2)

1. **REALIZAR** — Limpiar el bundle y eliminar dependencias inutilizadas.
2. **REALIZAR** — Reevaluar expiración de token con PC apagada (verificar fix previo).
3. **REALIZAR** — Entrar ROL x ROL y verificar PROCESOS Y VISTAS.
4. **REALIZAR** — Eliminar del modal de Material del Catalogo la columna 'Valor' o arreglarla para que muestre su valor correctamente.
5. **REALIZAR** — Existe un problema al seleccionar el proveedor y tratar de enviarle el link, El mismo abre dos modales y el select No permite seleccionar la obra.
---

## 🧪 PRUEBAS PENDIENTES

1. Probar todas las funciones y rutas después de normalización de conexión a la API.
2. Probar expiración y funcionalidad de tokens Sanctum.
3. Probar polling en todo el sistema.
4. Probar seguridad entre roles y CRUD en vistas de Configuración.
5. Probar sistema de restablecimiento de contraseñas.
6. Probar sistema de ModalSelect.
7. Probar entorno nativo mobile de la App.

---

## ✅ AUDITORÍAS REALIZADAS

1. ✅ **V1 — Auditoría interna Frontend** (23/07/2026) — `AUDITORIA_INTERNA_FRONT_2026-07-23.md`
2. ✅ **V1 — Auditoría Frontend** (24/07/2026) — `AUDITORIA_front_24_07_2026 / V1.md`
3. ✅ **V2 — Re-auditoría profunda Frontend** (24/07/2026) — `AUDITORIA_front_24_07_2026 // V2.md`

## 📋 PRÓXIMA AUDITORÍA

1. Realizar auditoría V3 después de completar Sprints 1-3 (todos los items CRITICAL + HIGH).
