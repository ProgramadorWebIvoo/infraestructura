# AUDITORIA_front_27_07_2026_V3

**Fecha:** 27 de julio de 2026
**Versión del Reporte:** V3
**Tipo de Auditoría:** Integral (Seguridad, Clean Code/SOLID, Rendimiento, Testing, Reglas de Negocio)
**Stack:** React 19 + TypeScript + Vite, monorepo (`src/`, `packages/shared/`, `mobile/` Expo)
**Repositorio:** `infraestructura` (rama `FIXES`)
**Alcance:** Código commiteado hasta `2d4d86f` ("Arreglos varios") + verificación línea por línea del diff **sin commitear** que migra la autenticación de `localStorage` a cookie httpOnly, y trazabilidad completa contra los 106 hallazgos de la auditoría V2 (`PENDIENTES.md`).

**Nota de correlación:** esta auditoría se ejecutó en paralelo con `AUDITORIA_back_27_07_2026_V3.md` (backend), sin compartir contexto entre ambos agentes auditores. **Ambos llegaron de forma independiente a la misma conclusión crítica**: la migración de token a cookie httpOnly introduce CSRF explotable. La convergencia desde dos ángulos distintos (backend: ausencia de `VerifyCsrfToken` + `SameSite=None`; frontend: ausencia total de token CSRF/validación de origen en el cliente) refuerza la severidad del hallazgo.

---

## 1. Resumen Ejecutivo

| Severidad | Nuevos (V3) | Persisten de V2 (verificado en código actual) | Total reportado |
|---|---|---|---|
| 🔴 Critical | 4 | 3 | **7** |
| 🟠 High | 3 | 5 | **8** |
| 🟡 Medium | 3 | 9 | **12** |
| 🔵 Low | 2 | — | **2** |

El hallazgo dominante es que la migración de token JWT de `localStorage` a cookie httpOnly (sin commitear) requirió cambiar `SameSite=Lax` → `SameSite=None` (documentado en el propio `CHANGELOG.md`), lo que abre la cookie a envío automático en requests cross-site, **sin que el frontend implemente ninguna mitigación CSRF** (no existe token CSRF, no hay llamada a `/sanctum/csrf-cookie`, no hay validación de origen). El propio `CHANGELOG.md` documenta además que, al momento de este diff, el equipo **no había verificado que el flujo funcione end-to-end en un navegador real** ("el problema está en el browser: la cookie no se envía en requests subsecuentes"), y quedaron scripts de diagnóstico manual en el árbol de `src/`. Adicionalmente, se detectó que las cabeceras de seguridad (CSP, Referrer-Policy, Permissions-Policy) configuradas en `vite.config.ts` están anidadas bajo `server:` — **solo aplican al dev server de Vite y nunca llegan al build de producción**, lo que invalida parcialmente la calificación de seguridad 5/5 que V1 y V2 le dieron a ese control.

381 de 384 tests pasan, pero los 3 que fallan (`useRouting.test.ts`) cubren exactamente la vulnerabilidad de fallback de rol señalada como HIGH en V2 — y vienen siendo ignorados como "preexistentes, no relacionados" en al menos 3 commits distintos, normalizando el merge con un control de acceso roto.

---

## 2. Vulnerabilidades y Riesgos Críticos

### 🔴 C-NEW-1 — CSRF por cookie `SameSite=None` sin mitigación en el cliente

**Archivos:** `packages/shared/src/api.ts:37-39,59-70`, `src/services/api.ts:40-59`, `src/hooks/useAuth.ts:11-21`, `CHANGELOG.md`

El changelog documenta el cambio de `SameSite=Lax` a `SameSite=None` para que el fetch cross-origin (SPA→API) funcione. Consecuencia: la cookie de sesión ahora se adjunta automáticamente a cualquier request cross-site que el navegador de un usuario autenticado realice (formulario HTML, `fetch` sin preflight con `Content-Type: text/plain`). No existe en `src/` ni `packages/shared/` ningún token CSRF, llamada a `/sanctum/csrf-cookie`, ni verificación de `Origin`/`Referer`. Esto coincide exactamente con lo detectado desde el lado backend en `AUDITORIA_back_27_07_2026_V3.md` (CRIT-01): un `<form>` auto-enviado desde un sitio malicioso, visitado por un usuario con sesión activa (p. ej. rol PROCURA), ejecuta acciones mutantes (aprobar inversión, cambiar rol) sin su consentimiento.

**Corrección:** implementar el flujo SPA "stateful" nativo de Sanctum (cookie de sesión + `XSRF-TOKEN` de doble envío) o un header custom no forjable validado server-side, y volver a `SameSite=Lax` sirviendo frontend/backend en el mismo origen aparente.

### 🔴 C-NEW-2 — Migración de auth shipeada sin verificación funcional + artefactos de depuración en el repo

**Archivos:** `CHANGELOG.md`, `src/__tests__/diagnostics/browser-diagnose.js`, `src/__tests__/diagnostics/CookieAuthFlow.diag.ts` (sin trackear)

El propio changelog registra: *"Backend 100% funcional... El problema está en el browser (cookie no se envía en requests subsecuentes)... Causa probable: Secure=true requiere HTTPS, o el browser bloquea cookies de terceros"*. Es decir, al momento del diff **no estaba confirmado que el login por cookie funcione end-to-end en un navegador real**, y aun así `useAuth.ts` fue reescrito por completo asumiendo que sí, sin flag de rollback. Quedaron dos scripts de diagnóstico manual en `src/__tests__/diagnostics/` sin extensión `.test.ts` (Vitest no los ejecuta, pero si se importan accidentalmente desde código real exponen cookies/credenciales vía `prompt()` y logs de consola). Deben eliminarse o moverse fuera de `src/` antes de mergear.

**Riesgo de negocio:** shippear un mecanismo de autenticación no verificado puede dejar a todos los usuarios sin poder iniciar sesión, o en un estado de `isValidatingSession` colgado.

### 🔴 C-NEW-3 — Contrato de `VITE_API_URL` roto/indocumentado; el proxy de Vite es dev-only

**Archivos:** `src/services/api.ts:40-59,77-78`, `vite.config.ts:36-42`, `.env`, `src/__tests__/services/api.test.ts:11-16`

`api.ts` ahora antepone `/api` a toda ruta y fuerza `useCookieAuth: true`, asumiendo rutas relativas reenviadas por `server.proxy` de `vite.config.ts`. Esa opción **solo existe en el dev server** (`npm run dev`); no aplica a `vite preview` (falta `preview.proxy`) ni al build estático en producción, y no hay `nginx.conf`/`vercel.json`/`netlify.toml` en el repo que repliquen ese proxy. Si en producción `VITE_API_URL` queda vacío (como está en `.env` actual) o conserva el formato legado con sufijo `/api`, el resultado es 404 total (rutas relativas al propio dominio del frontend, o duplicación `.../api/api/login`). Es un cambio de contrato de build silencioso: la variable ahora debe apuntar al host del backend **sin** `/api`, y ningún test de integración lo verifica contra un proxy real de producción.

### 🔴 C-NEW-4 — Cabeceras de seguridad (CSP incluida) nunca llegan a producción

**Archivo:** `vite.config.ts:28-42`

El bloque `headers: {...}` está anidado bajo `server:` (clave de configuración del dev server). No tiene efecto en `vite build`, no existe `preview.headers`, y no hay configuración de servidor de producción en el repo que aplique estas cabeceras a los assets estáticos. La CSP que V1 y V2 calificaron como control de seguridad activo **probablemente nunca se envía en producción**, dejando sin mitigación de XSS/clickjacking al build real — agravante directo de C-NEW-1, porque sin CSP cualquier XSS que se cuele tiene el camino libre para orquestar el CSRF.

**Corrección:** mover la aplicación de cabeceras a la capa que sirve el build (Nginx/Cloudflare/Vercel headers), y verificar con `curl -I` contra el dominio de producción real.

### 🔴 C1 (persiste de V2) — Fallback de rol a `INFRAESTRUCTURA`, con test en rojo ignorado por 3+ commits

**Archivo:** `src/hooks/useRouting.ts:27`
```ts
return (roleAccess[activeRole] ?? roleAccess["INFRAESTRUCTURA"]).includes(path);
```
`npm test` confirma **3 tests en rojo** en `useRouting.test.ts` que ejercitan exactamente este fallback, venidos ignorando como "preexistentes, no relacionados" en los commits `1ec5334`, `ff5a854`, `2412c48`. Es un antipatrón de proceso más grave que el bug en sí: normaliza mergear con un control de acceso roto y verificado en código.

### 🔴 C4 (persiste de V2) — URL de backend de producción hardcodeada en mobile

**Archivo:** `mobile/config.ts:11` — `API_BASE_URL = "https://infraestructuraback.ivoofix.com/api"`, sin usar `EXPO_PUBLIC_API_URL`.

### 🔴 C3 (persiste de V2) — Contraseña en texto plano sin `upgrade-insecure-requests`

**Archivos:** `src/hooks/useAuth.ts:168-175`, `vite.config.ts:9-18` — la CSP no incluye la directiva, y por C-NEW-4 puede ni siquiera estar llegando a producción.

---

## 3. Cumplimiento de Reglas de Negocio

El flujo de negocio (creación → verificación → cierre de obra; comparativa → aprobación → adjudicación; anticipo/pago final) permanece intacto en la capa de vistas. El hallazgo de negocio relevante es el mismo C1 de la sección 2: la matriz `roleAccess` implementa "cada rol accede solo a sus rutas", pero el operador `??` de fallback rompe esa garantía para cualquier rol no reconocido por el frontend — el diseño correcto es `return false`, no heredar el acceso de otro rol.

Las vistas que materializan reglas de negocio sensibles (aprobación de inversión en `ProcuraPanel`, liberación de pagos en `FinanzasPanel`, cierre en `CierreObraPanel`) siguen sin test dedicado a nivel de vista (ver sección 5), por lo que esas reglas no tienen protección de regresión automatizada más allá de lo que cubren los hooks subyacentes.

---

## 4. Mejoras: Clean Code, POO y Normalización

| # | Archivo:línea | Hallazgo |
|---|---|---|
| CC-1 | `src/views/UsuariosPanel.tsx` (742 líneas) | God Component persiste sin refactorizar |
| CC-2 | `src/views/ProveedoresRegistrados.tsx` (608→**634** líneas) | God Component que **creció** desde V2; 0 usos de `useMemo`/`useCallback` en todo el archivo |
| CC-3 | `src/views/ProcuraPanel.tsx` (555 líneas) | God Component persiste |
| CC-4 | `src/hooks/useAIConfig.ts:169-181` | Doble fetch: dos `useEffect` separados llaman `loadConfigs()`, sin unificar |
| CC-5 | `src/hooks/useAIConfig.ts:254-255` | El hook expone setters internos (`setSyncMessage`) en vez de una función de dominio (`dismissSyncMessage()`) |
| CC-6 | `src/hooks/useAIConfig.ts:110-114` | `PROVIDER_MODELS` sigue hardcodeado, no servido desde endpoint |
| CC-7 | `src/views/UsuariosPanel.tsx:38-47`, `src/utils.ts:24-35` | `ROLES` y `ROLE_COLORS` siguen hardcodeados |
| CC-8 | `src/hooks/useRouting.ts:10-20` | `roleAccess` hardcodeado en el bundle — autorización solo editable con deploy |
| CC-9 | `src/views/PresidenciaDashboard.tsx` | No existe `useProjectFinancials`; cálculos financieros siguen inline |
| CC-10 | `useAIConfig.ts`, `useProveedores.ts:22,38-40`, `useContractors.ts`, `useCatalog.ts`, `useUsuarios.ts` | Abstracción con fuga: los hooks siguen pasando `{ token }` a `apiFetch` como si fuera Bearer real, cuando ahora es el sentinel `"cookie"` descartado en `api.ts:54` — funciona por accidente, confunde al próximo desarrollador |
| CC-11 | `src/views/ProveedoresRegistrados.tsx:427` | `rowKey={(_item, idx) => idx}` — key por índice en vez de ID |
| CC-12 | `src/views/AIConfigPanel/AIConfigTable.tsx:47-164` | Columnas de tabla definidas inline en cada render, sin `useMemo` |
| CC-13 | `README.md:1-8` | Sigue siendo el template de AI Studio, no describe el proyecto real |

---

## 5. Estado de Testing

Ejecución real sobre el working tree actual (`npm test -- --run`): **27 suites, 384 tests, 381 pasan, 3 fallan** (todos en `useRouting.test.ts`, ver C1). `npx tsc --noEmit` reporta **4 errores de tipos preexistentes** en `AuthenticatedLayout.test.tsx` y `Modal.test.tsx` — como el script de lint es literalmente `tsc --noEmit`, **el lint falla hoy**, y no hay hook de pre-commit que lo hubiera detectado (`.husky/pre-commit` no existe como archivo real).

Los tests actualizados de auth (`useAuth.test.ts`, `api.test.ts`) tienen buena factura técnica — cubren el sentinel `"cookie"`, ausencia de header `Authorization`, `credentials: "include"` — pero **testean el contrato del wrapper, no el flujo real contra un backend/proxy**, por lo que no habrían detectado ni el bug de doble-prefijo `/api` (C-NEW-3), ni el CSRF (C-NEW-1), ni la falta de verificación end-to-end (C-NEW-2). 381 tests en verde dan una falsa sensación de seguridad a un cambio de autenticación que el propio changelog admite no haber verificado en un navegador real.

Otros puntos sin cambios desde V2: `src/test/setup.ts` sigue sin mocks de `matchMedia`/`IntersectionObserver`/`ResizeObserver`; coverage thresholds en 70% (no subidos a 85%); las 6 vistas críticas (`PresidenciaDashboard`, `InfraestructuraMantenimientoPanel`, `CierreObraPanel`, `ProcuraPanel`, `AnalistasPanel`, `FinanzasPanel`) siguen sin test directo.

**Hallazgo adicional de dependencias:** `npm audit` reporta un CVE de severidad alta en `react-router` (GHSA-qwww-vcr4-c8h2, "RSC Mode CSRF Bypass") — particularmente relevante porque el tema central de este diff es justamente CSRF. Requiere evaluar `npm audit fix --force` (breaking change en rutas).

---

## 6. Trazabilidad contra los 106 hallazgos de V2 (`PENDIENTES.md`)

### Confirmado RESUELTO en código actual

| Ítem V2 | Estado |
|---|---|
| CRITICAL #1 — API Keys de IA expuestas | ✅ Resuelto: `hasApiKey` + últimos 4 chars (`useAIConfig.ts:20-21`, `AIConfigTable.tsx:65-76`) |
| CRITICAL #2 — Token en localStorage | ✅ Resuelto el mecanismo original, pero **reemplazado por CSRF nuevo (C-NEW-1)** — "resuelto" es engañoso sin matizar |
| HIGH #10 — `.env` trackeado en git | ✅ Ya no trackeado; `PENDIENTES.md` está desactualizado en este punto |

### Confirmado SIGUE PENDIENTE

CRITICAL #3 (contraseña en claro / falta `upgrade-insecure-requests`), CRITICAL #4 (URL prod hardcodeada mobile), HIGH #9 (fallback de rol — con test en rojo), HIGH #5 (tests de 6 vistas), HIGH #6 (mocks setup.ts), HIGH #7 (Husky pre-commit real), HIGH #8 (polling centralizado, `30000` duplicado en 4 hooks), MEDIUM #13 (God Components — `ProveedoresRegistrados` incluso **creció**), MEDIUM #14 (`useProjectFinancials`), MEDIUM #15–18 (roleAccess/PROVIDER_MODELS/ROLES/ROLE_COLORS hardcodeados), MEDIUM #20 (sin DOMPurify en proveedores), MEDIUM #21 (CSP con `localhost` sin condicionar por modo, agravado por C-NEW-4), MEDIUM #25–28 (columnas sin memo, rowKey por índice, doble fetch, setters expuestos), BAJA #30 (README template), BAJA #33 (coverage 70%). HIGH #11/#12 (mobile) no verificados en este pase — recomendado confirmar en próxima auditoría de `mobile/app.json`.

### Hallazgos NUEVOS no cubiertos por V2

1. CSRF por `SameSite=None` sin mitigación (C-NEW-1) — confirmado también desde el backend.
2. Migración de auth shipeada sin verificación end-to-end + artefactos de diagnóstico en el repo (C-NEW-2).
3. Contrato de `VITE_API_URL` roto/indocumentado, dependiente de un proxy dev-only (C-NEW-3).
4. Cabeceras de seguridad configuradas solo para el dev server, nunca llegan a producción (C-NEW-4).
5. CVE alto en `react-router` (CSRF Bypass) sin actualizar.
6. Test de `useRouting.test.ts` en rojo desde hace 3+ commits, ignorado sistemáticamente — hallazgo de proceso.
7. `ProveedoresRegistrados.tsx` creció (608→634 líneas) en vez de reducirse desde que V2 lo marcó a refactorizar.

---

## 7. Conclusión y Siguientes Pasos

El progreso real contra V2 es genuino en los puntos de exposición directa de datos (API keys, `.env`), pero el intento de cerrar el hallazgo de token-en-localStorage introdujo, sin verificación end-to-end, una vulnerabilidad de igual o mayor severidad (CSRF) — confirmada de forma independiente desde ambos lados del stack. Además, se descubrió que un control de seguridad ya dado por bueno en dos auditorías previas (CSP/cabeceras) nunca opera en producción, y que hay un test rojo que expone control de acceso roto siendo ignorado sistemáticamente.

**Bloqueante antes de mergear a `main`** (coordinar con `AUDITORIA_back_27_07_2026_V3.md`):
1. No mergear la migración a cookie httpOnly sin mitigación CSRF real (C-NEW-1) y sin verificación end-to-end en navegador (C-NEW-2).
2. Eliminar `src/__tests__/diagnostics/` del árbol de producción o moverlo fuera de `src/`.
3. Corregir el contrato de `VITE_API_URL`/proxy de producción (C-NEW-3) y documentarlo para Ops.
4. Mover las cabeceras de seguridad a la capa de servidor de producción real (C-NEW-4).

**Siguiente sprint (alto):**
5. Arreglar `useRouting.ts:27` (`return false` en fallback) y dejar de ignorar los 3 tests rojos.
6. `npm audit fix` para el CVE de `react-router` (evaluar breaking changes).
7. Refactor de God Components, empezando por `ProveedoresRegistrados.tsx` (el que retrocedió).

**Deuda técnica ya conocida** (God Components restantes, hardcoded values, Husky, coverage, README) — mantener en `PENDIENTES.md`, sin bloquear el release si los puntos 1–4 quedan resueltos.

No se modificó ningún archivo de código como parte de esta auditoría — solo lectura y análisis, conforme al rol de auditor.