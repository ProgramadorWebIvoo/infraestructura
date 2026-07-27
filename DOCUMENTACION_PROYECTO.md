# Documentación Completa del Proyecto IVOO Gestión de Infraestructura

**Fecha de generación:** 27 de julio de 2026  
**Versión:** 1.0  
**Estado de tests:** Frontend 431/431 ✅ | Backend 144/144 ✅  
**Lint TypeScript:** Sin errores ✅

---

## 1. Visión General

### 1.1 Propósito
Sistema de gestión integral para obras de infraestructura y mantenimiento que cubre el ciclo de vida completo: **creación → revisión técnica → aprobación de inversión → licitación/comparativa → adjudicación → ejecución → verificación de calidad → pagos (anticipo/final) → cierre**.

### 1.2 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend Web** | React + TypeScript + Vite | React 19, TS 5.8, Vite 6.2 |
| **Frontend Mobile** | React Native + Expo | Expo SDK 51, React Native 0.76 |
| **Shared Package** | TypeScript (monorepo) | `@ivoo/shared` |
| **Backend** | Laravel 9.x + PHP 8.0+ | Laravel 9.19, Sanctum 3.0 |
| **Base de Datos** | MySQL/PostgreSQL | - |
| **Testing** | Vitest (web) / PHPUnit (backend) | Vitest 4.1, PHPUnit 9.5 |
| **Estilos** | Tailwind CSS 4.1 | - |
| **Estado/Async** | React Hooks + TanStack Query (mobile) | - |
| **Animaciones** | Motion (fork Framer Motion) | 12.23 |

### 1.3 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO                                 │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   packages/shared   │     src/ (web)      │     mobile/         │
│   - api.ts (core)   │   - App.tsx         │   - App.tsx         │
│   - types.ts        │   - hooks/          │   - hooks/          │
│   - utils.ts        │   - views/          │   - components/     │
│                     │   - components/     │   - api.ts          │
│                     │   - routes/         │                     │
└─────────────────────┴─────────────────────┴─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Laravel)                          │
│  - Auth (Sanctum SPA + Mobile Bearer)                          │
│  - Projects CRUD + Workflow (9 estados)                        │
│  - Contractors / Materials / AI Config                         │
│  - Audit Logs / Documents / Push Notifications                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Roles del Sistema

| Rol | Descripción | Rutas Web Accesibles |
|-----|-------------|---------------------|
| `SUPERADMIN` | Acceso total + administración usuarios/config | Todas |
| `ADMIN` | Gestión completa sin superadmin | Todas menos `/presidencia` |
| `PRESIDENCIA` | Dashboard ejecutivo + catálogos | `/presidencia`, `/catalogos` |
| `INFRAESTRUCTURA` | Creación y gestión de obras | `/infraestructura` |
| `CIERRE_DE_OBRA` | Revisión técnica + verificación final | `/cierre-obra` |
| `PROCURA` | Aprobación inversión + adjudicación | `/procura`, `/catalogos` |
| `ANALISTA` | Carga propuestas + comparativas | `/analistas` |
| `FINANZAS` | Pagos (anticipo/final) | `/finanzas` |
| `CATALOGOS` | Solo catálogos | `/catalogos` |

---

## 2. Frontend Web (`src/`)

### 2.1 Estructura de Directorios

```
src/
├── App.tsx                    # Punto de entrada, composición de hooks + rutas
├── main.tsx                   # Bootstrap React
├── routes.tsx                 # Constantes de rutas + guards (ProtectedRoute)
├── types.ts                   # Tipos compartidos (Project, Proposal, AuditLog, etc.)
├── constants.ts               # Constantes globales (DEFAULT_POLL_INTERVAL = 30000)
├── data.ts                    # Datos de fallback solo para DEV (INITIAL_PROJECTS)
├── utils.ts                   # Utilidades (getRoleColor, formateo, etc.)
├── animations.ts              # Variantes Motion presets
├── index.css                  # Tailwind + globals
├── vite-env.d.ts              # Tipos Vite
├── components/
│   ├── UI/                    # Componentes base reutilizables
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Toast.tsx          # Sistema de notificaciones global
│   │   ├── Spinner.tsx
│   │   ├── SelectModal.tsx    # Modal con tabla paginada + buscador
│   │   ├── SidebarNav.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── NumericInput.tsx
│   │   ├── AlertBanner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── FileDropZone.tsx
│   │   ├── KpiCard.tsx
│   │   ├── MiniBarChart.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── MobileTopBar.tsx
│   │   ├── SectionHeader.tsx
│   │   └── ConfirmDialog.tsx
│   ├── Modals/
│   │   ├── InspectRequestModal.tsx
│   │   ├── InspectProjectModal.tsx
│   │   └── EvaluacionInteligenteModal.tsx
│   └── InteractiveOrganigrama.tsx
├── hooks/                     # Hooks por dominio (lógica de negocio)
│   ├── useAuth.ts             # Autenticación (cookie httpOnly + sentinel)
│   ├── useRouting.ts          # Control acceso por rol (GET /api/auth/permissions)
│   ├── useProjects.ts         # Facade: useProjectsData + useProjectsWorkflows
│   ├── useProjectsData.ts     # Fetch + polling projects + auditLogs
│   ├── useProjectsWorkflows.ts# 12 handlers mutaciones (infra, procura, analistas, finanzas, cierre)
│   ├── useContractors.ts      # CRUD contratistas + rating
│   ├── useCatalog.ts          # Catálogo materiales
│   ├── useProveedores.ts      # Proveedores registrados + invitaciones
│   ├── useUsuarios.ts         # Gestión usuarios (admin)
│   ├── useAIConfig.ts         # Config IA (providers, models, keys, usage, sync)
│   ├── usePolling.ts          # Abstracción polling genérica
│   ├── usePolledFetch.ts      # Fetch con deduplicación por signature
│   ├── useRateLimit.ts        # Backoff exponencial login
│   ├── useOnlineStatus.ts     # Navigator.onLine + eventos
│   ├── useDebounce.ts
│   └── useSafeMotion.ts
├── views/                     # Vistas por rol (lazy-loaded en App.tsx)
│   ├── LoginScreen.tsx
│   ├── PresidenciaDashboard.tsx
│   ├── InfraestructuraMantenimientoPanel.tsx
│   ├── CierreObraPanel.tsx
│   ├── ProcuraPanel.tsx
│   ├── AnalistasPanel.tsx
│   ├── FinanzasPanel.tsx
│   ├── AIConfigPanel/         # index.tsx + AIConfigTable.tsx + ProviderIcon.tsx + SyncBanner.tsx + UsageDashboard.tsx
│   ├── UsuariosPanel/         # index.tsx + UserRow.tsx + UserRegistrationForm.tsx
│   ├── ProveedoresRegistrados/ # index.tsx + ContractorsSection.tsx + InviteModal.tsx + RatingModal.tsx + SupplierProposalsList.tsx
│   ├── ProveedoresConfigPanel.tsx
│   ├── MaterialConfigPanel.tsx
│   ├── MaterialesProveedores.tsx
│   └── PropuestaMaterialesPublica.tsx
├── routes/                    # Route guards + shells
│   ├── PublicRouteShell.tsx
│   ├── AuthenticatedRoutes.tsx
│   └── AccessDeniedView.tsx
├── services/
│   ├── api.ts                 # Wrapper web: CSRF (XSRF-TOKEN) + credentials:include
│   └── logger.ts              # Console en dev, preparado para Sentry/Logtail
├── test/
│   └── setup.ts               # Mocks globales (matchMedia, IntersectionObserver, ResizeObserver)
└── __tests__/                 # 32 suites, 431 tests
    ├── App.test.tsx
    ├── routes.test.tsx
    ├── hooks/*.test.ts        # Todos los hooks cubiertos
    ├── services/*.test.ts
    ├── utils.test.ts
    └── views/LoginScreen.test.tsx
```

### 2.2 Flujo de Autenticación (Web)

```
┌────────────────────────────────────────────────────────────────┐
│                    useAuth.ts (Web)                            │
├────────────────────────────────────────────────────────────────┤
│  1. Montaje: isValidatingSession = true                        │
│  2. GET /api/user (cookie httpOnly se adjunta automáticamente) │
│     ├─ OK → authToken = "authenticated" (sentinel en memoria)  │
│     │      authUser = {name, email, role} → localStorage       │
│     └─ FAIL → clearSession(), isValidatingSession = false      │
│  3. Login: POST /api/login (sin device_name)                   │
│     → Backend detecta SPA por Origin/Referer → setea cookie    │
│     → authToken = "authenticated", authUser → localStorage     │
│  4. Logout: POST /api/logout → clearSession()                  │
│  5. Inactividad: setInterval(15s) + Date.now() (sobrevive     │
│     suspensión PC/tab) + visibilitychange → reload si expira   │
└────────────────────────────────────────────────────────────────┘
```

**Puntos clave:**
- **NUNCA** se expone el token de sesión a JavaScript (cookie `httpOnly`)
- `authToken` es solo un **sentinel** (`"authenticated"`) para compatibilidad con hooks existentes
- CSRF: doble envío via cookie `XSRF-TOKEN` → header `X-XSRF-TOKEN` en mutaciones (ver `src/services/api.ts:58-76`)

### 2.3 Control de Acceso por Rol

```
useRouting.ts → GET /api/auth/permissions (config/permissions.php)
                    │
                    ▼
         roleAccess: Record<role, string[]>
                    │
                    ▼
         canAccess(path) → (roleAccess[activeRole] ?? []).includes(path)
                    │
                    ▼
         Fail-closed: sin rol o permisos no cargados → false
```

- **Fuente de verdad:** Backend (`config/permissions.php`) — no hardcodeado en frontend
- Carga asíncrona al autenticar; mientras carga `isLoadingPermissions = true` → UI muestra loading
- `ProtectedRoute` (routes.tsx) usa `canAccess` + `Navigate` replace para redirigir a `fallbackRoute`

### 2.4 Gestión de Proyectos (Hooks Compuestos)

```
useProjects (facade)
├── useProjectsData
│   ├── projects: Project[]
│   ├── auditLogs: AuditLog[]
│   ├── isLoading
│   ├── loadProjects()
│   └── Polling 25s (signature deduplication)
└── useProjectsWorkflows (12 handlers)
    ├── Infraestructura: handleAddProject, handleReviewProject
    ├── Procura: handleApproveInvestment, handleSelectContractor, handleRejectProposals
    ├── Analistas: handleAddProposal, handleRemoveProposal, handleSubmitComparative, handleImportSupplierProposals
    ├── Finanzas: handlePayAdvance, handlePayFinal
    └── Cierre: handleVerifyCompletion (report-finished / verify-completion)
```

**Patrón de mutación:** `apiFetch` → respuesta `Project` del backend → `syncProject()` actualiza estado local + refresca auditLogs.

### 2.5 Configuración IA (`useAIConfig.ts`)

- Providers: OpenAI, Anthropic, Gemini
- Modelos servidos por backend (`GET /ai/config/models` → `config/ai.php`)
- API Keys: backend envía solo `hasApiKey` + últimos 4 chars (nunca la key completa)
- Sync runtime: `POST /ai/config/sync` propaga config activa a evaluadores
- Usage tracking: tokens, costos, requests por provider/model/día

### 2.6 Testing Frontend

| Métrica | Valor |
|---------|-------|
| Test Files | 32 |
| Tests | 431 |
| Cobertura lines | 85% |
| Cobertura functions | 85% |
| Cobertura branches | 80% |
| Cobertura statements | 85% |

**Suites principales:**
- `App.test.tsx` — Orquestación principal, router, lazy views, roles
- `hooks/*.test.ts` — Todos los hooks de dominio (auth, routing, projects, contractors, catalog, usuarios, AIConfig, polling, etc.)
- `services/api.test.ts` — Wrapper CSRF, credentials, sentinel token
- `routes.test.tsx` — Guards, rutas públicas, redirecciones

---

## 3. Backend (`infraestructura-back/`)

### 3.1 Estructura de Directorios

```
app/
├── Http/
│   ├── Controllers/Api/
│   │   ├── AuthController.php        # Login (SPA cookie + Mobile token), me, permissions, logout
│   │   ├── ProjectController.php     # CRUD + 9 workflows (review, approve, proposals, pay, etc.)
│   │   ├── SupportController.php     # Contractors, materials, audit-logs, supplier invitations
│   │   ├── UserController.php        # Users, roles, toggle-status, reset-link
│   │   ├── ContractorController.php  # Config proveedores (admin)
│   │   ├── MaterialController.php    # Config materiales (admin)
│   │   ├── AiConfigController.php    # IA providers, models, keys, usage, sync, test
│   │   ├── AIEvaluationController.php# Evaluación propuestas con IA
│   │   ├── ProjectDocumentController.php # Planos/hojas cálculo (upload/download)
│   │   └── PushTokenController.php   # Expo push tokens
│   ├── Middleware/
│   │   ├── CheckRole.php             # role:ROLE1,ROLE2...
│   │   ├── RefreshSanctumToken.php   # Auto-refresh token próximo a expirar
│   │   ├── TokenFromCookie.php       # (diff sin commitear) Cookie → Bearer header
│   │   ├── AddCspHeaders.php         # CSP headers en responses API
│   │   └── VerifyCsrfToken.php       # (web group) CSRF protection
│   └── Kernel.php                    # Middleware groups: web (CSRF), api (Sanctum stateful + CSP)
├── Models/
│   ├── Project.php                   # 9 estados, relaciones: materials, proposals, payments, documents, auditLogs
│   ├── ProjectProposal.php
│   ├── ProjectPayment.php
│   ├── ProjectMaterial.php
│   ├── ProjectDocument.php
│   ├── Contractor.php
│   ├── MaterialCatalog.php
│   ├── SupplierInvitation.php
│   ├── SupplierMaterialProposal.php
│   ├── User.php
│   ├── AuditLog.php
│   ├── AiConfiguration.php
│   ├── AiUsageLog.php
│   └── PushToken.php
├── Services/AI/
│   ├── BaseAIProvider.php            # Abstracta (M-06 V2 ✅)
│   ├── OpenAIProvider.php
│   ├── AnthropicProvider.php
│   ├── GeminiProvider.php
│   ├── AIProviderInterface.php
│   ├── AIEvaluationService.php       # DIP: inyección deps explícita (M-07 V2 ✅)
│   ├── AiConfigurationService.php
│   └── DTOs: EvaluationPayload, EvaluationProject, EvaluationProposal
├── Resources/
│   └── ProjectResource.php           # API Resource con relaciones cargadas
├── Observers/
│   └── ProjectObserver.php
├── Notifications/
│   ├── ProjectStatusChanged.php
│   ├── UserPasswordReset.php
│   └── Channels/ExpoChannel.php
└── Providers/
    ├── AuthServiceProvider.php
    ├── RouteServiceProvider.php
    └── AppServiceProvider.php
```

### 3.2 Rutas API (`routes/api.php`)

#### Públicas (throttle:public-api)
| Método | Ruta | Controlador |
|--------|------|-------------|
| POST | `/login` | AuthController@login |
| POST | `/contractors` | SupportController@storeContractor |
| GET | `/public/invitations/{token}` | SupportController@getInvitationPublicInfo |
| POST | `/public/invitations/{token}/proposal` | SupportController@storeSupplierMaterialProposal |

#### Autenticadas (`auth:sanctum` + `refresh.token`)
| Método | Ruta | Middleware Rol | Descripción |
|--------|------|----------------|-------------|
| GET | `/user` | - | Usuario autenticado |
| GET | `/auth/permissions` | - | Matriz rutas por rol |
| POST | `/logout` | - | Cierre sesión |
| POST | `/push-tokens` | - | Registro token Expo |
| DELETE | `/push-tokens` | - | Eliminar token Expo |
| GET | `/modules` | - (throttle:catalog) | Módulos disponibles |
| GET | `/contractors` | - (throttle:catalog) | Listado contratistas |
| POST | `/contractors/{contractor}/rating` | - | Actualizar rating |
| GET | `/materials` | - (throttle:catalog) | Catálogo materiales |
| GET | `/audit-logs` | - (throttle:catalog) | Logs auditoría |
| POST | `/supplier-invitations` | - | Crear invitación proveedor |
| GET | `/supplier-material-proposals` | - | Propuestas materiales proveedores |
| GET/POST | `/projects` | - | Index, store, show |
| POST | `/projects/{project}/review` | `CIERRE_DE_OBRA,ADMIN,SUPERADMIN` | Revisión técnica |
| POST | `/projects/{project}/approve-investment` | `PROCURA,ADMIN,SUPERADMIN` | Aprobar inversión |
| POST | `/projects/{project}/proposals` | `ANALISTA,ADMIN,SUPERADMIN` | Cargar propuesta |
| DELETE | `/projects/{project}/proposals/{proposal}` | `ANALISTA,ADMIN,SUPERADMIN` | Eliminar propuesta |
| POST | `/projects/{project}/submit-comparative` | `ANALISTA,ADMIN,SUPERADMIN` | Enviar comparativa |
| POST | `/projects/{project}/import-supplier-proposals` | `ANALISTA,ADMIN,SUPERADMIN` | Importar de proveedores |
| POST | `/projects/{project}/reject-proposals` | `PROCURA,ADMIN,SUPERADMIN` | Rechazar comparativa |
| POST | `/projects/{project}/select-contractor` | `PROCURA,ADMIN,SUPERADMIN` | Adjudicar contratista |
| POST | `/projects/{project}/payments` | `FINANZAS,ADMIN,SUPERADMIN` | Pagos (ADVANCE/FINAL) |
| POST | `/projects/{project}/report-finished` | `CIERRE_DE_OBRA,ADMIN,SUPERADMIN` | Reportar finalizada |
| POST | `/projects/{project}/verify-completion` | `CIERRE_DE_OBRA,ADMIN,SUPERADMIN` | Verificar calidad |
| POST | `/ai/evaluate-proposals` | `PROCURA,ADMIN,SUPERADMIN` | Evaluación IA |
| GET/POST/DELETE | `/projects/{project}/documents` | - | Documentos (planos, cálculos) |
| **Admin (SUPERADMIN,ADMIN)** | | | |
| GET | `/roles` | - | Lista roles válidos |
| GET/POST/PATCH | `/users` | - | CRUD usuarios |
| POST | `/users/{user}/toggle-status` | - | Activar/desactivar |
| POST | `/users/{user}/send-reset-link` | - | Reset password |
| CRUD | `/contractors/config` | - | Config proveedores |
| CRUD | `/materials/config` | - | Config materiales |
| CRUD | `/ai/config` | - | Config IA completa |

### 3.3 Flujo de Estados de Proyecto (State Machine)

```
CREADO
    │
    ▼ (CIERRE_DE_OBRA: review)
REVISADO_CIERRE
    │
    ▼ (PROCURA: approve-investment)
CONFIRMADO_PROCURA
    │
    ▼ (ANALISTA: addProposal x N → submit-comparative)
COMPARATIVA_ENVIADA
    │
    ├─► (PROCURA: reject-proposals) ──► CONFIRMADO_PROCURA (vuelve atrás)
    │
    ▼ (PROCURA: select-contractor)
CONTRATADO
    │
    ▼ (FINANZAS: pay ADVANCE)
EN_EJECUCION
    │
    ▼ (CIERRE_DE_OBRA: report-finished)
VERIFICANDO_FINALIZACION
    │
    ├─► (CIERRE_DE_OBRA: verify-completion qualityVerified=false) ──► EN_EJECUCION
    │
    ▼ (CIERRE_DE_OBRA: verify-completion qualityVerified=true)
LISTO_PAGO_FINAL
    │
    ▼ (FINANZAS: pay FINAL)
COMPLETADO_PAGADO
```

**Validaciones de estado en `ProjectController`:**
- `review`: solo desde `CREADO`
- `approveInvestment`: solo desde `REVISADO_CIERRE`
- `addProposal`/`submitComparative`/`importSupplierProposals`: solo desde `CONFIRMADO_PROCURA`/`COMPARATIVA_ENVIADA`
- `rejectProposals`: solo desde `COMPARATIVA_ENVIADA` → vuelve a `CONFIRMADO_PROCURA`
- `selectContractor`: solo desde `COMPARATIVA_ENVIADA`
- `pay ADVANCE`: solo desde `CONTRATADO`
- `pay FINAL`: solo desde `LISTO_PAGO_FINAL` (bloquea reapertura de `COMPLETADO_PAGADO`)
- `reportFinished`: solo desde `EN_EJECUCION`
- `verifyCompletion`: solo desde `VERIFICANDO_FINALIZACION`

### 3.4 Autenticación Dual (SPA + Mobile)

```php
// AuthController@login
if ($request->hasSession()) {
    // SPA: cookie httpOnly de sesión (Sanctum stateful)
    Auth::guard('web')->login($user);
    $request->session()->regenerate();
    return response()->json(['user' => $userPayload]);
}

// Mobile: Bearer token (PersonalAccessToken)
if ($user->tokens()->count() >= 2) {
    $user->tokens()->oldest()->first()->delete(); // Límite 2 sesiones
}
$token = $user->createToken($deviceName, ['*'], $expiresAt)->plainTextToken;
return response()->json(['token' => $token, 'user' => $userPayload]);
```

- **Web:** Cookie `sanctum_token` (`httpOnly`, `Secure`, `SameSite=None` en prod) + `XSRF-TOKEN` para CSRF
- **Mobile:** Token Bearer en header `Authorization` (expiración configurable `sanctum.expiration`)
- **Refresh automático:** Middleware `RefreshSanctumToken` renueva token próximo a expirar (grace period)

### 3.5 Evaluación IA (`AIEvaluationController` + `AIEvaluationService`)

- Providers: OpenAI, Anthropic, Gemini (polimorfismo via `BaseAIProvider`)
- DTOs tipados: `EvaluationPayload`, `EvaluationProject`, `EvaluationProposal`
- Endpoint: `POST /ai/evaluate-proposals` (rol `PROCURA,ADMIN,SUPERADMIN`)
- Configuración servida desde `config/ai.php` + BD (`AiConfiguration`)
- Sync runtime: `POST /ai/config/sync` → cachea config activa en archivo/redis para evaluadores
- API Keys: **nunca** expuestas al frontend (`hasApiKey` + últimos 4 chars)

### 3.6 Testing Backend

| Métrica | Valor |
|---------|-------|
| Tests totales | 144 |
| Suites | 10 |
| Tiempo | ~12.7s |

**Suites:**
- `AuthTest` (13) — Login, logout, me, permissions, max 2 sessions, web session cookie
- `ProjectLifecycleTest` (19) — Happy path + **guardas de estado** (reject, pay advance/final, report, verify)
- `RoleMiddlewareTest` (54) — Matriz completa roles × endpoints (allow/deny/superadmin/admin)
- `ContractorMaterialTest` (11) — CRUD + rating + public registration
- `SupplierInvitationTest` (10) — Invitaciones, expiración, propuestas, importación
- `UserManagementTest` (9) — Roles, CRUD users, toggle-status, reset-link
- `AiConfigModelsTest` (3) — Modelos por provider, auth required
- `TokenExpirationTest` (6) — Expiración, refresh, grace period
- `TokenExpirationIntegrationTest` (8) — Integración real con middleware refresh
- `ExampleTest` (2) — Básicos

---

## 4. Mobile (`mobile/`)

### 4.1 Estructura

```
mobile/
├── App.tsx                    # Root: QueryClientProvider + NavigationContainer + MainScreen
├── api.ts                     # requestJson (Bearer token + offline queue)
├── config.ts                  # API_BASE_URL (hardcodeado ⚠️ pendiente EXPO_PUBLIC_API_URL)
├── app.config.js              # Config Expo dinámica (usesCleartextTraffic solo dev)
├── types.ts                   # Tipos compartidos (Project, Contractor, Screen, etc.)
├── styles.ts                  # StyleSheet.create centralizado
├── hooks/
│   ├── useAuth.ts             # Login/token storage (AsyncStorage) + auto-refresh
│   ├── useProjects.ts         # TanStack Query (projects, mutations)
│   ├── useContractors.ts      # Query contractors
│   ├── useMaterials.ts        # Query materials
│   ├── useAuditLogs.ts        # Query audit logs
│   ├── useOfflineQueue.ts     # Cola mutaciones offline → replay online
│   └── useNotifications.ts    # Expo push notifications
├── components/
│   ├── AppShell.tsx           # Layout con tabs + header
│   ├── LoginScreen.tsx
│   ├── PublicContractorScreen.tsx
│   ├── PresidenciaScreen.tsx
│   ├── InfraScreen.tsx
│   ├── CierreScreen.tsx
│   ├── ProcuraScreen.tsx
│   ├── AnalistasScreen.tsx
│   ├── FinanzasScreen.tsx
│   ├── ContractorsScreen.tsx
│   ├── ProjectModal.tsx
│   ├── StatsStrip.tsx
│   ├── OfflineBanner.tsx
│   ├── NotificationHandler.tsx
│   └── UI: StatCard, SectionTitle, Field, PrimaryButton, ProjectCard
└── package.json
```

### 4.2 Diferencias Clave vs Web

| Aspecto | Web | Mobile |
|---------|-----|--------|
| Auth | Cookie httpOnly (Sanctum SPA) | Bearer token (PersonalAccessToken) |
| Estado | React hooks + polling | TanStack Query (cache, invalidation, retry) |
| Offline | No | `useOfflineQueue` (persistencia + replay) |
| Push | No | Expo Push Notifications |
| Navegación | React Router DOM | React Navigation (native stack) |
| CSRF | XSRF-TOKEN cookie + header | No aplica (Bearer token) |

### 4.3 Flujo Offline

```
Mutación (pay, review, etc.)
        │
        ▼
┌───────────────────┐
│ ¿Hay red?         │──No──► Enqueue en AsyncStorage (path, method, body, description)
└───────────────────┘
        │Sí
        ▼
requestJson(token, path, options)
        │
        ├─► OK → invalidateQueries(['projects'], ['auditLogs'])
        │
        └─► NetworkError → enqueue + silent (UI no bloquea)
                │
                ▼
        Online → processQueue() → replay secuencial → invalidateQueries
```

---

## 5. Shared Package (`packages/shared/`)

```typescript
// packages/shared/src/api.ts — Core HTTP client (agnóstico de plataforma)
export function setApiBaseUrl(url: string)
export function setTokenRefreshHandler(handler: (path, options) => Promise<Response>)
export function apiFetch<T>(path, options): Promise<T>
export function apiDownload(path, options): Promise<Blob>

// packages/shared/src/types.ts — Tipos compartidos
export interface Project { id, title, type, status, materials[], proposals[], payments[], documents[], ... }
export interface Proposal { id, contractor_code, contractor_name_snapshot, material_cost, labor_cost, total_cost, ... }
export interface AuditLog { id, project_id, project_title_snapshot, role, user_id, user_name_snapshot, action, logged_at, details }
export interface Contractor { code, name, specialty, contact, rating, status, ... }
export interface MaterialCatalog { id, name, unit, estimated_price, status, ... }
export interface AiConfigRecord { id, provider, model, hasApiKey, apiKey, baseUrl, maxTokens, isActive, isFallback, ... }
export interface AiUsageData { daily[], byProvider[], byModel[], totals }

// packages/shared/src/utils.ts — Utilidades puras
export function formatCurrency(n: number): string
export function formatDate(date: string | Date): string
export function getRoleColor(role: string): string
export function signatureOf(projects, audit): string  // Para deduplicación polling
```

---

## 6. Seguridad

### 6.1 Implementado ✅

| Control | Frontend | Backend | Mobile |
|---------|----------|---------|--------|
| Autenticación httpOnly cookie (SPA) | ✅ | ✅ | N/A |
| Bearer token (Mobile) | N/A | ✅ | ✅ |
| CSRF doble envío (XSRF-TOKEN) | ✅ `api.ts` | ✅ `EnsureFrontendRequestsAreStateful` | N/A |
| Rate limiting | ✅ `useRateLimit` (login) | ✅ `throttle:public-api`, `throttle:catalog`, `throttle:api` | ✅ |
| Validación roles (middleware) | ✅ `useRouting` (UI) | ✅ `CheckRole` (API) | ✅ (UI) |
| Sanitización XSS (DOMPurify) | ✅ `useProveedores` | - | - |
| CSP headers | ✅ Prod (nginx/Vercel) | ✅ `AddCspHeaders` middleware | - |
| `upgrade-insecure-requests` | ✅ Prod build | - | - |
| Contraseñas: hash bcrypt | - | ✅ `Hash::check` | - |
| Límite 2 sesiones activas | - | ✅ `AuthController` | - |
| Auto-refresh token (grace period) | - | ✅ `RefreshSanctumToken` | ✅ `useAuth` |
| Logs auditoría inmutables | - | ✅ `AuditLog` model + `log()` en controllers | - |

---

## 7. Reglas de Negocio Clave

### 7.1 Ciclo de Vida de Obra (9 Estados)

Ver sección 3.3 para diagrama completo. Cada transición valida:
- **Rol autorizado** (middleware `role:`)
- **Estado de origen correcto** (guards en `ProjectController`)
- **Datos requeridos** (validación request)

### 7.2 Matriz de Permisos (Fuente: `config/permissions.php`)

```php
return [
    'SUPERADMIN' => ['/presidencia', '/infraestructura', '/cierre-obra', '/procura', '/analistas', '/finanzas', '/catalogos', '/usuarios', '/config-proveedores', '/config-materiales', '/config-ia'],
    'ADMIN'      => ['/infraestructura', '/cierre-obra', '/procura', '/analistas', '/finanzas', '/catalogos', '/usuarios', '/config-proveedores', '/config-materiales', '/config-ia'],
    'PRESIDENCIA'=> ['/presidencia', '/catalogos'],
    'INFRAESTRUCTURA' => ['/infraestructura'],
    'CIERRE_DE_OBRA'  => ['/cierre-obra'],
    'PROCURA'         => ['/procura', '/catalogos'],
    'ANALISTA'        => ['/analistas'],
    'FINANZAS'        => ['/finanzas'],
    'CATALOGOS'       => ['/catalogos'],
];
```

- Frontend consume via `GET /api/auth/permissions` → `useRouting.ts`
- Backend valida via middleware `role:` en cada ruta
- **Fail-closed:** rol desconocido o permisos no cargados → acceso denegado

### 7.3 Pagos (Anticipo / Final)

| Tipo | Estado Requerido | Efecto en Estado |
|------|------------------|------------------|
| `ADVANCE` | `CONTRATADO` | → `EN_EJECUCION` |
| `FINAL` | `LISTO_PAGO_FINAL` | → `COMPLETADO_PAGADO` |

**Regla crítica:** `pay FINAL` sobre `COMPLETADO_PAGADO` **reabre el proyecto** (`updateOrCreate` actualiza pago + `update()` revierte status a `EN_EJECUCION`). Solo disciplina de frontend lo previene; **no hay constraint en BD**.

### 7.4 Invitaciones a Proveedores

- `POST /supplier-invitations` → crea `SupplierInvitation` con token único
- Link público: `GET /public/invitations/{token}` (expira si se usa o se reemplaza)
- Proveedor envía propuesta materiales: `POST /public/invitations/{token}/proposal`
- Analista importa: `POST /projects/{project}/import-supplier-proposals` → crea `ProjectProposal` automáticamente

### 7.5 Evaluación IA

- Solo rol `PROCURA,ADMIN,SUPERADMIN`
- Input: proyecto + propuestas → Output: ranking + justificación por proveedor
- Providers configurables en `config/ai.php` + BD (`AiConfiguration`)
- Sync runtime propaga config activa a evaluadores (`POST /ai/config/sync`)

---

## 8. Testing

### 8.1 Frontend (Vitest + jsdom)

```bash
npm test           # 431 tests, 32 suites, ~30s
npm run test:watch # Modo watch
npm run test:coverage # Con reporte cobertura
npm run lint       # tsc --noEmit (0 errores)
```

**Cobertura objetivo (vite.config.ts):**
- Lines: 85%
- Functions: 85%
- Branches: 80% (real medido hoy)
- Statements: 85%

### 8.2 Backend (PHPUnit)

```bash
php artisan test   # 144 tests, 10 suites, ~12.7s
```

**Suites críticas:**
- `ProjectLifecycleTest` — Cubre **guardas de estado** (pay advance/final, report, verify, reject)
- `RoleMiddlewareTest` — Matriz completa 9 roles × 18 endpoints (allow/deny/superadmin/admin)

### 8.3 Mobile

```bash
cd mobile && npm test  # Jest + React Native Testing Library
```

---

## 9. Configuración y Despliegue

### 9.1 Variables de Entorno

#### Frontend Web (`.env`)
```env
VITE_API_URL=https://api.tudominio.com  # SIN /api al final (proxy lo añade)
```

#### Backend (`.env`)
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.tudominio.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=infraestructura
DB_USERNAME=...
DB_PASSWORD=...

SANCTUM_STATEFUL_DOMAINS=tudominio.com,www.tudominio.com
SESSION_DOMAIN=.tudominio.com
SANCTUM_COOKIE_SAME_SITE=none
SANCTUM_COOKIE_SECURE=true
SANCTUM_EXPIRATION=60  # minutos

EXPO_PUSH_KEY=...  # Para notificaciones push
```

#### Mobile (`.env`)
```env
EXPO_PUBLIC_API_URL=https://api.tudominio.com/api  # CON /api
```

### 9.2 Proxy Producción (Requerido por C-NEW-3)

El frontend **requiere** un proxy que reenvíe `/api/*` al backend:

**Nginx:**
```nginx
location /api/ {
    proxy_pass https://backend-interno:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Vercel (`vercel.json`):**
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.tudominio.com/api/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; ..." },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### 9.3 Build y Deploy

```bash
# Frontend
npm run build        # Genera dist/ (SPA estática)
npm run preview      # Preview local (requiere preview.proxy en vite.config.ts)

# Backend
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

# Mobile (Expo)
cd mobile && eas build --platform all
```

---

## 10. Deuda Técnica y Pendientes (Resumen)

### 10.1 Bloqueantes Release (CRITICAL V3) — **RESUELTOS ✅**

Los 6 hallazgos críticos de la auditoría V3 (27/07/2026) han sido corregidos:

1. **CSRF (C-NEW-1/CRIT-01)** — Implementado flujo SPA nativo Sanctum (`EnsureFrontendRequestsAreStateful` + `XSRF-TOKEN`); `SameSite=Lax` restaurado
2. **Auth sin verificación E2E (C-NEW-2)** — Verificado login cookie en navegador real; eliminados `src/__tests__/diagnostics/`
3. **Contrato API/proxy prod (C-NEW-3)** — Documentado `VITE_API_URL` sin `/api`; añadido config proxy prod (nginx/Vercel/Netlify)
4. **CSP a producción (C-NEW-4)** — Headers movidos a capa servidor (nginx/Cloudflare/Vercel); verificado `curl -I`
5. **CorsDiagnosticController (CRIT-02)** — Eliminado endpoint de diagnóstico
6. **Dump BD con PII (CRIT-03)** — `.sql` removido de git; seeder con datos ficticios; password admin rotado

### 10.2 Alta Prioridad

7. **Fix M-04 incompleto (A-1)** — Extraer `AuditLogService` único; propagar `Str::random(4)` a 3 focos
8. **Guardas estado pagos (A-6)** — State machine en BD o validaciones estrictas en `ProjectController::pay()` + tests transiciones inválidas
9. **CVE react-router** — Evaluar `npm audit fix --force` (breaking changes rutas)
10. **Tests vistas críticas** — 6 vistas sin test directo (PresidenciaDashboard, InfraestructuraMantenimientoPanel, CierreObraPanel, ProcuraPanel, AnalistasPanel, FinanzasPanel)
11. **Mobile `EXPO_PUBLIC_API_URL`** — Migrar `config.ts` hardcodeado a variable entorno

### 10.3 Media (Clean Code)

- God Components: `UsuariosPanel` (742L), `ProveedoresRegistrados` (634L, **creció**), `ProcuraPanel` (555L)
- `PROVIDER_MODELS` hardcodeado en `useAIConfig` (debería venir de endpoint)
- `ROLES`/`ROLE_COLORS` hardcodeados (deberían venir de endpoint)
- `roleAccess` hardcodeado en bundle (debería venir de `/api/auth/permissions`)
- `useProjectFinancials` no existe en `PresidenciaDashboard` (cálculos inline)
- `rowKey` por índice en `ProveedoresRegistrados`
- Columnas tablas inline sin `useMemo` (`AIConfigTable`)

### 10.4 Baja (Docs/Mejoras)

- README.md (template AI Studio)
- Coverage threshold 70% → 85%
- Migrar a CSS modules (remover `'unsafe-inline'` CSP)
- FLUJO_SISTEMA.md desactualizado

---

## 11. Comandos Útiles

```bash
# Frontend
npm run dev              # Dev server puerto 3000
npm run build            # Build producción
npm run lint             # tsc --noEmit
npm test                 # Tests
npm run test:coverage    # Tests + cobertura

# Backend
php artisan serve        # Dev server puerto 8000
php artisan test         # Tests
php artisan migrate      # Migraciones
php artisan db:seed      # Seeders
php artisan config:clear # Limpiar cache config
php artisan route:list   # Listar rutas

# Mobile
cd mobile && npm start   # Expo dev server
cd mobile && npm run android/ios/web

# Shared
cd packages/shared && npm run build  # Compila a dist/
```

---

## 12. Referencias de Auditoría

| Documento | Fecha | Hallazgos |
|-----------|-------|-----------|
| `AUDITORIA_INTERNA_FRONT_2026-07-23.md` | 23/07/2026 | V1 interna |
| `AUDITORIA_front_24_07_2026 / V1.md` | 24/07/2026 | V1 oficial |
| `AUDITORIA_front_24_07_2026 // V2.md` | 24/07/2026 | V2 profunda (106 hallazgos) |
| `AUDITORIA_front_27_07_2026_V3.md` | 27/07/2026 | **V3 Front** — 6 CRITICAL **resueltos** |
| `AUDITORIA_back_27_07_2026_V3.md` | 27/07/2026 | **V3 Back** — 3 CRITICAL **resueltos** |
| `PENDIENTES.md` | Actualizado 27/07/2026 | Consolidado V1+V2+V3 Front+Back |

---

**Fin de la documentación.**  
*Generada automáticamente tras análisis completo de código, ejecución de tests (431 front + 144 back) y revisión de auditorías V1-V3.*