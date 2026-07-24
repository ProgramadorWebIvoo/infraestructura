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

---

## 🔴 PENDIENTES — V1 Audit (24/07/2026)

### 🔴 ALTA — Tests unitarios faltantes (brecha crítica)

| # | Ítem | Archivos | Esfuerzo estimado |
|---|------|----------|-------------------|
| 1 | Tests para `useProjectsWorkflows` (12 handlers de negocio) | `src/hooks/useProjectsWorkflows.ts` | 2–3 días |
| 2 | Tests para `useProjectsData` (fetch + signature + polling) | `src/hooks/useProjectsData.ts` | 1 día |
| 3 | Tests para vistas principales (PresidenciaDashboard, InfraestructuraMantenimientoPanel, CierreObraPanel, ProcuraPanel, AnalistasPanel, FinanzasPanel) | `src/views/*` | 3–4 días |
| 4 | Tests para hooks de dominio: `useContractors`, `useCatalog`, `useProveedores`, `useUsuarios`, `useAIConfig` | `src/hooks/*` | 2–3 días |
| 5 | Tests para `App.tsx` (orquestación principal) | `src/App.tsx` | 1 día |
| 6 | Tests para `AuthenticatedLayout`, `SidebarNav`, `Toast` | `src/components/Layout/*`, `src/components/UI/*` | 1 día |
| 7 | Tests para `InteractiveOrganigrama` | `src/components/InteractiveOrganigrama.tsx` | 0.5 día |
| 8 | Tests para hooks livianos: `useOnlineStatus`, `useDebounce`, `useSafeMotion` | `src/hooks/*` | 0.5 día |

### 🟡 MEDIA — Refactor y deuda técnica

| # | Ítem | Archivos | Esfuerzo |
|---|------|----------|----------|
| 9 | ✅ **Extraer subcomponentes de `App.tsx`** — `AppRoutes` tiene 247 líneas. Separar: public routes, session validation, unauthenticated, layout en subcomponentes | `src/App.tsx` | 0.5 día |
| 10 | ✅ **Unificar `KpiCard` duplicado** — `PresidenciaDashboard.tsx` tenía implementación local incompatible con `components/UI/KpiCard.tsx`. Ahora usa el componente compartido. | `src/views/PresidenciaDashboard.tsx`, `src/components/UI/KpiCard.tsx` | 0.25 día |
| 11 | ✅ **Crear componente `Spinner` compartido** — Patrón SVG `<circle...>` duplicado en múltiples vistas. Creado `components/UI/Spinner.tsx`, reemplazadas 7 instancias. | Varios `src/views/*` | 0.25 día |
| 12 | ✅ **Extraer `useRateLimit` de `LoginScreen.tsx`** — Lógica de rate-limit extraída a `hooks/useRateLimit.ts`. LoginScreen reducido ~23%. | `src/views/LoginScreen.tsx` | 0.5 día |
| 13 | **Hacer genérica `signatureOf()` en `useProjectsData`** — Hardcodea campos de proyecto; recibir función de firma por parámetro | `src/hooks/useProjectsData.ts` | 0.25 día |
| 14 | **Mover `getPendingCount()` a servicio/hook de workflow status** — Switch con lógica de negocio duplicada en `InteractiveOrganigrama` | `src/components/InteractiveOrganigrama.tsx` | 0.25 día |
| 15 | **Reemplazar timeout manual de successMsg por Toast** — `InfraestructuraMantenimientoPanel` usa estado local con setTimeout | `src/views/InfraestructuraMantenimientoPanel.tsx` | 0.25 día |
| 16 | **Estandarizar botones en `AIConfigFormModal`** — Estilos de cancelar/guardar duplicados; usar variantes de componente `Button` compartido | `src/components/Modals/AIConfigFormModal.tsx` | 0.25 día |

### 🟢 BAJA — Mejoras y monitoreo

| # | Ítem | Detalle | Esfuerzo |
|---|------|---------|----------|
| 17 | **Logger en producción expone `console.error/warn/info`** — Implementar servicio externo (Sentry/Logtail) y desactivar console en producción | `src/services/logger.ts` | 1 día |
| 18 | **Fallback a datos locales sin autenticación (`INITIAL_PROJECTS`)** — Solo usar fallbacks en desarrollo o mostrar empty state en producción | `src/hooks/useProjectsData.ts` | 0.5 día |
| 19 | **Token en localStorage sin HttpOnly** — Considerar migrar a cookies HttpOnly + Secure para producción (depende de backend). Aceptado con mitigación CSP actual | `src/hooks/useAuth.ts` + backend | 2–3 días |
| 20 | **Monitorear versión React 19** — Riesgo bajo de compatibilidad (versión recién estable) | `package.json` | — |
| 21 | **Monitorear dependencia `motion`** — Fork de framer-motion; verificar actualizaciones y compatibilidad | `package.json` | — |

---

## 🔄 PENDIENTES ANTERIORES (no cubiertos por V1)

1. **REALIZAR** — Limpiar el bundle y eliminar dependencias inutilizadas.
2. **REALIZAR** — Reevaluar expiración de token con PC apagada (verificar fix previo).
3. **REALIZAR** — Entrar ROL x ROL y verificar PROCESOS Y VISTAS.

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

## 📋 AUDITORÍAS PENDIENTES

1. Realizar nueva auditoría con Claude PRO después de completar todos los puntos anteriores.
