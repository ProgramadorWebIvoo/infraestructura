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
48.  ✅ **API Keys de IA expuestas en DOM**
49. ✅ **Token JWT en localStorage sin HttpOnly** 
50. ✅ **Contraseñas en texto plano en requests**
51. ✅ **URL producción hardcodeada en mobile** 
52. ✅ **Mocks globales en setup.ts** 
53. ✅ **Centralizar intervalos de polling**
54. ✅ **Corregir fallback de rol**
55. ✅ **`usesCleartextTraffic: true`**
56. ✅ **Corregir mobile registerPublicContractor**
57. ✅ **Refactor God Components**
58. ✅ **Extraer lógica financiera**
59. ✅ **Migrar matriz de permisos a backend**
60. ✅ **Migrar modelos IA a endpoint**
61. ✅ **Migrar lista de roles a endpoint**
62. ✅ **Colores de roles por hash**
63. ✅ **Validación de contraseña en backend**
64. ✅ **Sanitización XSS en proveedores** 
65. ✅ **CSP: remover `http://localhost:*` en producción** 
66. ✅ **Columnas Table inline sin memo**
67. ✅ **Key prop con índice en lugar de ID**
68. ✅ **Doble fetch en useAIConfig**
69. ✅ **Exponer setters directos desde hook**
70. ✅ **Reescribir README.md**
71. ✅ **Actualizar FLUJO_SISTEMA.md** 
72. ✅ **Subir thresholds coverage**
73. ✅ **Tests para useRateLimit, logger, aiEvaluationService**
74. ✅ **Optimizaciones de rendimiento**
75. ✅ **DonutChart responsive**
76. ✅ **Meta tags SEO en index.html**
77. ✅ **Logger en producción**
78. ✅ **Fallback a datos locales solo en desarrollo**
79. ✅ `ProjectLifecycleTest.php` solo happy path
80. ✅ CVE Alto en `react-router` (GHSA-qwww-vcr4-c8h2) **Riesgo aceptado, documentado (27/07/2026)** 
81. ✅ Colisión de IDs (fix M-04 incompleto, 3 focos)
82. ✅ Hooks pasan `{ token }` como Bearer inerte (leaky abstraction)
83. ✅ `SupplierInvitation` sin `expires_at`
84. ✅ API key Gemini en query string
85. ✅ SSRF: validación no cubre DNS rebinding
86. ✅ Política de contraseñas débil (solo `min:8`)
87. ✅ Constante `CONTRACTOR_STATUSES` fuera de la clase
88. ✅ **REALIZAR** — Limpiar el bundle y eliminar dependencias inutilizadas.
89. ✅ **REALIZAR** — Entrar ROL x ROL y verificar PROCESOS Y VISTAS.
90. ✅ **REALIZAR** — Reevaluar expiración de token con PC apagada (verificar fix previo). Bug encontrado: el timeout de inactividad (`useAuth.ts`) solo limpiaba estado local y hacía `reload()`, sin llamar a `/logout`; como la sesión vive en cookie httpOnly con lifetime propio en backend (Sanctum, `SESSION_LIFETIME=120`), el reload re-autenticaba solo vía `GET /user` mientras la cookie no hubiera expirado por su cuenta — el "fix" no tenía efecto observable. Corregido: ahora llama a `POST /logout` antes de limpiar y recargar, con guard contra doble disparo. 5 tests nuevos cubren el flujo (timeout normal, fallo de red en logout, no-disparo antes de tiempo, `visibilitychange` tras suspensión, no doble logout).
---

## 🔄 PENDIENTES ANTERIORES (no cubiertos por V1/V2)

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

## 🔴 PENDIENTES — V3 Audit Front (27/07/2026) — `AUDITORIA_front_27_07_2026_V3.md`

### 🔴 CRÍTICO

| # | Ítem | Estado verificado | 
|---|------|--------------------|
| 1 | Cabeceras de seguridad (CSP, etc.) nunca llegan a producción | 🚧 **Bloqueado por infraestructura** — el despliegue de producción aún no está definido (confirmado con el usuario 27/07/2026). No se puede resolver sin saber qué sirve el build (`dist/`) — Nginx, Vercel, Node, etc. Retomar cuando esté decidido. |

### 🟡 MEDIUM

| # | Ítem | Estado verificado |
|---|------|--------------------|
| 1 | Constante global fuera de clase (dup. de #11) | ⏳ Pendiente. |
| 2 | `nextContractorCode()` duplicado | ⏳ Pendiente — `SupportController.php` vs `ContractorController.php`. |
| 3 | `log()`/`logEvaluation()` triplicado (causa raíz de #4) | ⏳ Pendiente. |
| 4 | `Rule::in()` sin array | ⏳ Pendiente — `AIEvaluationController.php:52`. |
| 5 | `getMaskedApiKey()` código muerto | ⏳ **Sigue pendiente** — verificado: el método sigue definido en `AiConfiguration.php:51` y ya no se invoca desde ningún lado (`toArray()` hace su propio enmascarado inline desde el fix C-01). |
| 6 | `anthropic-version` hardcodeada en 2 lugares | ⏳ Pendiente. |
| 7 | Controladores violan SRP | ⏳ Pendiente — refactor grande, no tocado. |
| 8 | `AIEvaluationService::registerProviders()` viola DIP | ⏳ Pendiente. |

### 🔵 BAJO — Testing

| # | Ítem | Estado verificado |
|---|------|--------------------|
| 1 | Cobertura sin cambios: AI Config CRUD, AI Evaluation, etc. | ⏳ Pendiente. |
