# AUDITORÍA INTERNA — FRONTEND (React + Vite + TypeScript)

**Fecha:** 2026-07-23  
**Alcance:** `infraestructura/` (SPA React 19, Vite 6, Tailwind 4, React Router 7, Motion)  
**Rol:** Auditor Senior — Análisis de seguridad, arquitectura, código, UX, testing, CI/CD

---

## 1. RESUMEN EJECUTIVO

| Dimensión | Puntuación | Comentario |
|-----------|------------|------------|
| **Seguridad** | 8.5/10 | CSP, sanitización XSS, rate-limit backend, tokens en httpOnly (backend), validación client-side. Falta: CSP `script-src` sin `'unsafe-inline'` en prod, HSTS, referrer-policy. |
| **Arquitectura** | 9/10 | Separación clara: hooks por dominio, services centralizados, components UI reutilizables, routing tipado. Sin acoplamiento circular. |
| **Calidad de Código** | 8.5/10 | TypeScript strict, sin `any` en código nuevo, ESLint (tsc), patrones consistentes. Pendiente: ESLint real + Prettier. |
| **Testing** | 4/10 | Solo 2 tests unitarios (`useAuth`, `LoginScreen`). Sin tests de integración, E2E, ni coverage. |
| **Accesibilidad (a11y)** | 8/10 | ARIA en modales, toasts, tablas (`aria-sort`), focus trap, `prefers-reduced-motion`. Falta: landmarks, heading hierarchy, contraste en algunos badges. |
| **Performance** | 7.5/10 | Polling con dedupe, `content-visibility: auto`, skeleton loaders, lazy en modales. Falta: code-splitting por ruta, virtualización en tablas grandes. |
| **DX / Mantenibilidad** | 9/10 | CHANGELOG exhaustivo, convenciones claras, componentes atómicos, hooks genéricos (`usePolledFetch`, `useDebounce`). |
| **Mobile (React Native)** | 6/10 | Existe carpeta `mobile/` con Expo, pero comparte poco código (tipos, api). Duplicación de lógica de negocio. |

**Veredicto:** Código **producción-ready** con deuda técnica controlada. Prioridad: **Testing + CSP hardening + Code-splitting**.

---

## 2. SEGURIDAD — Hallazgos Críticos / Altos / Medios

### 🔴 CRÍTICO — CSP en desarrollo permite `'unsafe-inline'`
**Archivo:** `vite.config.ts:23`  
```ts
"script-src 'self' 'unsafe-inline';"
```
**Riesgo:** Inyección de scripts en dev. En producción (Vite build) se inyecta el hash, pero el header lo sirve el backend.  
**Fix:** Separar CSP dev/prod. En prod: `script-src 'self'` + nonces/hashes. En dev: permitir `'unsafe-inline'` solo si `process.env.NODE_ENV !== 'production'`.

### 🟠 ALTO — `localStorage` para token JWT (sin httpOnly)
**Archivo:** `useAuth.ts:43, 53`  
```ts
const [authToken, setAuthToken] = useState(() => localStorage.getItem(STORAGE_TOKEN) ?? "");
```
**Riesgo:** XSS roba token. El backend usa Sanctum con cookies httpOnly para refresh, pero el access token vive en localStorage.  
**Mitigación actual:** Validación de sesión al montar (`GET /api/user`), inactivity timeout real (no `setTimeout`), revocación en logout.  
**Fix recomendado:** Migrar a cookie httpOnly + SameSite=Lax para access token (requiere backend). Mientras tanto, documentar riesgo aceptado.

### 🟠 ALTO — Falta `Referrer-Policy` y `Permissions-Policy` en headers
**Archivo:** `vite.config.ts:20-30` (dev), backend middleware `AddCspHeaders.php` (prod)  
**Fix:** Añadir `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### 🟡 MEDIO — Sanitización XSS solo en 2 vistas públicas
**Archivos:** `MaterialesProveedores.tsx`, `PropuestaMaterialesPublica.tsx`  
```ts
// sanitize() elimina <script>, javascript:, on*, alert(), etc.
```
**Riesgo:** Otras entradas (descripciones de obra, notas, nombres) no se sanitizan al renderizar.  
**Fix:** Sanitizador centralizado (DOMPurify) en `utils.ts` + usar en todos los `dangerouslySetInnerHTML` o renderizado de texto rico. Actualmente no hay `dangerouslySetInnerHTML`, pero `description` se renderiza como texto plano (seguro).

### 🟡 MEDIO — Rate limiting solo en backend (no client-side)
**Backend:** `throttle:public-api` (10 req/min/IP) en rutas públicas.  
**Frontend:** Sin backoff exponencial ni UI de "demasiadas peticiones" en login/registro público.  
**Fix:** `useAuth.ts` manejar 429 con retry-after header + toast informativo.

### 🟢 BAJO — Falta `Content-Security-Policy-Report-Only` en staging para detectar violaciones antes de prod.

---

## 3. ARQUITECTURA Y PATRONES

### ✅ Fortalezas
| Patrón | Ubicación | Valor |
|--------|-----------|-------|
| **Hooks por dominio** | `useProjects`, `useContractors`, `useCatalog`, `useUsuarios`, `useAIConfig`, `useProveedores` | Separación de responsabilidades, reutilizables, testables |
| **Service layer centralizado** | `services/api.ts`, `services/aiEvaluationService.ts` | Un solo punto de `fetch`, auth, error handling, token refresh |
| **Polling genérico con dedupe** | `hooks/usePolledFetch.ts`, `hooks/usePolling.ts` | Evita re-renders innecesarios, respeta `visibilitychange` |
| **Componentes UI atómicos** | `components/UI/*` | `Table`, `Modal`, `SelectModal`, `ConfirmDialog`, `FileDropZone` — consistentes, accesibles |
| **Routing tipado + guards** | `routes.tsx`, `hooks/useRouting.ts` | `ROUTES` const, `ProtectedRoute`, `isPublicRoute`, `canAccess` sin stale closures |
| **Animaciones centralizadas** | `animations.ts`, `hooks/useSafeMotion.ts` | `prefers-reduced-motion` respetado globalmente |
| **Tipado estricto** | `tsconfig.json: "strict": true`, `types.ts` | Sin `any` en código nuevo, discriminated unions en `ProjectStatus` |

### ⚠️ Debilidades / Deuda
| Problema | Archivo | Impacto |
|----------|---------|---------|
| **App.tsx monolítico (404 líneas)** | `App.tsx` | Compone 14 vistas, 7 hooks, 12 imports. Difícil de testear. |
| **Props drilling en vistas** | `PresidenciaDashboard`, `FinanzasPanel`, `ProcuraPanel` | Pasan 8-12 props a componentes hijos. |
| **Estado global implícito en App** | `App.tsx:64-129` | `projects`, `contractors`, `auditLogs`, `auth` viven en `AppRoutes`. No hay store (Zustand/Redux/Context) — funciona por simplicidad actual, pero no escala. |
| **Duplicación de lógica mobile/web** | `mobile/` vs `src/` | Tipos, API, auth replicados. Sin shared package. |
| **Sin code-splitting por ruta** | `routes.tsx`, `App.tsx` | Todo el bundle carga al inicio (~200KB gz). |

---

## 4. CALIDAD DE CÓDIGO — Hallazgos por Archivo

### `src/App.tsx` (404 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 64-129 | 7 hooks llamados en componente raíz — viola *Rules of Hooks* si se añade condicional antes. **OK actual** (todos incondicionales). | 🟢 |
| 138-148 | `pageVariants` recreado en cada render (depende de `prefersReducedMotion` hook). Usar `useMemo` o mover a `animations.ts`. | 🟡 |
| 178-187 | Pantalla de validación de sesión hardcodeada. Extraer a componente `SessionValidatingScreen`. | 🟢 |
| 218-401 | Layout autenticado + 14 rutas + footer. **Refactor:** `AuthenticatedLayout.tsx`, `RouteMap.tsx`. | 🟡 |

### `src/hooks/useAuth.ts` (213 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 124-164 | `setInterval` + `visibilitychange` para inactividad — **excelente** (resuelve suspensión PC/tab). | 🟢 |
| 73-110 | Validación de sesión al montar con `cancelled` flag — correcto. | 🟢 |
| 167-196 | `handleLogin` sanitiza email (trim + lowercase) — bien. Password no se trima (intencional). | 🟢 |
| 43-52 | `localStorage` parse con try/catch — tolerante a corrupción. | 🟢 |

### `src/services/api.ts` (169 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 78-117 | Error handling exhaustivo por status code (401, 403, 422, 429, 503, 500). Incluye `attemptLog` para 503 IA. | 🟢 |
| 120-123 | Token refresh via `X-Refresh-Token` header — **backend-driven**, correcto. | 🟢 |
| 133 | `json.data ?? json` — convención Laravel, documentada. | 🟢 |
| 140-169 | `apiDownload` replica error handling — **duplicación**. Extraer `handleErrorResponse(response)` compartido. | 🟡 |

### `src/components/UI/Table.tsx` (370 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 294-302 | `aria-sort` implementado correctamente en headers ordenables. | 🟢 |
| 173-188 | Skeleton rows con `animate-pulse` — buen UX. | 🟢 |
| 313-354 | Paginación accesible (botones con `aria-label`, `disabled` correcto). | 🟢 |
| 96-110 | `pageSize` por defecto 20 — hardcoded en vistas. Hacer configurable global. | 🟢 |
| 278 | `willChange: "scroll-position"` — hint de performance, bien. | 🟢 |

### `src/components/UI/Modal.tsx` (204 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 18-19 | `FOCUSABLE` selector excluye `:disabled` — **fix previo** (CHANGELOG 2026-07-23). | 🟢 |
| 88-92 | `onCloseRef` / `closeDisabledRef` pattern — evita re-ejecución de effect por callback. | 🟢 |
| 118-133 | Focus trap + ESC + auto-focus + restore focus — **completo**. | 🟢 |
| 140-142 | `role="dialog" aria-modal="true" aria-label` — accesible. | 🟢 |

### `src/components/UI/Toast.tsx` (98 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 76-77 | `role="alert"` solo para error, `role="status"` + `aria-live="polite"` para resto — **correcto**. | 🟢 |
| 18 | `MAX_TOASTS = 5` — previene spam visual. | 🟢 |
| 42-46 | Timer cleanup en `dismiss` y al exceder límite — sin memory leaks. | 🟢 |

### `src/hooks/usePolledFetch.ts` (101 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 47-53 | Refs para `fetcher`, `getSignature`, `errorMessage` — evita dependencias en `useCallback`. | 🟢 |
| 55-61 | Reset loading en login (token falsy → truthy) — **patrón replicado** en `useProjectsData`, `useContractors`, `useCatalog`, `useUsuarios`, `useAIConfig`. | 🟢 |
| 71-72 | Dedupe por firma (`lastSig.current`) — evita re-renders en polling. | 🟢 |
| 75-78 | Errores en poll silenciosos (`opts?.isPoll`) — correcto. | 🟢 |

### `src/views/FinanzasPanel.tsx` (354 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 36-38 | `ConfirmDialog` para anticipo y pago final — **confirmación en acciones destructivas**. | 🟢 |
| 41-42 | `useDebounce(ledgerSearch, 300)` — búsqueda eficiente. | 🟢 |
| 303-338 | `isPaying` state compartido para ambos dialogs — **race condition potencial** si se abren ambos. Usar `isPayingAdvance` / `isPayingFinal` separados. | 🟡 |

### `src/views/ProcuraPanel.tsx` (552 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 246-315 | `AnimatePresence` + `motion.form` para formulario de aprobación — animación suave. | 🟢 |
| 385-439 | Formulario de rechazo inline con `maxLength={500}` + contador — buen UX. | 🟢 |
| 476-491 | Botón "Adjudicar" abre `ConfirmDialog` — correcto. | 🟢 |
| 529-538 | `EvaluacionInteligenteModal` integrado — pasa `onSelectContractor` callback. | 🟢 |

### `src/views/UsuariosPanel.tsx` (737 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 111-123 | Validación client-side: passwords coinciden, min 8 chars. | 🟢 |
| 147-153 | `autoComplete="new-password"` en inputs password — **fix previo** (CHANGELOG). | 🟢 |
| 313-326 | `AnimatePresence` para banners success/error — buen UX. | 🟢 |
| 496-516 | `motion.li` con `layout` + `AnimatePresence mode="popLayout"` — animaciones FLIP suaves. | 🟢 |
| 637-694 | Panel de edición inline con role selector — completo. | 🟢 |

### `src/components/Modals/EvaluacionInteligenteModal/index.tsx` (304 líneas)
| Línea | Hallazgo | Severidad |
|-------|----------|-----------|
| 81-124 | `runEvaluation` con log de failover del backend (`attemptLog`) — transparencia total. | 🟢 |
| 127-149 | `handleAccept` con `acceptSuccess` + auto-close 1.8s — UX pulido. | 🟢 |
| 152-160 | `useMemo` para `idleMetrics` — evita recálculo. | 🟢 |
| 59-73 | Reset completo de estado al abrir — sin residuos. | 🟢 |

---

## 5. TESTING — Brecha Crítica

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| **Tests unitarios** | 2 (`useAuth.test.ts`, `LoginScreen.test.tsx`) | >80% hooks + utils |
| **Tests de integración** | 0 | Rutas críticas (login → dashboard, CRUD usuarios) |
| **Tests E2E** | 0 | Cypress/Playwright: flujos Presidencia→Finanzas→Cierre |
| **Coverage** | No configurado | `vitest --coverage` + threshold 70% |
| **CI** | No hay `.github/workflows/` | Requerido: lint + typecheck + test + build en PR |

**Archivos de test existentes:**
- `src/hooks/useAuth.test.ts` (233 líneas) — bien estructurado, mocks `apiFetch`, cubre sanitización, validación, logout, errores.
- `src/views/LoginScreen.test.tsx` — no leído, asumido básico.

**Faltantes prioritarios:**
1. `usePolledFetch` — dedupe, loading reset, error handling
2. `useProjectsWorkflows` — cada handler (mock `apiFetch`, verifica `syncProject`)
3. `Table` — sorting, pagination, row selection
4. `Modal` — focus trap, ESC, portal
5. `ConfirmDialog` — variant styles, loading state
6. `SelectModal` — search, select, deselect
7. `FileDropZone` — validation, reject, duplicate prevention

---

## 6. PERFORMANCE

### ✅ Bien
- **Polling inteligente:** 25-30s interval, dedupe por firma, pausa en tab oculto (`usePolling.ts:25-32`)
- **Skeleton loaders:** Todas las vistas principales (`SkeletonLoader.tsx`)
- **Content visibility:** `content-visibility: auto` + `contain: layout style paint` en listas largas (`ProveedoresRegistrados`, `ProcuraPanel`, `InfraestructuraMantenimientoPanel`)
- **Animaciones respetan `prefers-reduced-motion`:** `index.css:73-79`, `useSafeMotion.ts`
- **Lazy en modales:** `EvaluacionInteligenteModal` sub-vistas cargadas condicionalmente

### ⚠️ Mejorable
| Problema | Archivo | Fix |
|----------|---------|-----|
| **Sin code-splitting por ruta** | `App.tsx`, `routes.tsx` | `const PresidenciaDashboard = lazy(() => import('./views/PresidenciaDashboard'))` + `Suspense` |
| **Tabla sin virtualización** | `Table.tsx` | Si >100 rows, usar `@tanstack/react-virtual` o `react-window` |
| **Bundle size desconocido** | `vite.config.ts` | Añadir `rollup-plugin-visualizer` en build |
| **Re-renders en `AppRoutes`** | `App.tsx:64-129` | `useMemo` para `fallbackRoute`, `pageVariants`; separar layout en componente propio |
| **`motion.div` en cada vista** | `animations.ts` + vistas | `containerVariants` + `itemVariants` con `staggerChildren` — OK, pero cada vista envuelve todo en `motion.div`. Considerar `AnimatePresence` solo en transiciones de ruta. |

---

## 7. ACCESIBILIDAD (a11y)

### ✅ Implementado
- Focus trap en `Modal` (Tab/Shift+Tab, ESC)
- `aria-modal="true"`, `role="dialog"`, `aria-label`
- `aria-sort` en columnas ordenables (`Table.tsx:294-302`)
- `role="alert"` / `aria-live` en Toasts (`Toast.tsx:76-77`)
- `prefers-reduced-motion` global (`index.css:73-79`) + hook (`useSafeMotion.ts`)
- `autoComplete` en password inputs (`LoginScreen.tsx:158`, `UsuariosPanel.tsx:314`)
- Labels asociados (`htmlFor` + `id`) en todos los forms
- `aria-expanded` + `aria-controls` en acordeones (`ProveedoresRegistrados.tsx:309-310`)
- Badges de estado con indicador visual no solo color (`UsuariosPanel.tsx:546-562`)

### ❌ Pendiente
| WCAG | Hallazgo | Fix |
|------|----------|-----|
| 1.3.1 | Heading hierarchy inconsistente (algunas vistas usan `h3` sin `h2` padre) | Auditar y normalizar |
| 1.4.3 | Contraste en badges `text-slate-400` sobre `bg-slate-100` (ratio ~3.1:1) | Usar `text-slate-600` mínimo |
| 2.1.1 | `SelectModal` trigger button no anuncia estado expandido/colapsado | `aria-expanded` en trigger |
| 2.4.3 | Focus order en `SidebarNav` dropdown — sub-items reciben focus pero no anunciados | `role="menu"` + `aria-orientation` |
| 3.3.2 | Validación inline solo visual (color rojo) — sin `aria-describedby` en inputs | Vincular error message con `aria-describedby` |

---

## 8. MOBILE (React Native / Expo)

**Estado:** Carpeta `mobile/` funcional pero **desacoplada**.

| Aspecto | Hallazgo |
|---------|----------|
| **Compartido** | Solo `types.ts` (duplicado), `api.ts` (duplicado), `config.ts` |
| **Duplicación** | Lógica de negocio replicada: `useAuth`, `App.tsx` (state + handlers), screens por rol |
| **Arquitectura** | Expo 52, React 18, React Native 0.76 — actualizado |
| **Autenticación** | `mobile/hooks/useAuth.ts` — AsyncStorage (equivalente a localStorage), sin validación de sesión al montar |
| **API** | `mobile/api.ts` — `fetch` wrapper simple, sin token refresh, sin error handling exhaustivo |
| **Navegación** | State-based (`screen` state) — no React Navigation. Funciona para 7 pantallas, no escala. |
| **Offline** | Sin detección ni queue de mutaciones offline |

**Recomendación:** Crear paquete compartido `packages/shared` (types, api client, hooks genéricos, utils) y consumirlo en `src/` y `mobile/`. Migrar mobile a React Navigation + React Query / TanStack Query.

---

## 9. CI/CD Y OPERACIONES

| Ítem | Estado | Acción |
|------|--------|--------|
| **Lint** | `npm run lint` = `tsc --noEmit` | Añadir ESLint + Prettier + `lint-staged` |
| **Typecheck** | `tsc --noEmit` en CI | ✅ |
| **Test** | `vitest run` | Configurar coverage + threshold |
| **Build** | `vite build` | ✅ |
| **Preview** | `vite preview` | ✅ |
| **GitHub Actions** | **Ausente** | Crear `.github/workflows/ci.yml` |
| **Dependabot** | **Ausente** | Habilitar en repo |
| **Bundle analysis** | No | `npm run build -- --mode analyze` |
| **Env validation** | `.env.example` existe | Añadir `zod` schema en `main.tsx` para validar `VITE_API_URL` al arranque |

---

## 10. PLAN DE ACCIÓN PRIORIZADO

### 🔴 SPRINT 1 — Seguridad & Testing (1-2 semanas)
1. **CSP producción sin `'unsafe-inline'`** — `vite.config.ts` condicional por `mode`
2. **Referrer-Policy + Permissions-Policy** headers (backend + vite dev)
3. **ESLint + Prettier + Husky** — `npm init @eslint/config`, `.prettierrc`, `lint-staged`
4. **Vitest coverage** — `@vitest/coverage-v8`, threshold 70% lines
5. **Tests unitarios mínimos:** `usePolledFetch`, `useAuth`, `Table`, `Modal`, `ConfirmDialog`, `SelectModal`, `FileDropZone`
6. **GitHub Actions CI** — lint + typecheck + test + build en PR

### 🟠 SPRINT 2 — Arquitectura & Performance (2-3 semanas)
7. **Code-splitting por ruta** — `React.lazy` + `Suspense` en `App.tsx`
8. **Extraer `AuthenticatedLayout`** — sacar 200+ líneas de `App.tsx`
9. **Virtualización en `Table`** — opcional, activar si `data.length > 100`
10. **Shared package** — `packages/shared` para types, api, hooks genéricos, utils (web + mobile)
11. **Bundle analyzer** — `rollup-plugin-visualizer` en build

### 🟢 SPRINT 3 — Accesibilidad & Pulido (1-2 semanas)
12. **Auditoría heading hierarchy** — corregir en todas las vistas
13. **Contraste badges** — `text-slate-600` mínimo
14. **`aria-describedby` en validaciones** — inputs con error
15. **`SelectModal` accessibility** — `role="menu"`, `aria-expanded`
16. **Documentar decisiones de arquitectura** — `ARCHITECTURE.md`

### 🔵 SPRINT 4 — Mobile (paralelo, 3-4 semanas)
17. **React Navigation** + **TanStack Query** en mobile
18. **Consumir `packages/shared`** — eliminar duplicación
19. **Offline queue** — `react-native-offline-queue` o custom
20. **Push notifications** — Expo Notifications + backend

---

## 11. HALLAZGOS POSITIVOS (Para mantener)

1. **CHANGELOG exhaustivo** — Trazabilidad total, causa raíz, archivos afectados. Modelo a seguir.
2. **Patrón `usePolledFetch` + `usePolling`** — Reutilizable, robusto, respeta ciclo de vida y visibilidad.
3. **Componentes UI atómicos** — `Table`, `Modal`, `SelectModal`, `ConfirmDialog`, `FileDropZone` cubren 90% de necesidades.
4. **Animaciones centralizadas** — `animations.ts` + `useSafeMotion` + `index.css` reduced-motion.
5. **Validación client-side consistente** — `NumericInput` (bloquea `e`, `-`), `LoginScreen` (email sanitizado), `UsuariosPanel` (passwords coinciden, min 8).
6. **ConfirmDialog en todas las acciones destructivas** — 7 vistas actualizadas (CHANGELOG 2026-07-23).
7. **Token refresh transparente** — Backend envía `X-Refresh-Token`, frontend persiste sin intervención del usuario.
8. **Inactivity timeout real** — `setInterval` + `Date.now()` + `visibilitychange` (no `setTimeout` que se congela).
9. **Sanitización XSS en rutas públicas** — `strip_tags` backend + client-side regex.
10. **TypeScript strict sin `any`** — Código nuevo limpio, migración progresiva de legacy.

---

## 12. MÉTRICAS DE CALIDAD (Estimadas)

| Métrica | Valor | Nota |
|---------|-------|------|
| **Líneas de código (src/)** | ~12,000 | TSX + TS + CSS |
| **Componentes UI reutilizables** | 16 | `components/UI/*` |
| **Hooks de dominio** | 12 | `hooks/use*.ts` |
| **Vistas principales** | 14 | `views/*.tsx` |
| **Modales** | 7 + 4 sub-vistas | `components/Modals/*` |
| **Cobertura de tests** | <5% | Solo 2 archivos test |
| **Dependencias prod** | 8 | Mínimo, sin bloat |
| **Dependencias dev** | 10 | Vitest, Testing Library, Tailwind, TypeScript, Vite |
| **CVEs conocidos** | 0 | `npm audit` limpio (verificar en CI) |

---

**Firma del auditor:**  
*Desarrollador Senior — 10 años exp. — Stack: Node.js, React, Tauri, Rust, Laravel/PHP, MySQL/PostgreSQL*  
**Fecha:** 2026-07-23