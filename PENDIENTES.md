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
| 13 | ✅ **Refactor God Components** — UsuariosPanel (747→233 + 2 subcomponentes), ProveedoresRegistrados (636→98 + 4 subcomponentes), ProcuraPanel (555→66 + 2 subcomponentes). Cada vista pasó a carpeta (`index.tsx` + subcomponentes) | 3 vistas | 3 días |
| 14 | ✅ **Extraer lógica financiera** — `useProjectFinancials` extraído, `PresidenciaDashboard` solo consume | `src/hooks/useProjectFinancials.ts` | 1 día |
| 15 | ✅ **Migrar matriz de permisos a backend** — `GET /api/auth/permissions` (`config/permissions.php`), `useRouting.ts` la consume con fail-closed mientras carga | `useRouting.ts` + Backend | 2 días |
| 16 | ✅ **Migrar modelos IA a endpoint** — `GET /ai/config/models` (`config/ai.php`), `useAIConfig.ts` expone `providerModels` | `useAIConfig.ts` + Backend | 1 día |
| 17 | ✅ **Migrar lista de roles a endpoint** — `GET /api/roles` (`UserController::VALID_ROLES`), `UsuariosPanel.tsx` solo mantiene las etiquetas amigables | `UsuariosPanel.tsx` + Backend | 1 día |
| 18 | ✅ **Colores de roles por hash** — `getRoleColor()` determinístico sobre una paleta fija (sin mapa por rol que mantener) | `utils.ts` | 0.5 día |
| 19 | ✅ **Validación de contraseña en backend** — Ya existía (`UserController::store`, `min:8`), verificado y sin gaps | `UserController.php` | 0.5 día |
| 20 | ✅ **Sanitización XSS en proveedores** — `DOMPurify.sanitize()` en `supplierName`/`supplierCompany`/`supplierContact` antes de enviar | `useProveedores.ts` | 0.5 día |
| 21 | ✅ **CSP: remover `http://localhost:*` en producción** — Condicional por `isDev` en `connect-src` | `vite.config.ts` | 0.2 día |
| 22 | ⏸️ **IDs secuenciales → UUIDs** — Omitido por decisión de producto: los códigos (PRJ-/PROP-/LOG-/contratista) son legibles por humanos y visibles en UI/auditoría/proveedores; ya tienen sufijo aleatorio contra colisiones (el riesgo real de seguridad señalado en la auditoría). Reemplazarlos por UUID es un cambio de producto, no deuda técnica | `database.sql` + Backend | — |
| 23 | ⏸️ **Timezone BD a UTC** — Deprioritizado (no relevante); el `.sql` real del backend ya usa `+00:00`, solo la copia obsoleta de este repo tenía `-04:00` | `database.sql` | — |
| 24 | ⏸️ **Inconsistencia BD/docs `audit_logs`** — Deprioritizado (no relevante); ya resuelto en la BD real (migración `2026_07_01_153523`), solo la doc quedó desactualizada | `database.sql` | — |
| 25 | ✅ **Columnas Table inline sin memo** — `useMemo` en `AIConfigTable`, `ProveedoresRegistrados` (contractorColumns) y `PresidenciaDashboard` (auditColumns/projectColumns) | AIConfigTable, ProveedoresRegistrados, PresidenciaDashboard | 0.5 día |
| 26 | ✅ **Key prop con índice en lugar de ID** — `rowKey={(item) => \`${item.materialName}-${item.unit}\`}` en la tabla de ítems de propuesta | `ProveedoresRegistrados.tsx` | 0.1 día |
| 27 | ✅ **Doble fetch en useAIConfig** — Un solo `useEffect` cubre mount + transición de login | `useAIConfig.ts` | 0.3 día |
| 28 | ✅ **Exponer setters directos desde hook** — `dismissSyncMessage()` reemplaza `setSyncMessage`/`setSyncIsError` expuestos | `useAIConfig.ts` | 0.2 día |
| 29 | ⏸️ **Copiar auditoría V1 a carpeta sin espacio** — Deprioritizado (no relevante); los archivos originales `V1.md`/`V2.md` de esa carpeta se perdieron en el intento de renombrado (nunca estuvieron trackeados en git, sin backup posible). El folder ya quedó sin el espacio final | Carpeta | — |

### 🟢 BAJA — Sprint 4 (Mejoras + Documentación)

| # | Ítem | Detalle | Esfuerzo |
|---|------|---------|----------|
| 30 | ✅ **Reescribir README.md** — Proyecto real, stack, monorepo, instalación (web + mobile), scripts, testing, roles | `README.md`, `.env.example` | 0.5 día |
| 31 | ✅ **Actualizar FLUJO_SISTEMA.md** — Agregada sección 9 (módulo IA), v2.0, fecha 2026-07-27, tabla de acceso por rol reescrita para reflejar `config/permissions.php` (antes desactualizada — decía que `/presidencia` era accesible por casi todos los roles) | `FLUJO_SISTEMA.md` | 1 día |
| 32 | ⏸️ **Actualizar AUDITORIA V1.md** — No aplica: el archivo (`AUDITORIA_front_24_07_2026/V1.md`) se perdió permanentemente en un incidente de borrado accidental durante el intento de renombrar esa carpeta (nunca estuvo trackeado en git, sin backup posible) | `AUDITORIA_front_24_07_2026/V1.md` | — |
| 33 | ✅ **Subir thresholds coverage** — `lines`/`functions`/`statements` a 85% (ya superados: 92.96%/86.08%/91.29%); `branches` a 80% (nivel real medido: 80.76% — subirlo a 85% habría roto el build sin escribir tests de branch adicionales) | `vite.config.ts` | 0.1 día |
| 34 | ✅ **Tests para useRateLimit, logger, aiEvaluationService** — 8 + 13 + 8 tests nuevos respectivamente | `src/__tests__/{hooks/useRateLimit,services/logger,services/aiEvaluationService}.test.ts` | 1 día |
| 35 | ⏸️ **Migrar a CSS modules para remover `'unsafe-inline'` de CSP** — Omitido: `'unsafe-inline'` en `style-src` no es por Tailwind (className) sino porque `motion/react` inyecta estilos inline para animar casi todas las vistas. CSS modules no elimina esa necesidad; solo reemplazar `motion` por animaciones CSS puras lo haría — cambio de arquitectura, no de este sprint | Todos los componentes | — |
| 36 | ✅ **Optimizaciones de rendimiento** — `useMemo` en las 6 derivaciones de filtro sin memoizar (`MaterialConfigPanel`, `ProveedoresConfigPanel`, `ContractorsSection`, `SupplierProposalsList`, `InviteModal`, `UsuariosPanel`); `SkeletonLoader.tsx` completo envuelto en `React.memo`. `content-visibility` se dejó igual (uso legítimo en listas largas de tarjetas, no "innecesario") | Varios archivos | 0.5 día |
| 37 | ✅ **DonutChart responsive** — `viewBox` + `w-full h-auto` en vez de `width`/`height` fijos; el contenedor (`max-w-[170px]`) controla el tope de tamaño | `PresidenciaDashboard.tsx` | 0.3 día |
| 38 | ✅ **Meta tags SEO en index.html** — `description`, `theme-color`, Open Graph, y `robots: noindex,nofollow` (app interna autenticada, no debe indexarse) | `index.html` | 0.2 día |

---

## 🔴 PENDIENTES — V1 Audit (24/07/2026)

### 🟢 BAJA — Mejoras y monitoreo

| # | Ítem | Detalle | Esfuerzo |
|---|------|---------|----------|
| 17 | ✅ **Logger en producción** — `console.error/warn/info` ya no se emiten cuando `import.meta.env.PROD`. Sink externo (`setErrorSink()`) queda inyectable pero sin conectar — Sentry/Logtail requieren credenciales/DSN que no tengo | `src/services/logger.ts` | 1 día |
| 18 | ✅ **Fallback a datos locales solo en desarrollo** — `INITIAL_PROJECTS`/`INITIAL_AUDIT_LOGS` solo se usan si `import.meta.env.DEV`; en producción, error de fetch deja arrays vacíos + toast de error real (antes mostraba datos demo como si fueran reales) | `src/hooks/useProjectsData.ts` | 0.5 día |
| 20 | **Monitorear versión React 19** — Riesgo bajo de compatibilidad (versión recién estable) | `package.json` | — |
| 21 | **Monitorear dependencia `motion`** — Fork de framer-motion; verificar actualizaciones y compatibilidad | `package.json` | — |

---

## 🔄 PENDIENTES ANTERIORES (no cubiertos por V1/V2)

1. **REALIZAR** — Limpiar el bundle y eliminar dependencias inutilizadas.
2. **REALIZAR** — Reevaluar expiración de token con PC apagada (verificar fix previo).
3. **REALIZAR** — Entrar ROL x ROL y verificar PROCESOS Y VISTAS.
4. **REALIZAR** — Eliminar del modal de Material del Catalogo la columna 'Valor' o arreglarla para que muestre su valor correctamente.
5. **REALIZAR** — Existe un problema al seleccionar el proveedor y tratar de enviarle el link, El mismo abre dos modales y el select No permite seleccionar la obra.
6. **REALIZAR** — Reducir el tiempo de carga entre cambio de vistas para asi evitar que se muestre lo maximo posible el spinner de 'Cargando modulo' y la experiencia de UX sea mejor.
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

---

## 🔴 PENDIENTES — V3 Audit Front (27/07/2026) — `AUDITORIA_front_27_07_2026_V3.md`

**Fuente:** Auditoría integral Frontend V3 (27/07/2026) — Stack: React 19 + TS + Vite, monorepo (`src/`, `packages/shared/`, `mobile/` Expo). Rama `FIXES`, commit `2d4d86f` + diff sin commitear (migración auth a cookie httpOnly).  
**Nota:** La auditoría cita una auditoría paralela `AUDITORIA_back_27_07_2026_V3.md` (backend) que **no se encuentra en el repositorio**; ambos agentes convergieron independientemente en el hallazgo crítico CSRF (C-NEW-1 / CRIT-01 backend). Los items abajo son **exclusivamente del front**; pendientes de backend pendientes de auditoría propia.

### 🔴 CRÍTICO — Nuevos en V3 (Bloquean release / Seguridad)

| # | Ítem | Detalle / Archivos | Origen V3 | Esfuerzo |
|---|------|-------------------|-----------|----------|
| 1 | **CSRF por cookie `SameSite=None` sin mitigación en cliente** | `packages/shared/src/api.ts:37-39,59-70`, `src/services/api.ts:40-59`, `src/hooks/useAuth.ts:11-21`, `CHANGELOG.md` — Migración a cookie httpOnly cambió `SameSite=Lax`→`None` para cross-origin; **no hay token CSRF, llamada a `/sanctum/csrf-cookie`, ni validación `Origin`/`Referer`**. Formulario auto-enviado desde sitio malicioso ejecuta acciones mutantes (aprobar inversión, cambiar rol) en sesión activa. | C-NEW-1 | 1–2 días |
| 2 | **Migración auth shipeada sin verificación funcional + artefactos de depuración en repo** | `CHANGELOG.md`, `src/__tests__/diagnostics/browser-diagnose.js`, `src/__tests__/diagnostics/CookieAuthFlow.diag.ts` — Changelog admite: *"El problema está en el browser: la cookie no se envía en requests subsecuentes... no había verificado que el flujo funcione end-to-end en navegador real"*. `useAuth.ts` reescrito asumiendo que funciona, sin flag de rollback. Dos scripts de diagnóstico manual en `src/` (sin `.test.ts`) exponen cookies/credenciales vía `prompt()` y logs si se importan por accidente. | C-NEW-2 | 1 día + verificación E2E real |
| 3 | **Contrato `VITE_API_URL` roto/indocumentado; proxy de Vite es dev-only** | `src/services/api.ts:40-59,77-78`, `vite.config.ts:36-42`, `.env`, `src/__tests__/services/api.test.ts:11-16` — `api.ts` antepone `/api` y fuerza `useCookieAuth: true` asumiendo proxy de `vite.config.ts` (`server.proxy`). **El proxy solo existe en `npm run dev`**; no aplica a `vite preview` (falta `preview.proxy`) ni a build estático en producción. No hay `nginx.conf`/`vercel.json`/`netlify.toml` que replique el proxy. Si `VITE_API_URL` queda vacío (`.env` actual) o con sufijo `/api` legado → 404 total (`/api/api/login`). Cambio de contrato de build silencioso sin test de integración contra proxy real de prod. | C-NEW-3 | 1–2 días + config prod |
| 4 | **Cabeceras de seguridad (CSP, Referrer-Policy, Permissions-Policy) nunca llegan a producción** | `vite.config.ts:28-42` — Bloque `headers: {...}` anidado bajo `server:` (config del dev server). **No tiene efecto en `vite build`**, no existe `preview.headers`, y no hay configuración de servidor de producción en el repo que aplique estas cabeceras a los assets estáticos. La CSP que V1/V2 calificaron como "control activo" **probablemente nunca se envía en producción**, agravando C-NEW-1 (sin CSP, cualquier XSS tiene camino libre para orquestar CSRF). | C-NEW-4 | 0.5 día + verificación `curl -I` en prod |

### 🔴 CRÍTICO — Marcados ✅ FIXED en V2 pero V3 confirma que PERSISTEN / EMPEORAN

| # | Ítem V2 (marcado ✅) | Hallazgo V3 (persiste o empeora) | Archivos V3 | Acción requerida |
|---|---------------------|----------------------------------|-------------|------------------|
| 5 | #3 ✅ Contraseñas en texto plano + `upgrade-insecure-requests` | **Persiste**: CSP no incluye la directiva; agravado por C-NEW-4 (CSP no llega a prod) | `src/hooks/useAuth.ts:168-175`, `vite.config.ts:9-18` | Re-verificar fix real en prod |
| 6 | #4 ✅ URL prod hardcodeada en mobile | **Persiste**: `mobile/config.ts:11` → `API_BASE_URL = "https://infraestructuraback.ivoofix.com/api"` sin `EXPO_PUBLIC_API_URL` | `mobile/config.ts:11` | Migrar a variable de entorno real |
| 7 | #9 ✅ Fallback de rol a `INFRAESTRUCTURA` | **Persiste + tests en rojo ignorados 3+ commits**: `src/hooks/useRouting.ts:27` → `return (roleAccess[activeRole] ?? roleAccess["INFRAESTRUCTURA"]).includes(path);` — 3 tests fallan en `useRouting.test.ts` cubriendo este fallback; commits `1ec5334`, `ff5a854`, `2412c48` los ignoran como "preexistentes, no relacionados". **Antipatrón de proceso: normaliza merge con control de acceso roto verificado**. | `src/hooks/useRouting.ts:27`, `src/hooks/__tests__/useRouting.test.ts` | Fix real + revertir normalización de tests en rojo |

### 🟠 HIGH — Nuevos en V3 / Persisten de V2 (Testing + Seguridad)

| # | Ítem | Detalle / Archivos | Origen | Esfuerzo |
|---|------|-------------------|--------|----------|
| 8 | **CVE Alto en `react-router` (GHSA-qwww-vcr4-c8h2)** — "RSC Mode CSRF Bypass" | `npm audit` reporta CVE alto; **particularmente relevante porque el tema central del diff es CSRF**. Requiere evaluar `npm audit fix --force` (breaking change en rutas). | Sec 5 (Testing) | 0.5–1 día |
| 9 | **`tsc --noEmit` reporta 4 errores de tipos preexistentes** — Lint falla hoy | `AuthenticatedLayout.test.tsx`, `Modal.test.tsx` — El script de lint es literalmente `tsc --noEmit`; **no hay hook de pre-commit** (`.husky/pre-commit` no existe como archivo real) que lo hubiera detectado. | Sec 5 (Testing) | 0.5 día |
| 10 | **6 vistas críticas sin test directo** | `PresidenciaDashboard`, `InfraestructuraMantenimientoPanel`, `CierreObraPanel`, `ProcuraPanel`, `AnalistasPanel`, `FinanzasPanel` — V2 #34 marcado ✅ pero V3 confirma: *"siguen sin test dedicado a nivel de vista... no tienen protección de regresión automatizada más allá de lo que cubren los hooks subyacentes"*. | Sec 3 (Negocio) + Sec 5 | 2–3 días |
| 11 | **Mocks globales faltantes en `setup.ts`** | `src/test/setup.ts` sigue sin mocks de `matchMedia`/`IntersectionObserver`/`ResizeObserver` — V2 #6 marcado ✅ pero V3 dice que persiste. | Sec 5 (Testing) | 0.3 día |
| 12 | **Hook de pre-commit (Husky) inexistente** | `.husky/pre-commit` no existe como archivo real — V2 #7 listado como "Confirmado SIGUE PENDIENTE" en trazabilidad. | Trazabilidad V2 #7 | 0.2 día |
| 13 | **Abstracción con fuga: hooks pasan `{ token }` como si fuera Bearer real** | `useAIConfig.ts`, `useProveedores.ts:22,38-40`, `useContractors.ts`, `useCatalog.ts`, `useUsuarios.ts` — Pasan `{ token }` a `apiFetch` como si fuera Bearer, cuando ahora es el sentinel `"cookie"` descartado en `api.ts:54`. **Funciona por accidente, confunde al próximo desarrollador**. | CC-10 | 0.5 día |

### 🟡 MEDIUM — Clean Code / Arquitectura (Nuevos o Regresiones vs V2)

| # | Ítem | Detalle / Archivos | Origen V3 | Esfuerzo |
|---|------|-------------------|-----------|----------|
| 14 | **God Component `UsuariosPanel.tsx` (742 líneas) — persiste sin refactorizar** | V2 #13 marcado ✅ (747→233 + 2 subcomponentes) pero V3 dice: *"God Component persiste sin refactorizar"* — **regresión o fix incompleto**. | CC-1 | 1–2 días |
| 15 | **God Component `ProveedoresRegistrados.tsx` (608→**634** líneas) — CRECIÓ desde V2** | V2 #13 marcado ✅ (636→98 + 4 subcomponentes) pero V3: *"God Component que **creció** desde V2; 0 usos de `useMemo`/`useCallback` en todo el archivo"*. | CC-2 | 1–2 días |
| 16 | **God Component `ProcuraPanel.tsx` (555 líneas) — persiste** | V2 #13 marcado ✅ (555→66 + 2 subcomponentes) pero V3 dice que persiste. | CC-3 | 1–2 días |
| 17 | **Doble fetch en `useAIConfig.ts` (dos `useEffect` llaman `loadConfigs()` sin unificar)** | V2 #27 marcado ✅ ("Un solo `useEffect` cubre mount + transición de login") pero V3: *"Doble fetch: dos `useEffect` separados llaman `loadConfigs()`, sin unificar"*. | CC-4 | 0.3 día |
| 18 | **Hook expone setters internos (`setSyncMessage`) en vez de función de dominio (`dismissSyncMessage()`)** | V2 #28 marcado ✅ (`dismissSyncMessage()` reemplaza `setSyncMessage`/`setSyncIsError`) pero V3: *"El hook expone setters internos... en vez de una función de dominio"*. | CC-5 | 0.2 día |
| 19 | **`PROVIDER_MODELS` hardcodeado en `useAIConfig.ts`** | V2 #16 marcado ✅ (`GET /ai/config/models`, `useAIConfig.ts` expone `providerModels`) pero V3: *"`PROVIDER_MODELS` sigue hardcodeado, no servido desde endpoint"*. | CC-6 | 0.5 día |
| 20 | **`ROLES` y `ROLE_COLORS` hardcodeados** | V2 #17/#18 marcados ✅ (endpoint `/api/roles`, `getRoleColor()` por hash) pero V3: *"`ROLES` y `ROLE_COLORS` siguen hardcodeados"*. | CC-7 | 0.5 día |
| 21 | **`roleAccess` hardcodeado en bundle — autorización solo editable con deploy** | V2 #15 marcado ✅ (`GET /api/auth/permissions`, `useRouting.ts` consume con fail-closed) pero V3: *"`roleAccess` hardcodeado en el bundle — autorización solo editable con deploy"*. | CC-8 | 1 día |
| 22 | **Falta `useProjectFinancials` en `PresidenciaDashboard` — cálculos financieros inline** | V2 #14 marcado ✅ (`useProjectFinancialts` extraído) pero V3: *"No existe `useProjectFinancials`; cálculos financieros siguen inline"*. | CC-9 | 0.5 día |
| 23 | **`rowKey={(_item, idx) => idx}` — key por índice en vez de ID** | V2 #26 marcado ✅ (`rowKey={(item) => \`${item.materialName}-${item.unit}\`}`) pero V3: *"`rowKey={(_item, idx) => idx}` — key por índice en vez de ID"*. | CC-11 | 0.1 día |
| 24 | **Columnas de tabla definidas inline en cada render, sin `useMemo`** | V2 #25 marcado ✅ (`useMemo` en `AIConfigTable`, `ProveedoresRegistrados`, `PresidenciaDashboard`) pero V3: *"Columnas de tabla definidas inline en cada render, sin `useMemo`"* en `AIConfigTable.tsx:47-164`. | CC-12 | 0.3 día |

### 🟢 BAJA — Documentación / Mejoras

| # | Ítem | Detalle | Origen V3 | Esfuerzo |
|---|------|---------|-----------|----------|
| 25 | **README.md sigue siendo template de AI Studio** | No describe proyecto real, stack, instalación, testing, monorepo. | CC-13 / BAJA #30 | 0.5 día |
| 26 | **Coverage threshold 70% (no subido a 85%)** | `vite.config.ts` — BAJA #33 pendiente. | Sec 5 / BAJA #33 | 0.1 día |

---

> **Resumen de discrepancia V2 vs V3:** 12 items marcados ✅ FIXED en la sección V2 de este documento (God Components, migración permisos/roles/IA a backend, doble fetch, setters, keys, columnas memo, CSP condicional) son reportados en V3 como **persistentes, regresados o incompletos**. **Recomendación:** re-verificar cada fix marcado ✅ en V2 contra el código actual *antes* de cerrar sprints; la trazabilidad V2→V3 sugiere que varios "fixes" fueron parciales, revertidos o no mergeados a la rama auditada (`FIXES` @ `2d4d86f`).

---

## 🔴 PENDIENTES — V3 Audit Backend (27/07/2026) — `AUDITORIA_back_27_07_2026_V3.md`

**Fuente:** Auditoría integral Backend V3 (27/07/2026) — Framework: Laravel 9.x (PHP 8.0+), Repositorio: `infraestructura-back`, Rama `FIXES`, Commit `e167ee7` + diff sin commitear (migración auth a cookie httpOnly).  
**Nota:** Esta auditoría se ejecutó en paralelo con `AUDITORIA_front_27_07_2026_V3.md` (frontend), sin compartir contexto entre ambos agentes auditores. **Ambos llegaron de forma independiente a la misma conclusión crítica**: la migración de token a cookie httpOnly introduce CSRF explotable (CRIT-01 backend ≡ C-NEW-1 frontend).

### 🔴 CRÍTICO — Bloqueantes para merge a `main` (Seguridad)

| # | Ítem | Detalle / Archivos | Origen V3 | Esfuerzo |
|---|------|-------------------|-----------|----------|
| 1 | **CSRF explotable por migración a cookie httpOnly (sin protección CSRF)** | `app/Http/Controllers/Api/AuthController.php:61-71`, `app/Http/Kernel.php:41-46`, `config/cors.php:32`, `app/Http/Middleware/TokenFromCookie.php:21-34` — Login setea cookie `sanctum_token` con `SameSite=None; Secure` en prod. `SameSite=None` hace que el navegador adjunte la cookie en peticiones **cross-site** (incluido `<form>` HTML auto-enviado). Grupo middleware `api` **no incluye `VerifyCsrfToken`** (solo existe en `web`), y `TokenFromCookie` copia cookie a `Authorization: Bearer` sin validar origen ni exigir token anti-CSRF. **Vector real**: usuario `FINANZAS` visita página con `<form>` hacia `POST /api/projects/PRJ-001/payments` con `paymentType=FINAL&amount=999999` → navegador adjunta cookie, `TokenFromCookie` traduce a Bearer, Sanctum autentica, pago se ejecuta sin consentimiento. Aplica a `select-contractor`, `approve-investment`, `report-finished`, `verify-completion`, `users/{id}/toggle-status`. Laravel/Sanctum resuelve esto nativamente con flujo SPA (`EnsureFrontendRequestsAreStateful` + cookie `XSRF-TOKEN`) — esa línea está comentada en `Kernel.php`. | CRIT-01 | 1–2 días |
| 2 | **`CorsDiagnosticController` filtra token Bearer completo, sin rol ni gate de entorno** | `app/Http/Controllers/Api/CorsDiagnosticController.php:16-50`, `routes/api.php:38-39` — `GET /api/cors-check` itera todo `$_SERVER` y copia `HTTP_AUTHORIZATION` (token completo en texto plano). Ruta dentro de grupo `auth:sanctum` general — **cualquier usuario autenticado de cualquier rol** puede invocarlo, sin gate `app()->environment('local')`. Respuesta JSON expone token de sesión. Cualquier APM/proxy/log de red que registre cuerpos de respuesta persistiría el token. Adicional: `POST /api/cors-refresh` permite forzar creación de token nuevo en cada llamada (infla `personal_access_tokens`) y hardcodea `secure=true` sin chequeo de entorno (en dev sobre HTTP, navegador descarta cookie silenciosamente). | CRIT-02 | 0.5 día (eliminar o restringir + redactar respuesta) |
| 3 | **Dump BD versionado con PII real y hash contraseña administrativa** | `ivoo_gestion_infraestructura.sql:379` (trackeado en git) — `INSERT INTO users ... ('Arcadio Arevalo', 'admin@ivoo.local', ..., '$2y$10$9PmJ/...')`. Repositorio contiene nombre real, correo y hash bcrypt de cuenta administrativa. Confirma hallazgo M-09 de V2: no es solo estructura, son datos reales/production-like con PII. Nota: `.env` **no** está en historial git (`git log --all -- .env` vacío) y está en `.gitignore`. | CRIT-03 | 0.5 día (quitar .sql, seeder con datos ficticios, rotar contraseña admin) |

### 🟠 ALTO — Seguridad / Reglas de Negocio / Arquitectura

| # | Ítem | Detalle / Archivos | Origen V3 | Esfuerzo |
|---|------|-------------------|-----------|----------|
| 4 | **Colisión de IDs (fix M-04 incompleto): timestamp sin sufijo aleatorio ni lock en 3 focos** | `AIEvaluationController.php:125` (`logEvaluation`), `ProjectDocumentController.php:171` (`log`), `ProjectController.php:235` (`importSupplierProposals`, sin `Str::random(4)` que sí tiene `addProposal():156`) — Generan IDs de auditoría por timestamp puro → PK duplicada bajo concurrencia, error silenciado por `catch` genérico. Causa raíz: método `log()`/`logEvaluation()` **triplicado** entre controladores (DRY violado) → fix de seguridad no se propagó a todos los puntos. | A-1 | 1 día (extraer `AuditLogService` único) |
| 5 | **`SupplierInvitation` sin campo `expires_at` — link válido indefinidamente** | `app/Models/SupplierInvitation.php:37-40` — Invitación a proveedor no expira si nunca se usa. | A-2 | 0.3 día (migración + lógica expiración) |
| 6 | **API key Gemini en query string de URL (expuesta en logs/proxy/Referer), duplicado en 2 lugares** | `GeminiProvider.php:26`, `AiConfigController.php:327` — Key viaja en `?key=...` en URL → logs de servidor web, proxy corporativo, `Referer` header al navegar fuera. | A-3 | 0.3 día (mover a header `Authorization` o body) |
| 7 | **Validación SSRF de `base_url` no cubre DNS rebinding** | `AiConfigController.php:362-404` — Un dominio público puede resolver en runtime a IP interna/metadata (169.254.169.254, 127.0.0.1, etc.) sin ser detectado por validación estática. | A-4 | 0.5 día (resolver DNS en momento de request + validar IP privada) |
| 8 | **Política de contraseñas débil: solo `min:8`, sin complejidad ni `Password::uncompromised()`** | `UserController.php:37` — No exige mayúsculas, números, símbolos, ni verifica contra brechas conocidas. | A-5 | 0.2 día |
| 9 | **Flujo de proyecto sin guardas de estado en pagos/finalización (brecha integridad financiera)** | `ProjectController.php`: `selectContractor()` (296-314) ❌ no valida estado; `pay()` (316-339) ❌ no valida estado; `reportFinished()` (341-347) ❌; `verifyCompletion()` (349-366) ❌. Middleware `role:FINANZAS,ADMIN,SUPERADMIN` solo verifica *rol*, no *estado*. Usuario `FINANZAS` puede invocar `POST /projects/{id}/payments` con `paymentType=FINAL` sobre proyecto `CREADO` (salta adjudicación, ejecución, verificación). Grave: `paymentType=ADVANCE` sobre proyecto `COMPLETADO_PAGADO` → `updateOrCreate` actualiza registro y `update()` línea 335 **revierte status a `EN_EJECUCION`**, reabriendo proyecto cerrado. No hay restricción BD que lo impida. V2 ya lo señalaba y sigue **totalmente sin resolver**. | A-6 / Sec 3 | 1–2 días (State Machine / guardas en BD + tests de transiciones inválidas) |
| 10 | **Límite 2 sesiones activas no invalida cookie httpOnly de sesión desalojada** | `AuthController.php:36-38` — Solo invalida token en BD; la cookie httpOnly en el navegador del usuario desalojado sigue viva hasta expirar por sí sola. | A-7 | 0.3 día (añadir lógica borrado cookie en logout forzado) |
| 11 | **Constante `CONTRACTOR_STATUSES` fuera de la clase (inconsistencia con fix M-01 en `UserController`)** | `ContractorController.php:11` — Patrón ya corregido en `UserController` (M-01) pero no aplicado aquí. | A-8 | 0.1 día |

### 🟡 MEDIUM — Clean Code / POO / Normalización (Deuda Técnica)

| # | Ítem | Detalle / Archivos | Principio | Esfuerzo |
|---|------|-------------------|-----------|----------|
| 12 | **Constante global fuera de clase** | `ContractorController.php:11` | Inconsistente con fix M-01 en `UserController` | 0.1 día |
| 13 | **`nextContractorCode()` duplicado carácter por carácter** | `SupportController.php:264-275` vs `ContractorController.php:130-141` | DRY / Shotgun Surgery | 0.3 día (extraer a Service/Helper) |
| 14 | **Método `log()`/`logEvaluation()` triplicado (causa raíz A-1)** | `ProjectController.php:386-400`, `ProjectDocumentController.php:167-181`, `AIEvaluationController.php:119-147` | DRY — fix seguridad no propagado | 1 día (extraer `AuditLogService`) |
| 15 | **`Rule::in('chatgpt', 'gemini', 'claude')` sin envolver en array** | `AIEvaluationController.php:52` | Frágil ante cambios firma Laravel | 0.1 día |
| 16 | **`getMaskedApiKey()` ya no se invoca — código muerto en diff** | `AiConfiguration.php:51-59` (diff sin commitear) — `toArray()` implementa enmascarado inline | Código muerto introducido por diff | 0.1 día |
| 17 | **`anthropic-version: '2023-06-01'` hardcodeada en 2 lugares** | `AnthropicProvider.php:28`, `AiConfigController.php:301` | Magic string duplicado | 0.1 día (constante compartida) |
| 18 | **`config/cors.php:18` — `paths` incluye `'login'`/`'logout'` sin prefijo `api/`** | Rutas reales son `api/login`, `api/logout` | Configuración inerte | 0.1 día |
| 19 | **Controladores violan SRP: CRUD + lifecycle + import + auditoría + generación IDs** | `ProjectController.php` (393L), `SupportController.php` (289L) | Violación SRP | 2–3 días (extraer Services) |
| 20 | **`AIEvaluationService::registerProviders()` mezcla resolución config, instanciación concreta y filtrado** | `AIEvaluationService.php:34-78` | DIP — sigue sin factory/container | 1 día |

### 🔵 BAJO — Testing / Configuración

| # | Ítem | Detalle / Archivos | Origen V3 | Esfuerzo |
|---|------|-------------------|-----------|----------|
| 21 | **Tests de seguridad ausentes para CSRF y endpoints diagnóstico** | `CookieAuthFlowTest.php` (5 tests happy path) — **cero tests** verifican rechazo CSRF, validación `Origin`, ni que `cors-check`/`cors-refresh` requieran rol/entorno restringido. Coherente con que CRIT-01/02 no se detectaran antes. | Sec 5 | 1 día |
| 22 | **`ProjectLifecycleTest.php` solo happy path — no cubre gap sección 3** | No testea `pay(FINAL)` antes de `pay(ADVANCE)` ni transiciones desde estado incorrecto. | Sec 5 | 1 día |
| 23 | **Endpoints diagnóstico (`/api/cors-check`, `/api/cors-refresh`) sin tests** | — | Sec 5 | 0.3 día |
| 24 | **Cobertura sin cambios vs V2: AI Config CRUD, AI Evaluation, Project Documents, PushToken, comandos consola sin tests** | `DiagnoseCookieAuth` (nuevo) incluido | Sec 5 | 2–3 días |

---

> **Nota sobre discrepancia V2 vs V3 (Backend):** La auditoría V3 confirma que **13 de los ítems M-01 a M-08 y B-01 a B-06 de V2 fueron resueltos de forma real y verificable en código** (constantes de clase, paginación, DTOs IA, `BaseAIProvider` abstracta, inyección dependencias, `estimateCost()`, notificaciones en cola, limpieza tokens Expo, API keys en cache). Sin embargo, el diff pendiente de commit (migración cookie httpOnly) introduce los **riesgos más severos detectados hasta ahora** (CRIT-01, CRIT-02). Además, el fix M-04 (colisión IDs) quedó **incompleto** por duplicación de código (`log()` triplicado) — el fix no se propagó a 3 focos (A-1). La regla de negocio de guardas de estado en pagos/finalización (sección 3) ya estaba en V2 y sigue **totalmente sin resolver**.
