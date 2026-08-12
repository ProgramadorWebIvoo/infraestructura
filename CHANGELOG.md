# CHANGELOG

## [2026-08-12] — Fix: notificaciones nativas nunca llegaban en segundo plano
- Tipo: fix
- Qué:
  - Causa raíz: `usePolling` (usado por `NotificationsProvider`) pausa el polling completo cuando `document.hidden` es `true` — optimización correcta para proyectos/dashboard, pero incompatible con `notifyBrowser()` (que exige *exactamente lo contrario*: solo dispara si la pestaña sigue oculta en el momento del fetch). Resultado observado: notificaciones nunca llegaban en background, y al volver a la pestaña se disparaban todas de golpe pero ya con `document.hidden=false`, así que la condición de `notifyBrowser` las descartaba — el usuario solo veía el toast, nunca el widget nativo.
  - `usePolling` ahora acepta un 4º parámetro opcional `pauseWhenHidden` (default `true`, sin cambio de comportamiento para el resto de la app). `NotificationsProvider` lo pasa en `false`: el polling de notificaciones sigue corriendo en segundo plano específicamente para que `notifyBrowser()` pueda dispararse en el momento correcto.
- Por qué / causa raíz: QA del usuario — "estando en segundo plano nunca llega... cuando entro a la app llegan las 3 automáticamente" (síntoma exacto del conflicto de diseño entre dos features implementadas en la misma sesión sin verificarlas juntas).
- Archivos: modificado `src/hooks/usePolling.ts`, `src/components/UI/NotificationsProvider.tsx`; tests: +1 en `src/__tests__/hooks/usePolling.test.ts` (callback sigue disparando con `document.hidden=true` cuando `pauseWhenHidden=false`), actualizado 1 en `src/__tests__/components/UI/NotificationsProvider.test.tsx` (verifica el 4º argumento).
- Verificación: `tsc --noEmit` limpio. **596/596 tests.**

## [2026-08-12] — Notification API nativa del navegador (solo para alertas del backend) + fix de convención hooks/components
- Tipo: feature / refactor
- Qué:
  - **Notification API nativa**: nuevo `src/services/browserNotifications.ts` con `requestNotificationPermission()` (pide permiso solo si el estado es `"default"`, no-op si ya fue concedido/denegado) y `notifyBrowser(title, body)` (dispara notificación del SO, exclusivamente si el permiso está concedido Y la pestaña está en background — `document.hidden` —, con `tag: "ivoo-notification"` para agrupar en vez de apilar; click enfoca la ventana y cierra la notificación). Permiso solicitado una vez tras login exitoso (`useAuth::handleLogin`). Disparo enganchado junto al toast en `NotificationsProvider` — exclusivo de alertas del backend (`useNotifications`), nunca del feedback local de acción (success/error/warning/info).
  - **Fix de convención de arquitectura** (detectado por el usuario): la pieza anterior había quedado como `src/hooks/useNotifications.tsx` (con JSX, para exponer `<NotificationsProvider>`) — rompe la convención del proyecto donde `hooks/` es lógica pura sin JSX y los contextos con Provider viven en `components/UI/` (mismo patrón que `Toast.tsx`). Se movió el archivo completo a `src/components/UI/NotificationsProvider.tsx`; `hooks/` queda limpio de nuevo. Actualizados todos los imports (`App.tsx`, `NotificationBell.tsx`, mocks de test) y reubicado el test a `__tests__/components/UI/NotificationsProvider.test.tsx`.
- Por qué / causa raíz: pedido explícito del usuario de notificaciones nativas del navegador con reglas claras de cuándo dispararlas; corrección de arquitectura señalada por el usuario tras notar el `.tsx` fuera de lugar en `hooks/`.
- Archivos: nuevo `src/services/browserNotifications.ts`; renombrado/movido `src/hooks/useNotifications.tsx` → `src/components/UI/NotificationsProvider.tsx`; modificados `src/hooks/useAuth.ts`, `src/App.tsx`, `src/components/UI/NotificationBell.tsx`; tests nuevos `src/__tests__/services/browserNotifications.test.ts` (9 tests), reubicado `src/__tests__/components/UI/NotificationsProvider.test.tsx`, +1 test en `src/__tests__/hooks/useAuth.test.ts` (permiso pedido tras login); mocks actualizados en `AuthenticatedLayout.test.tsx`, `NotificationBell.test.tsx`, `SidebarNav.test.tsx`.
- Verificación: `tsc --noEmit` limpio. **595/595 tests.**

## [2026-08-12] — Fix toast duplicado + variante visual distintiva para toasts de notificación
- Tipo: fix / feature
- Qué:
  - **Fix toast duplicado**: `NotificationBell` se monta dos veces en el layout (`MobileTopBar` + `SidebarNav`, una oculta por CSS según breakpoint pero ambas presentes en el DOM). Cada una llamaba `useNotifications()` directamente, así que había dos instancias independientes del hook — cada una con su propio polling y su propia detección de "notificación nueva", disparando el toast dos veces por cada notificación real. Se introdujo `NotificationsProvider` (contexto de React) que instancia la lógica real (renombrada a `useNotificationsSource`) UNA sola vez; `useNotifications()` ahora solo lee ese contexto compartido. Montado en `App.tsx` dentro de `ToastProvider` (depende de `useToast`).
  - **Variante visual "notification" en Toast**: nuevo `ShowToastOptions.variant` (`"default" | "notification"`). Los toasts de alertas internas (`useNotifications`) ahora usan siempre ícono de campana + acento índigo + borde izquierdo de 4px, independientemente del `type` pasado — visualmente distinguibles de un vistazo de los 4 estilos de feedback de acción (success/error/warning/info) que ya existían, para que el usuario reconozca "algo pasó en el sistema" vs. "resultado de mi propia acción".
- Por qué / causa raíz: QA del usuario — "mando dos notification toast" (confirmado: doble montaje de `NotificationBell` sin instancia compartida del hook) + pedido de mejor feedback visual diferenciado.
- Archivos: `src/hooks/useNotifications.ts` → renombrado a `.tsx` (ahora exporta JSX: `NotificationsProvider`); modificados `src/components/UI/Toast.tsx`, `src/App.tsx`; tests: `src/__tests__/hooks/useNotifications.test.ts` → `.tsx`, envuelto en `NotificationsProvider`, +1 test nuevo verificando que dos consumidores comparten la misma instancia/estado (regresión del bug de duplicado).
- Verificación: `tsc --noEmit` limpio. **585/585 tests.**

## [2026-08-12] — Notificaciones: polling 30s→8s + toast automático en notificación nueva
- Tipo: feature / fix
- Qué:
  - `useNotifications` baja el intervalo de polling de 30s a 8s.
  - Nueva detección de "notificación nueva": se guarda el set de IDs vistos en el fetch anterior (`knownIds`, un `useRef`); en cada poll posterior se calcula el diff y se dispara `showToast()` por cada ID que no estaba antes. La carga inicial (montaje del hook) nunca dispara toasts — solo marca el baseline — para no spamear con notificaciones ya existentes al abrir la app.
  - Investigado y descartado por ahora: WebSockets reales (Laravel Reverb) para push instantáneo. El backend está en Laravel 9; Reverb requiere Laravel 10+. Migrar el framework es una pieza de trabajo mayor y de alto riesgo, fuera de alcance de esta tarea — queda documentado como pendiente de roadmap para cuando se aborde el upgrade (alternativa sin upgrade: Pusher/Ably, compatibles con Laravel 9 vía el mismo Broadcasting API — el canal privado por usuario ya existe en `routes/channels.php`, sin usar).
- Por qué / causa raíz: QA del usuario — "tardo demasiado el polling" y "nunca vi que se disparara el toast para avisar" (nunca se había conectado la bandeja al sistema de toast, solo se construyó como bandeja pasiva).
- Archivos: modificado `src/hooks/useNotifications.ts`; tests actualizados/nuevos en `src/__tests__/hooks/useNotifications.test.ts` (intervalo 8s, mock de `useToast`, 3 tests nuevos: sin toast en carga inicial, toast por cada notificación nueva en poll, sin toast si no hay novedades).
- Verificación: `tsc --noEmit` limpio. **584/584 tests.**

## [2026-08-12] — Fix favicons dinámicos por ruta (se veían recortados/vacíos)
- Tipo: fix
- Qué:
  - `useDocumentHead.ts::buildFaviconHref()` generaba favicons donde el ícono Lucide se veía recortado/desproporcionado (reportado por el usuario en varias pestañas). Causa raíz: el regex que extraía el contenido interno del SVG del ícono (`<svg ...>...</svg>` → `...`) también descartaba su `viewBox="0 0 24 24"` propio; los `<path>` quedaban dibujados en coordenadas de 24 unidades dentro de un `<g transform="translate(6,6)">` sin ningún reescalado, así que el trazo salía gigante y cortado por los bordes del favicon de 32×32.
  - Primer intento (regresión intermedia): envolver el contenido en un `<svg>` anidado con su propio `viewBox` — preservaba las coordenadas pero el favicon se renderizaba completamente en blanco en el navegador real (soporte inconsistente de `<svg>` anidado dentro de un favicon `data:` URI).
  - Segundo intento (aún incompleto): `<g transform="translate(offset,offset) scale(20/24)">` en vez de SVG anidado — resolvía el reescalado pero el favicon se veía **completamente en blanco**. Causa: el regex que extrae los `<path>` descarta el `<svg>` raíz completo, y ese raíz es quien llevaba `stroke="#FFFFFF"` (los `<path>` de lucide-react son `fill="none"`, todo el color vive en `stroke`, heredado del padre). Sin reponer `stroke`/`stroke-width`/`stroke-linecap`/`stroke-linejoin` en el `<g>` de reemplazo, los paths se dibujan en la posición y tamaño correctos pero sin ningún color — indistinguibles de "no hay ícono".
  - Fix final: `<g transform="translate(offset,offset) scale(20/24)" fill="none" stroke="#FFFFFF" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">` — repone explícitamente todos los atributos de presentación que vivían en el `<svg>` raíz descartado por el regex, además del reescalado geométrico.
- Por qué / causa raíz: reporte visual directo del usuario ("los favicons no se parecen a los íconos... esto pasa con la mayoría") — bug preexistente a esta sesión, no introducido por cambios recientes. Se necesitaron 2 iteraciones adicionales tras el primer intento porque el regex de extracción descarta silenciosamente TODOS los atributos del `<svg>` raíz (viewBox, stroke y sus modificadores), no solo el que se estaba corrigiendo en cada iteración.
- Archivos: modificado `src/hooks/useDocumentHead.ts`; test nuevo `src/__tests__/hooks/useDocumentHead.test.tsx` (4 tests: título/favicon por ruta conocida, fallback a defaults, favicon preserva escalado Y stroke del ícono con path data real, reset de título al desmontar) — el hook no tenía cobertura previa.
- Verificación: `tsc --noEmit` limpio. **581/581 tests.**

## [2026-08-12] — Modernización topbar mobile + bottom sheet de notificaciones + fix scroll-lock desktop
- Tipo: feature / fix
- Qué:
  - **`MobileTopBar` modernizado**: reemplazado el ícono genérico `Building2` en cuadro de gradiente por el SVG oficial `/ivoo_logoo.svg` (mismo que usa el sidebar desktop, antes desalineados visualmente). `RoleBadge` ahora siempre visible en mobile en variante `compact` (solo el rol, sin el prefijo "Terminal:", con `max-w-24 truncate` para roles largos). Header reestructurado (padding/gaps más ajustados) y el email de usuario se movió a una fila propia debajo en vez de competir por espacio en la fila principal.
  - **`RoleBadge`**: nuevo prop `compact` para la variante sin prefijo.
  - **Notificaciones en mobile — reemplazo del dropdown flotante por bottom sheet**: el dropdown posicionado en `absolute` dentro del drawer del sidebar mobile no tenía un contexto de apilamiento fiable y quedaba cortado/mal ubicado. Se extrajo el contenido compartido (header + lista) a `NotificationList.tsx`, y `NotificationBell` ahora renderiza dos shells en paralelo, cada uno visible solo por CSS: dropdown flotante (`hidden lg:flex`, desktop) y bottom sheet a pantalla completa deslizante desde abajo (`lg:hidden`, mobile, con overlay, animación spring y bloqueo de scroll del body).
  - **Fix scroll-lock afectando desktop**: el bloqueo de `document.body.style.overflow` (pensado solo para el sheet mobile) se aplicaba incondicionalmente, ocultando la scrollbar lateral también al abrir el dropdown en desktop. Ahora se consulta `window.matchMedia("(min-width: 1024px)")` al abrir y se omite el bloqueo si el viewport es desktop.
- Por qué / causa raíz: pedido explícito de modernización visual (topbar mobile desactualizada respecto al resto de la app) + bug de UX real (dropdown flotante recortado en mobile, mismo problema que ya se había resuelto para desktop en una ronda anterior) + regresión de scroll-lock detectada en QA manual tras el fix del bottom sheet.
- Archivos: nuevo `src/components/UI/NotificationList.tsx`; modificados `src/components/UI/NotificationBell.tsx`, `src/components/UI/MobileTopBar.tsx`, `src/components/UI/RoleBadge.tsx`; tests actualizados `src/__tests__/components/UI/NotificationBell.test.tsx` (ajustados 5 tests para los dos shells simultáneos + 3 tests nuevos: cierre del sheet mobile, scroll-lock en mobile, NO scroll-lock en desktop).
- Verificación: `tsc --noEmit` limpio. **577/577 tests.**

## [2026-08-12] — Fixes QA mobile: campana duplicada y drawer heredando estado "colapsado" de desktop
- Tipo: fix
- Qué:
  - **Campana duplicada en mobile**: `MobileTopBar` y el header de `SidebarNav` renderizaban cada uno su propia `NotificationBell`. Se mantiene la de `MobileTopBar` (la que el usuario confirmó que se veía bien) y la del `SidebarNav` ahora lleva `hidden lg:flex` — solo visible en desktop, donde `MobileTopBar` no existe.
  - **Drawer mobile abriéndose "colapsado"**: `isCollapsed` es una preferencia de desktop persistida en `localStorage`; el `<aside>` y todo su contenido interno (logo, textos, badges) la usaban directamente, así que si un usuario había colapsado el sidebar en desktop, el drawer mobile heredaba ese estado y abría como rail angosto en vez de a ancho completo. Se introdujo `effectiveCollapsed = isCollapsed && !isOpen`: cuando el drawer mobile está abierto (`isOpen`), el contenido siempre se renderiza expandido sin importar la preferencia de desktop. El ancho del `<aside>` ahora es `w-64` fijo con el colapso solo detrás de `lg:` (`lg:w-16`), y el botón de colapsar (oculto en mobile) sigue leyendo `isCollapsed` real, no el valor derivado.
- Por qué / causa raíz: QA manual del usuario en dispositivo mobile real tras el fix de navbar de la sesión anterior — ambos bugs solo eran visibles en viewport mobile, invisibles en desktop donde se habían probado los cambios previos.
- Archivos: modificados `src/components/UI/SidebarNav.tsx`, `src/components/UI/MobileTopBar.tsx`; tests nuevos/actualizados `src/__tests__/components/UI/SidebarNav.test.tsx` (2 tests nuevos cubriendo el bug del drawer + ajuste de 5 tests existentes que ahora requieren `isOpen: false` explícito para simular desktop-colapsado), `src/__tests__/components/Layout/AuthenticatedLayout.test.tsx` (1 test nuevo de integración verificando que solo una campana queda visible por breakpoint).
- Verificación: `tsc --noEmit` limpio. **574/574 tests.**

## [2026-08-12] — Fixes QA post-Fase 1.2: bug de campana, layout de navbar y suite de tests al 100%
- Tipo: fix
- Qué:
  - **Bug bloqueante de `useNotifications`**: `apiFetch` (shared) desenvuelve `json.data` automáticamente por convención Laravel — el hook esperaba `{data: [...]}` y recibía ya el array desenvuelto, causando `Cannot read properties of undefined (reading 'length')` al abrir la campana. Corregido el tipo esperado y el test que enmascaraba el bug (mockeaba el shape incorrecto).
  - **Rediseño de navbar**: eliminada la card "Base de datos unificada" (contadores de Obras/Proveedores descartados, ya viven en KPIs de cada panel). El badge "Terminal: {rol}" (antes ahí) y la campana de notificaciones se movieron a la navbar: `MobileTopBar` (mobile) y al header de `SidebarNav` (desktop, antes vivían mal ubicados en el footer inferior — el dropdown de notificaciones se abría muy lejos del punto de interacción, casi fuera de vista). Nuevo componente `RoleBadge.tsx` (antes inline) para reuso entre ambos.
  - **Layout sidebar colapsado**: el rail de 64px no tiene espacio para logo + campana lado a lado; se separaron en dos filas del header (logo arriba, rol+campana en fila propia debajo). El fade del badge de rol al colapsar/expandir usa `sidebarTextClass` (mismo patrón que el resto del sidebar) en vez de mount/unmount abrupto, eliminando el "salto" visual mientras el ancho del rail todavía anima.
  - **Animación del dropdown de notificaciones**: entrada/salida con `motion`/`AnimatePresence` (scale+opacity+y, 150ms, easing consistente con el resto de la app) en vez de aparición/desaparición instantánea. `align` configurable ("right" | "left-start") para que el dropdown crezca hacia el lado con espacio disponible según el contexto (topbar vs. sidebar angosto).
  - **6 tests preexistentes de `api.test.ts` corregidos** (pedido explícito del usuario, no solo lo que tocaba mi feature): causa raíz real, `ensureCsrfCookie()` en `services/api.ts` usaba la constante `API_BASE_URL` congelada al importar el módulo (leída del `.env` real, `127.0.0.1`) en vez de `getApiBaseUrl()` (que sí refleja `setApiBaseUrl()`) — el `vi.stubEnv` del test no podía surtir efecto porque llegaba después del import estático que ya había calculado la URL. Bug real de producción, no solo de test: cualquier código que llamara `setApiBaseUrl()` después del boot inicial quedaba con `ensureCsrfCookie` apuntando a la URL vieja. Se corrigió `ensureCsrfCookie` para usar `getApiBaseUrl()`, y el test para fijar la URL vía `setApiBaseUrl()` explícito en `beforeEach` en vez de `vi.stubEnv` post-import. De paso, se fijó `environmentOptions.jsdom.url` en `vite.config.ts` para que el hostname de jsdom en tests sea determinista (`localhost`) y no dependa del default de jsdom (`127.0.0.1`).
- Por qué / causa raíz: reportes de QA manual tras Fase 1.2 (campana rota en el navegador real) + pedido explícito de dejar la suite de tests en verde total, no solo lo agregado por la feature.
- Archivos: nuevos `src/components/UI/RoleBadge.tsx`; modificados `src/hooks/useNotifications.ts`, `src/components/UI/NotificationBell.tsx`, `src/components/UI/MobileTopBar.tsx`, `src/components/UI/SidebarNav.tsx`, `src/components/Layout/AuthenticatedLayout.tsx`, `src/routes/AuthenticatedRoutes.tsx`, `src/services/api.ts`, `vite.config.ts`; tests actualizados `src/__tests__/hooks/useNotifications.test.ts`, `src/__tests__/components/UI/SidebarNav.test.tsx`, `src/__tests__/components/Layout/AuthenticatedLayout.test.tsx`, `src/__tests__/services/api.test.ts`.
- Verificación: `tsc --noEmit` limpio. **570/570 tests — suite completa en verde, cero fallos.**

## [2026-08-12] — Plan 90 días, Fase 1.2: ToastAlertAction + bandeja de alertas internas persistentes
- Tipo: feature
- Qué:
  - `Toast.tsx`/`useToast()` extendido de forma retrocompatible: `showToast(message, type, options?)` ahora acepta `options.action` (botón con label + onClick dentro del toast, lo dismisea al hacer click), `options.priority` ("high" duplica la duración a 8s y fuerza `role="alert"`/`aria-live="assertive"` sin importar el tipo). Los 64 call sites existentes de `showToast(message, type)` en 16 archivos no cambiaron.
  - Paleta de colores/iconos de `Toast.tsx` y `AlertBanner.tsx` (antes duplicada carácter por carácter) unificada en `src/components/UI/alertStyles.ts`.
  - Nuevo `NotificationBell.tsx` + `useNotifications.ts` (hook con polling de 30s, mismo patrón que `useDashboardSummary`): consumen los endpoints nuevos del backend (`GET /notifications`, `/notifications/unread-count`, `PATCH /notifications/{id}/read`, `/notifications/read-all`) para la bandeja de alertas internas persistentes — hasta ahora no existía nada de esto, las notificaciones solo vivían como push (mobile) o toast efímero (web). Integrado en `MobileTopBar` (variant "dark") y en el bar de rol de `AuthenticatedLayout` (variant "light").
- Por qué / causa raíz: Fase 1.2 del plan de 90 días (`docs/PLAN-MAESTRO-90-DIAS.md`) — `ToastAlertAction` con acción/prioridad/rol, y alertas internas persistentes (no existían, gap detectado en `docs/FASE0-AUDITORIA-TECNICA.md`). Se extendió el `Toast.tsx` ya centralizado en vez de crear un componente nuevo, siguiendo la recomendación de la auditoría técnica.
- Archivos: nuevos `src/components/UI/alertStyles.ts`, `src/components/UI/NotificationBell.tsx`, `src/hooks/useNotifications.ts`; modificados `src/components/UI/Toast.tsx`, `src/components/UI/AlertBanner.tsx`, `src/components/UI/MobileTopBar.tsx`, `src/components/Layout/AuthenticatedLayout.tsx`, `src/types.ts` (tipo `AppNotification`); tests nuevos `src/__tests__/hooks/useNotifications.test.ts`, `src/__tests__/components/UI/NotificationBell.test.tsx`, extendido `src/__tests__/components/UI/Toast.test.tsx`.
- Verificación: `tsc --noEmit` limpio. 565/571 tests (556 previos + 15 nuevos; los 6 fallos restantes en `src/__tests__/services/api.test.ts` son preexistentes — no tocados por este cambio, comparan `localhost` vs `127.0.0.1`, entorno local). **Pendiente de commit por el usuario.**

## Sinopsis

- **Stack**: React 19 + TypeScript + Vite, Tailwind (bento UI), Motion (framer-motion), React Router 7. Monorepo con paquete `@ivoo/shared` (tipos y utils compartidos web/mobile).
- **Propósito**: Sistema de gestión de infraestructura IVOO con flujo multi-rol: Infraestructura/Mantenimiento → Cierre de Obra → Procura → Analistas → Finanzas → Presidencia.
- **Estructura clave**: `src/views/` (paneles por rol), `src/components/UI/` (Card, KpiCard, SectionHeader, Table, StatusBadge, etc.), `src/components/Modals/` (InspectProjectModal), `src/hooks/` (useProjects, useProjectsWorkflows, useRouting), `src/utils/` (workflowStatus, dashboardSummary).
- **Decisiones de arquitectura**: layout lazy por ruta con `ProtectedRoute` por rol; mapas de color unificados en `utils.ts` (Tailwind requiere clases literales); filtro de etapas compartido vía estado en el panel padre; estado de proyecto tipado en `ProjectStatus` (shared).

## [2026-07-31] — Mejoras UI/UX vista Cierre de Obra
- Tipo: feature / refactor
- Qué: Header de departamento con icono, 3 KPIs operativos (Por Revisar, En Ejecución, Auditoría), grid de secciones con skeleton actualizado. Selector de expedientes con tipo INFRA/MANT, fecha e insumos. Panel de "requisitos para enviar a Procura" con barra de progreso (cubicaciones, planos, notas) y estado de completitud. Tarjetas de auditoría con mini-stepper de 2 pasos, contratista, total estimado y anticipo liberado. Botón "Quitar" para cancelar selección. Flujo de Retornos movido a fila superior debajo de KPIs (nuevo ReturnsFlowStrip) con icono con animación pulse. Fix de corte inferior en contenedores scrollables (pb-2).
- Por qué / causa raíz: La vista carecía de contexto del departamento (sin KPIs ni header) y el formulario no comunicaba al usuario qué faltaba para completar el envío. El info box de retornos quedaba relegado al pie de la columna derecha y los contenedores con overflow cortaban la última fila.
- Archivos: src/views/CierreObraPanel/index.tsx, src/views/CierreObraPanel/TechnicalReviewSection.tsx, src/views/CierreObraPanel/CompletionAuditSection.tsx, src/views/CierreObraPanel/ReturnsFlowStrip.tsx

## [2026-07-31] — Formulario de revisión como wizard en modal (Cierre de Obra)
- Tipo: refactor / feature
- Qué: El formulario de revisión técnica deja de expandirse inline dentro de la card y pasa a un Modal tipo wizard de 3 pasos (Revisar → Documentación → Confirmar) con stepper visual. Paso 1: detalles de inversión + notas. Paso 2: adjuntar hoja de cálculo y planos (validación al continuar). Paso 3: resumen del envío con estado de requisitos. Footer con navegación Atrás/Continuar y envío final. El selector de expedientes queda intacto y abre el modal al hacer clic.
- Por qué / causa raíz: La expansión inline del formulario (AnimatePresence con height auto) movía el layout y forzaba scroll, empeorando la comodidad de uso.
- Archivos: src/views/CierreObraPanel/TechnicalReviewSection.tsx

## [2026-08-03] — Mejoras UI/UX vista Procura
- Tipo: feature / refactor
- Qué: Header de departamento con icono y 4 KPIs (Por Autorizar, En Licitación, Comparativa, Contratados). Layout de dos columnas: Autorización de Inversión (5/12, izquierda) + Evaluación Comparativa (7/12, derecha). Autorización de inversión como modal wizard de 2 pasos (Revisar → Autorizar) con selector de expedientes mejorado (tipo, fecha, estimado). Evaluación comparativa con panel de resumen por proyecto (mejor oferta, ahorro/sobre presupuesto, rango de entrega, rating promedio), resaltado del mejor postor en la tabla (badge "Mejor" + fila emerald) y rechazo movido a modal dedicado.
- Por qué / causa raíz: Las secciones apiladas a ancho completo alargaban la página y dejaban aire vacío en la sección de autorización; el formulario inline expandía el layout y el rechazo inline estiraba las tarjetas.
- Archivos: src/views/ProcuraPanel/index.tsx, src/views/ProcuraPanel/InvestmentApprovalSection.tsx, src/views/ProcuraPanel/BidEvaluationSection.tsx

## [2026-08-03] — Mejoras UI/UX vista Analistas
- Tipo: feature / refactor
- Qué: Header de departamento con icono y 4 KPIs (En Licitación, Con Propuestas, Cuadros Enviados, Contratados). Se mantiene la estructura de dos columnas (registro 7/12 + cuadro comparativo 5/12) y los SelectModal. Formulario de oferta con resumen del expediente (título, ubicación, techo), barra de presupuesto registrado vs techo con alerta si la oferta supera el techo, y animación de aparición por fade (sin empuje de altura). Cuadro comparativo con stats (mejor oferta + registrado/cobertura), badge "Mejor" en la oferta más baja y barra de cobertura del techo.
- Por qué / causa raíz: Faltaba contexto del departamento y feedback presupuestario al registrar ofertas; el cuadro no destacaba la oferta más conveniente.
- Archivos: src/views/AnalistasPanel/index.tsx, src/views/AnalistasPanel/BidRegistrationSection.tsx, src/views/AnalistasPanel/ComparativeTableSection.tsx

## [2026-08-03] — Ajustes Analistas: quitar presupuesto registrado y semanas enteras
- Tipo: refactor
- Qué: Eliminados los elementos "Presupuesto Registrado" (barra de cobertura vs techo) del formulario de ofertas y del cuadro comparativo; se conserva "Mejor Oferta" en el cuadro. NumericInput ahora soporta modo entero (prop `integer`, step=1 y sanitización con parseInt) para impedir decimales en semanas de ejecución.
- Por qué / causa raíz: Los bloques de presupuesto registrado agregaban ruido visual; las semanas de ejecución aceptaban decimales por el step default del NumericInput.
- Archivos: src/views/AnalistasPanel/BidRegistrationSection.tsx, src/views/AnalistasPanel/ComparativeTableSection.tsx, src/components/UI/NumericInput.tsx

## [2026-08-03] — Quitar techo de inversión del resumen de expediente (Analistas)
- Tipo: refactor
- Qué: Eliminado el elemento "Techo $X" del resumen del expediente en el panel de carga de propuestas de contratistas. Se conserva el techo en el cuadro comparativo.
- Por qué / causa raíz: El techo en el panel de registro agregaba ruido; el dato ya se muestra en el cuadro comparativo.
- Archivos: src/views/AnalistasPanel/BidRegistrationSection.tsx

## [2026-08-03] — Normalizar altura de paneles en Analistas
- Tipo: refactor
- Qué: Ambas cards (Carga de Propuestas y Cuadro Comparativo) ahora usan `h-full flex flex-col` para estirarse al alto de su columna en el grid, igualando su altura. Contenido interno distribuido (EmptyState centrado, botón de envío anclado abajo con mt-auto).
- Por qué / causa raíz: Los paneles tenían alturas dispares según su contenido, rompiendo la alineación visual.
- Archivos: src/views/AnalistasPanel/BidRegistrationSection.tsx, src/views/AnalistasPanel/ComparativeTableSection.tsx

## [2026-08-03] — Mejoras UI/UX vista Finanzas
- Tipo: feature / refactor
- Qué: Header de departamento con icono y 4 KPIs (Anticipos por Liberar, Finiquitos por Liquidar, En Ejecución, Obras Completadas). Nuevo FinancialSummarySection con ejecución financiera del portafolio (aprobado → comprometido → liberado → pendiente con barras de progreso + anticipo/plazo promedio + badge de sobre-ejecución). Layout de dos columnas (anticipos + liquidaciones) con cards de altura normalizada (h-full flex flex-col, EmptyState centrado, lista scrollable). Skeleton actualizado.
- Por qué / causa raíz: La vista carecía de contexto del departamento (sin KPIs ni header) y no mostraba la ejecución financiera agregada del portafolio; las cards de operaciones tenían alturas dispares.
- Archivos: src/views/FinanzasPanel/index.tsx, src/views/FinanzasPanel/FinancialSummarySection.tsx, src/views/FinanzasPanel/AdvancesSection.tsx, src/views/FinanzasPanel/FinalSettlementsSection.tsx

## [2026-08-03] — Diario de Egresos mejorado + fix EmptyState flex (Finanzas/Analistas)
- Tipo: feature / fix
- Qué: Diario de Egresos y Transferencias ahora incluye mini-stats (total desembolsado, anticipos liberados, finiquitos liquidados), filtro por tipo de egreso (Todos/Anticipos/Liquidaciones), columnas ordenables y footer con total desembolsado. Fix: EmptyState dentro de contenedores flex ahora usan `w-full` para no encogerse al ancho del contenido (aplicado en Finanzas y Analistas).
- Por qué / causa raíz: La leyenda de vacío en anticipos/liquidaciones se mostraba estrecha y descentrada porque un flex item con width auto no llena el contenedor; el diario carecía de resumen y filtros para explorar los desembolsos.
- Archivos: src/views/FinanzasPanel/LedgerSection.tsx, src/views/FinanzasPanel/AdvancesSection.tsx, src/views/FinanzasPanel/FinalSettlementsSection.tsx, src/views/AnalistasPanel/BidRegistrationSection.tsx, src/views/AnalistasPanel/ComparativeTableSection.tsx

## [2026-08-03] — Presidencia: cuellos de botella, flujo de caja y conversión
- Tipo: feature
- Qué: Nuevas secciones en Presidencia. PipelineHealthSection: tasa de conversión (creación→contrato, creación→pagado, contrato→pagado) y cuellos de botella por fase. CashFlowSection: desembolsos mensuales reales (anticipos + finiquitos) desde advancePaidDate/finalPaidDate. Nueva función pura computePipelineHealth en dashboardSummary.ts que combina volumen (count) con antigüedad del atasco (días sin actividad desde updatedAt, fallback createdDate), excluye estados terminales y ordena por estancadas desc.
- Por qué / causa raíz: El dashboard no mostraba dónde se frena el flujo ni la salida de caja real; la alerta de cuello de botella solo medía volumen (≥20%) sin considerar antigüedad, generando falsos positivos.
- Archivos: src/views/PresidenciaDashboard/PipelineHealthSection.tsx, src/views/PresidenciaDashboard/CashFlowSection.tsx, src/views/PresidenciaDashboard/index.tsx, src/utils/dashboardSummary.ts, src/__tests__/utils/dashboardSummary.test.ts
