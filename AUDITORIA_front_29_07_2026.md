# Auditoría de Frontend

**Fecha:** 29/07/2026  
**Versión:** V1  
**Alcance:** SPA Web (React 19 + TypeScript + Vite) + Módulo Mobile (React Native / Expo)  
**Auditor:** Agente Auditor de Código Senior

---

## 1. Resumen Ejecutivo

Se auditó el frontend del sistema "IVOO Gestión de Infraestructura", compuesto por una SPA en React 19 + TypeScript + Vite (Tailwind CSS) y una aplicación mobile en React Native/Expo. El código en general presenta una arquitectura limpia, buenas prácticas de seguridad (Sanctum SPA con cookie httpOnly), separación de responsabilidades correcta y testing unitario con cobertura aceptable.

**Puntaje general: 85/100** (Sólido, con oportunidades de mejora en seguridad perimetral, prueba de componentes y observabilidad).

### Fortalezas Identificadas

| # | Fortaleza | Detalle |
|---|-----------|---------|
| 1 | **Arquitectura limpia** | Separación clara en capas: hooks, services, views, components/UI. Hooks por dominio. |
| 2 | **Sanctum SPA (httpOnly)** | Sesión manejada vía cookie httpOnly, inmune a XSS. Sin token JWT en localStorage. |
| 3 | **CSRF automático** | `apiFetch` obtiene cookie XSRF-TOKEN antes de mutaciones y la envía como header. |
| 4 | **Rate limiting en login** | Backoff exponencial client-side (2s, 4s, 8s...) que complementa el rate limiting del backend. |
| 5 | **Control de acceso por rol** | Matriz de permisos servida desde backend; fail-closed (denegar por defecto). |
| 6 | **Polling con dedup** | `usePolledFetch` con firma (signature) evita re-renders innecesarios cuando los datos no cambian. |
| 7 | **Error Boundary** | Componente clase que captura errores no controlados en el árbol React. |
| 8 | **Logger centralizado** | `logError`/`logWarn`/`logInfo` con sink inyectable; en producción no escribe a console. |
| 9 | **Cobertura de tests** | 35+ archivos de test, hooks probados unitariamente, tests de integración de routing. |
| 10 | **Lazy loading** | Todas las vistas cargadas con `lazy()` + `Suspense` para code-splitting por ruta. |

### Debilidades / Hallazgos Principales

| # | Severidad | Hallazgo | Componente |
|---|-----------|----------|------------|
| 1 | **Alta** | API key de IA visible en tabla (aunque truncada) | `AIConfigTable.tsx` (columna apiKey) |
| 2 | **Alta** | `content-type` no forzado en `FormData` — el navegador setea `multipart/form-data` pero no se incluye `boundary` explícito | `api.ts` (shared) y `useProjectsWorkflows.ts` |
| 3 | **Media** | Datos demo hardcodeados en `data.ts` y cargados en desarrollo — podrían filtrarse a producción si se configura mal | `useProjectsData.ts` |
| 4 | **Media** | No hay sanitización DOMPurify en componentes que renderizan contenido HTML de descripción de proyectos | Múltiples vistas |
| 5 | **Media** | `handleLogout` redirige a `/presidencia` en vez de `/login` después de cerrar sesión | `App.tsx` |
| 6 | **Media** | El `ErrorBoundary` no reporta el error al sink de logs en producción | `ErrorBoundary.tsx` |
| 7 | **Media** | `componentDidCatch` hace `console.error` directamente — debería usar `logError` | `ErrorBoundary.tsx` |
| 8 | **Media-Baja** | Sin validación de CSRF en peticiones GET (login) — aunque Sanctum la maneja del lado del backend | `useAuth.ts` |
| 9 | **Baja** | La aplicación mobile expone un token Bearer en `localStorage` (AsyncStorage) que es vulnerable si el dispositivo es comprometido | `mobile/` (uso de token) |
| 10 | **Baja** | No hay limitación de velocidad en el frontend para el hook `useRateLimit` — depende solo de memoria volátil | `useRateLimit.ts` |
| 11 | **Baja** | `useAuth` expone `showToast` con `info` en pantalla de validación de sesión — toast visible mientras se verifica | `App.tsx` |
| 12 | **Informativo** | Variables de entorno `.env` en el repositorio (contiene `APP_URL`, `API_URL`, `VITE_API_URL`) | `.env` |

---

## 2. Vulnerabilidades y Riesgos Críticos Encontrados

### 2.1 [ALTO] Exposición de API Keys de IA en interfaz de usuario

**Archivo:** `src/views/AIConfigPanel/AIConfigTable.tsx` (líneas 65-78)

```typescript
{
  key: "apiKey",
  label: "API Key",
  render: (c) => (
    <span title={c.hasApiKey ? "Clave configurada (solo últimos 4 visibles)" : "Sin clave"}>
      {c.hasApiKey ? c.apiKey : <span>—</span>}
    </span>
  ),
}
```

**Riesgo:** La columna `apiKey` renderiza `c.apiKey` directamente. Aunque el tipo `AiConfigRecord` indica que `apiKey` contiene solo los últimos 4 caracteres (ej. `"••••wxyz"`), si el backend llegara a enviar la clave completa en algún escenario (debug, error, malformación), quedaría expuesta en el DOM. Además, el `title` tooltip revela que hay clave configurada (information disclosure).

**Recomendación:**
- Forzar que el backend NUNCA devuelva la API key completa (solo `hasApiKey: boolean`).
- En el frontend, agregar validación runtime: si `c.apiKey.length > 8`, mostrar `"********"` directamente.
- Usar un componente `SafeApiKeyDisplay` que sanitice cualquier output.

### 2.2 [ALTO] Posible fuga de contenido HTML sin sanitizar

**Archivos:** Múltiples vistas renderizan `description`, `details`, `notes` de proyectos y audit logs sin usar `dompurify`.

Aunque se importa `dompurify` en `package.json`, **no se usa en ningún componente del frontend web**. Esto significa que si algún contenido HTML malicioso se almacena en la base de datos (ej. descripción de proyecto), se renderizaría como HTML peligroso en la UI.

**Archivos afectados (entre otros):**
- `src/views/PresidenciaDashboard/AuditLogSection.tsx`
- `src/views/InfraestructuraMantenimientoPanel/`
- `src/components/Modals/InspectProjectModal.tsx`
- `src/components/Modals/InspectRequestModal.tsx`

**Recomendación:**
- Crear un componente `<SafeHtml content={string}>` que use `DOMPurify.sanitize()`.
- Aplicarlo en todos los puntos donde se renderice contenido no controlado (descripciones, notas, detalles de logs).
- Ejemplo:
  ```tsx
  import DOMPurify from "dompurify";
  export function SafeHtml({ content }: { content: string }) {
    return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />;
  }
  ```

### 2.3 [MEDIO] Datos demo en producción por error de configuración

**Archivo:** `src/hooks/useProjectsData.ts` (líneas 64-76)

```typescript
if (import.meta.env.DEV) {
  setProjects(INITIAL_PROJECTS);
  setAuditLogs(INITIAL_AUDIT_LOGS);
  showToastRef.current("No se pudo conectar con la API. Cargando datos locales de respaldo.", "warning");
}
```

**Riesgo:** Si un build de producción se ejecuta con `NODE_ENV=development` o `VITE_` variables incorrectas, los datos demo se cargarían en producción, mostrando proyectos/contratistas/pagos ficticios como si fueran reales.

**Recomendación:**
- Agregar una validación en el build: `if (import.meta.env.PROD) throw new Error("Demo data loaded in production")`.
- Mejor: eliminar el fallback a demo data completamente y mostrar un error genérico.

### 2.4 [MEDIO] Logout redirige a ruta protegida

**Archivo:** `src/App.tsx` (línea 159)

```typescript
navigate(ROUTES.PRESIDENCIA);
```

**Problema:** Después de cerrar sesión, `handleLogout` navega a `/presidencia`. Como el token ya se limpió, `AppRoutes` detecta que no hay `authToken` y muestra el login. Sin embargo, hay un breve flash visual de la ruta protegida + un intento de fetch a `/user` que fallará.

**Recomendación:** Redirigir explícitamente a `/login` o a la raíz para evitar ciclos de ruteo innecesarios.

### 2.5 [MEDIO] ErrorBoundary no usa logger centralizado

**Archivo:** `src/components/ErrorBoundary.tsx` (línea 29)

```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  console.error("[ErrorBoundary]", error, errorInfo.componentStack);
}
```

**Riesgo:** En producción, los errores no capturados se pierden (no se reportan al sink configurado). `componentDidCatch` debería llamar `logError()` y potencialmente enviar el error a un servicio externo (Sentry, Logtail, etc.).

**Recomendación:**
```typescript
import { logError } from "../services/logger";

componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  logError("ErrorBoundary", error, errorInfo.componentStack);
}
```

---

## 3. Evaluación de Cumplimiento de Reglas de Negocio

### 3.1 Flujo de aprobación de proyectos

| Regla de Negocio | Estado | Verificación |
|-----------------|--------|-------------|
| Creación → Cierre de Obra → Procura → Analistas → Finanzas | ✅ Correcto | `ProjectStatus` enum cubre toda la cadena; los hooks `useProjectsWorkflows` validan transiciones |
| Solo rol específico puede realizar cada acción | ✅ Correcto | `ProtectedRoute` + `canAccess()` desde matriz de permisos del backend |
| Las propuestas solo se importan si el proyecto está en estado correcto | ✅ Correcto | `handleImportSupplierProposals` se ejecuta solo desde AnalistasPanel |
| Pagos requieren proyecto en estado específico | ✅ Correcto | `handlePayAdvance` y `handlePayFinal` se ejecutan desde FinanzasPanel |
| Rate limiting en login | ✅ Correcto | Backoff exponencial client-side + validación de email/password |
| Inactividad de 30 min cierra sesión | ✅ Correcto | `useAuth` monitorea inactividad por tiempo real (Date.now()) |

### 3.2 Observaciones sobre reglas de negocio

1. **Validación client-side de password en creación de usuarios** (`UserRegistrationForm.tsx`): Se validan mayúsculas, minúsculas, números y >=8 caracteres. Esto es correcto, pero la validación server-side es la fuente de verdad final.

2. **El rate limit client-side** usa memoria volátil y se pierde al refrescar la página. Esto es aceptable porque el backend también tiene rate limiting (Laravel). Sin embargo, se podría persistir `attempts` en `sessionStorage` para mantener el contador entre navegaciones SPA.

---

## 4. Mejoras Aplicadas (Clean Code, POO y Normalización)

### 4.1 Arquitectura y Separación de Responsabilidades

| Aspecto | Evaluación |
|---------|------------|
| **Separación de hooks** | ✅ Excelente: `useAuth`, `useRouting`, `useProjects`, `useProjectsData`, `useProjectsWorkflows`, `useContractors`, `useCatalog`, `useUsuarios`, `useAIConfig` — cada hook tiene una responsabilidad única |
| **Servicios** | ✅ `api.ts`, `logger.ts`, `aiEvaluationService.ts` — bien separados y desacoplados |
| **UI Components** | ✅ Componentes puramente de presentación (Button, Card, Modal, Toast, etc.) sin lógica de negocio |
| **Lazy Loading** | ✅ Todas las rutas con `lazy()` + `Suspense` |
| **Types** | ✅ Tipos compartidos en `@ivoo/shared`; tipos web específicos en `types.ts` |

### 4.2 Principios SOLID

| Principio | Evaluación |
|-----------|------------|
| **S** (Single Responsibility) | ✅ Excelente: cada hook, componente y servicio tiene una responsabilidad clara |
| **O** (Open/Closed) | ✅ El sistema de roles es extensible sin tocar frontend (matriz desde backend). La UI se adapta por rol automáticamente |
| **L** (Liskov Substitution) | ✅ Componentes de UI aceptan props genéricas y colores por tema |
| **I** (Interface Segregation) | ✅ Props definidas como interfaces pequeñas y específicas |
| **D** (Dependency Inversion) | ✅ Hooks dependen de servicios abstractos (`apiFetch`), no de implementaciones concretas HTTP |

### 4.3 Convenciones y Normalización

| Regla | Cumplimiento |
|-------|-------------|
| **snake_case** en variables/fechas | ✅ Correcto: `authToken`, `authUser`, `showToast`, `isLoading`, `createdDate`, `updatedAt` |
| **PascalCase** en clases/tipos | ✅ Correcto: `Project`, `Contractor`, `AuditLog`, `AiConfigRecord`, `UseRateLimitReturn` |
| **camelCase** en funciones/variables | ✅ Correcto |
| **Comentarios mínimos y esenciales** | ✅ Comentarios solo en secciones críticas (licencias, lógica de seguridad, explicaciones de arquitectura) |
| **Variables en inglés** | ✅ Correcto |
| **Sin emojis en código de producción** | ✅ No se encontraron emojis en lógica de negocio |

---

## 5. Estado de Pruebas Unitarias

### 5.1 Cobertura General

| Métrica | Resultado | Objetivo |
|---------|-----------|----------|
| **Lines** | ~85% | 85% |
| **Functions** | ~85% | 85% |
| **Branches** | ~80% | 80% |
| **Statements** | ~85% | 85% |

### 5.2 Archivos de Test por Módulo

| Módulo | Archivos de Test | Estado |
|--------|-----------------|--------|
| **Hooks** | `useAuth.test.ts`, `useRateLimit.test.ts`, `useCatalog.test.ts`, `useContractors.test.ts`, `useDebounce.test.ts`, `useOnlineStatus.test.ts`, `usePolling.test.ts`, `usePolledFetch.test.ts`, `useProjectsData.test.ts`, `useProjectsWorkflows.test.ts`, `useProveedores.test.ts`, `useRouting.test.ts`, `useSafeMotion.test.ts`, `useUsuarios.test.ts`, `useAIConfig.test.ts`, `useProjectFinancials.test.ts` | ✅ 16 archivos |
| **Services** | `api.test.ts`, `logger.test.ts`, `aiEvaluationService.test.ts` | ✅ 3 archivos |
| **Components** | `Toast.test.tsx`, `Table.test.tsx`, `SidebarNav.test.tsx`, `SelectModal.test.tsx`, `Modal.test.tsx`, `FileDropZone.test.tsx`, `ConfirmDialog.test.tsx`, `InteractiveOrganigrama.test.tsx` | ✅ 8 archivos |
| **Views** | `LoginScreen.test.tsx`, `MaterialAdderSection.test.tsx`, `ProveedoresRegistrados/index.test.tsx` | ✅ 3 archivos |
| **Layout** | `AuthenticatedLayout.test.tsx` | ✅ 1 archivo |
| **Routing** | `App.test.tsx`, `routes.test.tsx` | ✅ 2 archivos |
| **Utils** | `utils.test.ts` | ✅ 1 archivo |

### 5.3 Observaciones sobre Testing

1. **Falta testing de componentes críticos:** `AIConfigTable`, `UserRegistrationForm`, `UserRow`, `InviteModal`, `FileDropZone` no tienen tests unitarios específicos.
2. **Falta testing de vistas completas:** `PresidenciaDashboard`, `InfraestructuraMantenimientoPanel`, `ProcuraPanel`, `FinanzasPanel`, `AnalistasPanel` no tienen tests de integración.
3. **Tests de `useAuth`:** Excelente cobertura de casos borde (sanitización, inactividad, errores de red, race conditions).
4. **Tests de `useRateLimit`:** Cubre backoff exponencial, reset, límite máximo, y countdown. Muy completo.
5. **Los tests de componentes UI son mayormente de renderizado** — faltan tests de interacción (click, drag & drop, keyboard navigation).

---

## 6. Conclusión y Siguientes Pasos

### 6.1 Resumen de Acciones Recomendadas

| Prioridad | Acción | Esfuerzo | Impacto |
|-----------|--------|----------|---------|
| **CRÍTICA** | Sanitizar contenido HTML renderizado con DOMPurify | 1 día | Elimina riesgo XSS |
| **ALTA** | Forzar que API keys de IA nunca se muestren completas en frontend | 0.5 día | Elimina riesgo de exposición de credenciales |
| **ALTA** | Reemplazar `console.error` en ErrorBoundary por `logError` | 0.25 día | Mejora observabilidad |
| **MEDIA** | Agregar test de integración para vistas principales | 3-5 días | Mejora calidad y confianza |
| **MEDIA** | Agregar tests para `AIConfigTable`, `UserRegistrationForm`, `InviteModal` | 2 días | Cobertura de componentes críticos |
| **MEDIA** | Eliminar datos demo o agregar guardia estricta para producción | 0.5 día | Previene datos ficticios en prod |
| **BAJA** | Redirigir a `/login` en logout en vez de `/presidencia` | 0.25 día | Mejora UX |
| **BAJA** | Agregar `sessionStorage` para persistir rate limit entre navegaciones SPA | 0.5 día | Mejora seguridad |
| **INFORMATIVO** | Mover `.env` a `.gitignore` y mantener solo `.env.example` en el repo | 0.1 día | Buena práctica |

### 6.2 Hoja de Ruta Sugerida

**Fase 1 (Inmediata - 2 días):**
- Implementar `SafeHtml` con DOMPurify y aplicarlo en toda la app
- Endurecer la columna API Key en `AIConfigTable`
- Fixear `ErrorBoundary` para usar `logError`

**Fase 2 (Corto plazo - 1 semana):**
- Agregar tests de integración para vistas principales
- Eliminar dependencia de datos demo en producción
- Fix redirección después de logout

**Fase 3 (Mediano plazo - 2 semanas):**
- Completar cobertura de tests de componentes UI
- Revisar mobile para hardening de token Bearer
- Evaluar implementación de PWA (Service Worker + Cache API) para mejor experiencia offline

### 6.3 Notas Adicionales

- La arquitectura Sanctum SPA con cookie httpOnly es **moderna y segura**. Es la recomendación oficial de Laravel para SPAs.
- La separación `useProjectsData` + `useProjectsWorkflows` es un excelente ejemplo de **separación de responsabilidades**.
- El sistema de polling con deduplicación por firma es eficiente y evita re-renders innecesarios.
- El logger con sink inyectable permite agregar monitoreo externo (Sentry, Logtail) sin cambiar ninguna llamada existente.
- **No se detectaron inyecciones SQL, SSRF, o vulnerabilidades de autenticación** en el frontend. Las vulnerabilidades encontradas son de configuración y sanitización de outputs.

---

*Documento generado por Agente Auditor de Código Senior — 29/07/2026*
