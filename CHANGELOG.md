# CHANGELOG

## [2026-08-13] — Fix: barra de "cambios pendientes" no reaccionaba con TagMultiSelect + diff legible en el historial de auditoría
- Tipo: fix (bug) + UX
- Qué:
  - **Bug de "dirty" falso positivo**: `dirtyIds` comparaba el borrador contra el valor original como string crudo. Al deseleccionar y volver a seleccionar un mismo tag en `TagMultiSelect`, el array se reinserta al final (`[...value, option]`), cambiando el orden serializado del JSON aunque el conjunto de valores sea idéntico — la barra "Guardar todo" quedaba pegada activa aun volviendo el campo a su estado original. Nueva función `isDirtyValue()` compara settings `type: json` como conjuntos ordenados en vez de string a string.
  - **Historial de auditoría ilegible con valores largos**: el layout anterior truncaba a una sola línea tanto el *label* del setting (`truncate`) como los valores viejo/nuevo (`max-w-[100px] truncate`), volviendo el historial inútil para settings con nombres largos o valores tipo lista (ej. "Acciones que envían notificación..." cortado, o comparar dos JSON crudos de arrays). Nuevo componente `AuditLogValueDiff`: para settings `json` (listas de acciones) muestra un diff de tags añadidos (verde) / quitados (rojo tachado) en vez de dos strings JSON; para el resto, "viejo → nuevo" con wrap en vez de truncar. El label del setting ahora envuelve en varias líneas en vez de cortarse.
- Por qué / causa raíz: el usuario detectó ambos con el selector de tags recién agregado — reportó capturas mostrando la barra de guardado activa tras revertir una selección, y labels/valores cortados en el panel de auditoría.
- Archivos: modificados `src/views/ConfigAppPanel/index.tsx` (`isDirtyValue`, layout del historial); nuevo `src/views/ConfigAppPanel/components/AuditLogValueDiff.tsx`; test nuevo en `index.test.tsx` (toggle ida y vuelta de un tag no deja "Guardar todo" activo).
- Verificación: `tsc --noEmit` limpio. **674/674 tests frontend.**

## [2026-08-13] — Selector de tags para acciones de notificación en CONFIG APP (reemplaza textarea JSON)
- Tipo: feature (UX)
- Qué: `acciones_con_correo` y `acciones_con_notificacion_app` (settings `type: json`) dejan de editarse como textarea JSON crudo y pasan a un selector de chips clickeables con las acciones reales que la app dispara (consumidas desde `GET /settings/notification-actions`, no una lista inventada en el frontend). Nuevo componente reutilizable `components/UI/TagMultiSelect.tsx` (chips + "Seleccionar todas"/"Ninguna", genérico sobre cualquier lista de opciones fijas) y hook `hooks/useNotificationActionsCatalog.ts`. `SettingRow` detecta por `key` cuándo un setting `json` es una de estas dos listas de acciones y usa el selector en vez del textarea genérico (que sigue disponible como fallback para cualquier otro setting `json` futuro).
- Por qué / causa raíz: el usuario señaló que un textarea JSON es mala experiencia para elegir entre una lista conocida de opciones, y pidió explícitamente que las opciones mostradas fueran las acciones reales que la app dispara — no datos sueltos o inventados.
- Archivos: nuevos `src/components/UI/TagMultiSelect.tsx`, `src/hooks/useNotificationActionsCatalog.ts`; modificados `src/views/ConfigAppPanel/components/SettingRow.tsx`, `src/views/ConfigAppPanel/index.tsx`; tests nuevos `TagMultiSelect.test.tsx` (8), `useNotificationActionsCatalog.test.ts` (3), +2 en `SettingRow.test.tsx`.
- Verificación: `tsc --noEmit` limpio. **673/673 tests frontend.**

## [2026-08-13] — Errores de validación inline por campo en CONFIG APP + historial de auditoría paginado
- Tipo: feature (UX) + escalabilidad
- Qué:
  - Al guardar, cada setting dirty se persiste de forma independiente (`persist()` ya no aborta todo el lote ante el primer error 422): los campos que fallan quedan marcados con borde rojo y su mensaje de validación debajo del input (`fieldErrors` en `ConfigAppPanel`, limpiado al reeditar el campo), mientras los demás cambios pendientes se guardan igual. Al fallar, hace scroll automático al primer campo con error.
  - Nuevo componente reutilizable `components/UI/FieldError.tsx` (mensaje + `fieldErrorClasses()` para el borde/foco en rojo del control) para no duplicar este patrón en futuros formularios — usado hoy en `SettingRow`.
  - `AuditLogPanel` gana paginación numerada server-side opcional (`pagination` prop: `page`, `lastPage`, `total`, `onPageChange`) con controles anterior/siguiente; `useConfigAuditLogs` pasó de traer todo el historial de una vez a pedir de a 20 registros por página (`goToPage`). `prependLocal` (inserción sin polling tras un guardado) solo aplica en la página 1.
- Por qué / causa raíz: el usuario señaló que un 422 de validación no indicaba qué campo lo causó (solo un toast genérico), y que el historial de auditoría cargaba todo en una lista sin paginar — inviable cuando lleguen cientos o miles de registros.
- Archivos: modificados `src/views/ConfigAppPanel/index.tsx`, `src/views/ConfigAppPanel/components/SettingRow.tsx`, `src/hooks/useConfigAuditLogs.ts`, `src/components/UI/AuditLogPanel.tsx`; nuevo `src/components/UI/FieldError.tsx`; tests: +1 en `index.test.tsx` (error inline conserva cambios pendientes), reescrito `useConfigAuditLogs.test.ts` (shape paginado + `goToPage` + `prependLocal` solo en página 1), +4 en `AuditLogPanel.test.tsx` (controles de paginación).
- Verificación: `tsc --noEmit` limpio. **660/660 tests frontend.**

## [2026-08-13] — CONFIG APP: eliminado el botón "Guardar sección", solo queda el guardado global
- Tipo: refactor (limpieza)
- Qué: quitado el botón "Guardar sección" por tarjeta y todo su código asociado (`handleSaveGroup`, `savingGroup`, `dirtyIdsInGroup`) — el guardado ahora es exclusivamente vía la barra flotante "Guardar todo" / "Descartar cambios", que ya cubría el caso general.
- Por qué / causa raíz: el usuario pidió simplificar a un único flujo de guardado, eliminando código muerto/redundante ahora que la barra global es el único punto de guardado real.
- Archivos: modificado `src/views/ConfigAppPanel/index.tsx`; tests ajustados en `src/__tests__/views/ConfigAppPanel/index.test.tsx` (eliminado el test de "Guardar sección" por tarjeta, actualizado el test de auditoría para disparar el guardado vía "Guardar todo").
- Verificación: `tsc --noEmit` limpio. **653/653 tests frontend.**

## [2026-08-13] — Panel de auditoría persistente y a pantalla completa (patrón Odoo)
- Tipo: fix (UX)
- Qué: `AuditLogPanel` (componente reutilizable) gana 3 props nuevas: `sticky` (se ancla en su posición al hacer scroll del contenido principal, no se pierde de vista), `fillViewport` (fuerza `height` — no solo `max-height` — igual al alto visible del viewport menos el offset, en vez de crecer con el contenido) y `stickyOffset`. La sección animada interna usa `flex-1`/`min-h-0` para estirarse y llenar ese alto forzado, con el listado de entradas haciendo su propio scroll — sin dejar espacio en blanco cuando hay pocos registros. En `ConfigAppPanel` el panel ahora arranca **abierto** por defecto (antes colapsado).
- Por qué / causa raíz: primera versión del panel no era sticky (desaparecía al hacer scroll del contenido principal) y su altura se ajustaba al contenido en vez de ocupar la pantalla visible, dejando un hueco en blanco notorio debajo cuando había pocos registros. El usuario pidió el comportamiento de Odoo: fijo en pantalla, ocupando el alto disponible, con scroll interno.
- Archivos: modificado `src/components/UI/AuditLogPanel.tsx`, `src/views/ConfigAppPanel/index.tsx` (usa `sticky`, `fillViewport`, `defaultOpen`); tests nuevos en `src/__tests__/components/UI/AuditLogPanel.test.tsx` (+3: sticky con offset, sin sticky por defecto, límite de altura con fillViewport).
- Verificación: `tsc --noEmit` limpio. **654/654 tests frontend** (antes de la limpieza del botón "Guardar sección").

## [2026-08-13] — Guardado sin polling del historial de auditoría (respuesta del PATCH trae la entrada nueva)
- Tipo: fix (eficiencia)
- Qué: `PATCH /settings/{id}` ahora devuelve el registro de `ConfigAuditLog` recién creado, anidado dentro de `data` (no como clave hermana, porque `apiFetch` desenvuelve `json.data` automáticamente). El frontend inserta esa entrada directamente en el estado del panel (`prependLocal`) en vez de volver a consultar `/config-audit-logs` tras cada guardado.
- Por qué / causa raíz: el usuario señaló que el registro debía llegar "automático" a la tabla en la misma vista, pero sin usar polling recurrente — ineficiente para un dato que solo cambia por la propia acción del usuario en esa vista. Como el backend ya conoce exactamente qué cambió al momento de guardar, no hace falta ninguna consulta adicional, ni recurrente ni de una sola vez.
- Archivos: modificados `app/Http/Controllers/Api/AppSettingController.php` (backend), `src/hooks/useAppSettings.ts` (tipo `UpdateSettingResponse`), `src/hooks/useConfigAuditLogs.ts` (`prependLocal`), `src/views/ConfigAppPanel/index.tsx`; test nuevo en `tests/Feature/ConfigAuditLogTest.php` (respuesta anidada), test nuevo en frontend confirmando una sola consulta al endpoint tras guardar.
- Verificación: backend **223/223**, frontend `tsc --noEmit` limpio.

## [2026-08-13] — Panel de auditoría de CONFIG APP (exclusivo SUPERADMIN), componente reutilizable
- Tipo: feature
- Qué: nuevo panel lateral en `ConfigAppPanel`, visible solo cuando `activeRole === "SUPERADMIN"`, que muestra el historial de cambios de configuración (parámetro, valor viejo → nuevo, usuario, fecha) consumiendo el nuevo endpoint backend `GET /config-audit-logs`. Construido sobre un componente nuevo y genérico `src/components/UI/AuditLogPanel.tsx` (colapsable, con búsqueda, no acoplado al tipo de dato) para reutilizarse en futuras vistas de configuración (config de IA, proveedores, etc.), no solo CONFIG APP.
- Por qué / causa raíz: el usuario pidió que los cambios de configuración quedaran auditados, pero explícitamente **invisibles para Presidencia** — a diferencia de la auditoría de proyectos que sí es visible para cualquier autenticado.
- Archivos: nuevos `src/hooks/useConfigAuditLogs.ts`, `src/components/UI/AuditLogPanel.tsx`; modificados `src/views/ConfigAppPanel/index.tsx` (layout de dos columnas para SUPERADMIN), `src/routes/AuthenticatedRoutes.tsx` (pasa `activeRole` a `ConfigAppPanel`); tests nuevos `src/__tests__/hooks/useConfigAuditLogs.test.ts` (4), `src/__tests__/components/UI/AuditLogPanel.test.tsx` (7).
- Verificación: `tsc --noEmit` limpio. **651/651 tests frontend.**

## [2026-08-12] — Advertencia de presupuesto excedido en carga manual de ofertas (Analistas)
- Tipo: feature
- Qué: `BidRegistrationSection` (carga manual de propuestas de contratista) ahora compara el costo total cotizado (`materialCost + laborCost`) contra `activeProject.approvedInvestmentAmount` en vivo mientras se tipea:
  - Indicador inline ámbar bajo el total de la oferta cuando el costo supera la inversión autorizada, con el monto exacto de exceso.
  - Al enviar el formulario ("Agregar al Cuadro"), si el presupuesto está excedido **y/o** el anticipo negociado supera el máximo configurado, se intercepta el submit con un `ConfirmDialog` ("¿Está seguro de cargar esta propuesta?") que detalla ambas condiciones detectadas (una, otra, o las dos combinadas) antes de persistir. Si no hay ninguna advertencia, se guarda directo sin fricción.
  - No bloquea en ningún caso — el Analista puede confirmar y cargar la propuesta igual, cubriendo negociaciones reales que excedan cualquiera de los dos límites.
- Por qué / causa raíz: mismo criterio ya aplicado al anticipo — el sistema debe advertir sobre condiciones fuera de política sin impedir su registro, ya que la decisión de negocio (aceptar una oferta sobre presupuesto o con anticipo elevado) es del Analista/Procura, no del formulario.
- Archivos: modificado `src/views/AnalistasPanel/components/BidRegistrationSection.tsx`.
- Verificación: `tsc --noEmit` limpio. **639/639 tests frontend** (sin regresiones; no existían tests previos para este componente).

## [2026-08-12] — Fix: "Rendered more hooks than during the previous render" en AnalistasPanel
- Tipo: fix (bug preexistente, no introducido en esta sesión)
- Qué: `AnalistasPanel/index.tsx` tenía un `if (isLoading) return <AnalistasSkeleton />;` ubicado **antes** de dos `useMemo()` (`pendingLicitacion`, `kpis`). Mientras `isLoading` era `true`, React solo registraba el `useState` de `selectedProjectId`; al pasar a `false`, de golpe se registraban también los dos `useMemo` — un conteo de hooks distinto entre renders, que React detecta y aborta con este error. Se movió el `if (isLoading) return ...` a después de todos los hooks, antes del `return` del JSX.
- Por qué / causa raíz: bug ya existente en el código (no relacionado a los cambios de anticipo/semáforo de esta sesión), pero se volvió visible al modificar `BidRegistrationSection` (nuevo hook `useMaxAdvancePercent`), lo que cambió el timing de renders y expuso la condición de carrera entre el estado de carga y el montaje de hooks condicionales.
- Archivos: modificado `src/views/AnalistasPanel/index.tsx`.
- Verificación: `tsc --noEmit` limpio. **639/639 tests frontend.**

## [2026-08-12] — Modal de confirmación de adjudicación con 4 variantes (anticipo excedido / semáforo en riesgo)
- Tipo: feature
- Qué:
  - Nuevo `src/components/Modals/HireConfirmDialog.tsx`, reemplaza el `ConfirmDialog` genérico que usaba `BidEvaluationSection` para confirmar la adjudicación de un contratista. Calcula dos condiciones de forma independiente — `advancePercent > maxAdvancePercent` (anticipo excede CONFIG APP) y `semaphoreLevel` en naranja/rojo (presupuesto en riesgo) — y renderiza hasta 4 variantes según su combinación:
    - **Normal**: solo confirmación, banner sky de "dentro de los parámetros".
    - **Anticipo excedido**: banner ámbar con el % pactado vs. el máximo configurado.
    - **Semáforo en riesgo**: banner con el color/label real del nivel (naranja o rojo) y el % de ejecución de esa oferta contra la inversión autorizada.
    - **Combinada**: ambos banners juntos cuando las dos condiciones aplican a la vez.
  - El ícono y color del header del modal (ámbar vs. sky) y el botón de confirmar cambian según si hay alguna alerta activa, para que la severidad sea visible antes de leer el detalle.
  - `BidEvaluationSection` ahora captura `advancePercent` y `executedPct` de la oferta en el momento de abrir el modal (ya se calculaban para la columna Semáforo y Anticipo Pactado de la tabla — se reutilizan, no hay cálculo duplicado).
- Por qué / causa raíz: el usuario confirmó que el anticipo pactado es un dato relevante para la decisión de Procura (ya visible en la tabla comparativa) y pidió que la confirmación de adjudicación refleje explícitamente cuando la oferta elegida excede el anticipo máximo y/o el semáforo presupuestario, en vez de un mensaje genérico de "¿estás seguro?" sin contexto de riesgo.
- Archivos: nuevo `src/components/Modals/HireConfirmDialog.tsx`; modificado `src/views/ProcuraPanel/components/BidEvaluationSection.tsx` (reemplaza `ConfirmDialog` por `HireConfirmDialog`, extiende el estado `confirmSelect` con `advancePercent`/`executedPct`); tests nuevos `src/__tests__/components/Modals/HireConfirmDialog.test.tsx` (8 tests: las 4 variantes, el corte naranja/rojo vs. amarillo, confirmar/cancelar).
- Verificación: `tsc --noEmit` limpio. **639/639 tests frontend.**

## [2026-08-12] — Alerta de anticipo excedido para Analistas (en vez de bloquear al proveedor externo)
- Tipo: fix (corrección de diseño de negocio) + feature
- Qué:
  - **Revertido** en el formulario público (`PropuestaMaterialesPublica`/`ProposalDetailsSection`): ya no lee `maxAdvancePercent` del backend — vuelve al tope fijo 100% de siempre. El proveedor externo cotiza su condición real sin conocer la política interna de la empresa.
  - **`BidRegistrationSection`** (Analistas, registro de oferta): el campo de anticipo ya no clampa contra el máximo configurado (`max` fijo en 100 para evitar valores absurdos) — en su lugar muestra una **alerta amarilla** (`AlertTriangle` + texto) debajo del campo cuando el % negociado supera el máximo configurado, sin impedir guardar. El Analista decide con la información completa.
  - **`ComparativeTableSection`** (Analistas, cuadro comparativo): cada propuesta con anticipo por encima del máximo configurado muestra el % en ámbar con ícono de alerta, junto a plazo y costo.
  - **`BidEvaluationSection`** (Procura, evaluación de ofertas): la columna "Anticipo Pactado" de la tabla comparativa marca en ámbar (con ícono y leyenda "Supera máx. X%") cualquier oferta por encima del máximo configurado, fila por fila.
- Por qué / causa raíz: primera implementación bloqueaba/limitaba el campo de anticipo tanto para el proveedor externo como para el Analista usando el mismo máximo configurado. El usuario corrigió: el proveedor externo no debe estar limitado por una política que no conoce (revertido a tope fijo); el Analista y Procura sí necesitan ver la alerta al capturar y al evaluar, porque son quienes deciden si esa oferta es aceptable — pero sin bloquear el registro, ya que puede ser una condición negociable.
- Archivos: modificados `src/views/PropuestaMaterialesPublica/types.ts`, `src/views/PropuestaMaterialesPublica/index.tsx`, `src/views/PropuestaMaterialesPublica/components/ProposalDetailsSection.tsx` (revertidos), `src/views/AnalistasPanel/components/BidRegistrationSection.tsx`, `src/views/AnalistasPanel/components/ComparativeTableSection.tsx`, `src/views/ProcuraPanel/components/BidEvaluationSection.tsx`.
- Verificación: `tsc --noEmit` limpio. **631/631 tests frontend.**

## [2026-08-12] — Anticipo máximo (CONFIG APP) conectado a los formularios de captura de anticipo
- Tipo: fix
- Qué:
  - Nuevo hook `useMaxAdvancePercent()` (vistas autenticadas): lee `presupuesto.anticipo_maximo_porcentaje` desde `GET /settings`, fallback a 100 mientras carga o si falla — mismo patrón que `useBudgetSemaphore`.
  - `PropuestaMaterialesPublica` (formulario público de cotización de proveedores, sin sesión): el tipo `InvitationPublicInfo` gana `maxAdvancePercent` (viene del backend en `GET /public/invitations/{token}`, que ya se consultaba para cargar el proyecto/materiales — no hubo que agregar un fetch nuevo). `ProposalDetailsSection` reemplazó el clamp manual `Math.min(100, v)` por el `max` real del `NumericInput`, forzado a entero, con el tope visible en el label ("Máximo permitido: X%").
  - `BidRegistrationSection` (Analistas, registro de ofertas de contratista): el `<select>` fijo con opciones 10/20/30/40/50% — que no tenía ningún mecanismo de tope dinámico — se reemplazó por `NumericInput` con `max={maxAdvancePercent}`, permitiendo cualquier valor entero dentro del rango configurado en vez de solo 5 valores fijos.
- Por qué / causa raíz: el usuario pidió conectar `anticipo_maximo_porcentaje` a todo lo relacionado con anticipos en la app. El `<select>` de Analistas en particular no solo estaba desconectado del setting — no tenía ninguna validación de tope, solo una lista corta de opciones que ni siquiera cubría el 100% por defecto.
- Archivos: nuevo `src/hooks/useMaxAdvancePercent.ts`; modificados `src/views/PropuestaMaterialesPublica/types.ts`, `src/views/PropuestaMaterialesPublica/index.tsx`, `src/views/PropuestaMaterialesPublica/components/ProposalDetailsSection.tsx`, `src/views/AnalistasPanel/components/BidRegistrationSection.tsx`; tests nuevos `src/__tests__/hooks/useMaxAdvancePercent.test.ts` (4 tests: default, carga desde `/settings`, fallback ante error, fallback ante setting ausente).
- Verificación: `tsc --noEmit` limpio. **631/631 tests frontend.**

## [2026-08-12] — Componente reutilizable `InfoBanner` (cuadro de ayuda colapsable)
- Tipo: refactor + feature
- Qué:
  - Extraído `src/components/UI/InfoBanner.tsx`: cuadro de ayuda contextual reutilizable, colapsable (ícono `Info` + título + chevron que rota, contenido con animación de alto vía `motion`/`AnimatePresence`). Props: `title`, `children`, `color` (sky/amber/emerald/indigo/slate), `defaultOpen` (default `true`), `className`.
  - El banner explicativo del semáforo de ejecución presupuestaria en CONFIG APP (sección Presupuesto) ahora usa este componente en vez de JSX inline, con `defaultOpen={false}` — arranca colapsado para no ocupar espacio a quien ya conoce el mecanismo.
- Por qué / causa raíz: el usuario pidió explícitamente que el cuadro de ayuda fuera un componente reutilizable para otras vistas futuras, y que fuera colapsable. El criterio para CONFIG APP es que todos los banners de ayuda que se agreguen ahí arranquen colapsados por defecto.
- Archivos: nuevo `src/components/UI/InfoBanner.tsx`; modificado `src/views/ConfigAppPanel/index.tsx` (usa `InfoBanner` con `defaultOpen={false}`); tests nuevos `src/__tests__/components/UI/InfoBanner.test.tsx` (3 tests: render abierto por defecto, `defaultOpen=false`, toggle colapsar/expandir).
- Verificación: `tsc --noEmit` limpio. **627/627 tests frontend.**

## [2026-08-12] — Semáforo de ejecución presupuestaria (primer consumidor real de los umbrales de CONFIG APP)
- Tipo: feature
- Qué:
  - `useBudgetSemaphore()`: hook que lee los 3 umbrales `presupuesto.semaforo_umbral_verde/amarillo/naranja` desde `GET /settings` y clasifica cualquier % de ejecución en verde (≤verde) / amarillo (≤amarillo) / naranja (≤naranja) / rojo (>naranja), con fallback a 80/95/100 si el fetch falla. Exporta también `SEMAPHORE_COLORS` (paleta consistente bar/text/bg/label por nivel) para que cualquier vista lo use sin reinventar estilos.
  - **Dashboard de Presidencia** (`FinancialOverviewSection`): la barra "Fondos Liberados" y el badge superior ahora usan el color del semáforo según `% liberado / aprobado` de toda la cartera, en vez del emerald fijo que tenía antes. El badge de "Sobre-ejecución" (monto en rojo) se mantiene aparte porque comunica algo distinto (el exceso en dinero, no el nivel de riesgo).
  - **Evaluación de Procura** (`BidEvaluationSection`): columna "Semáforo" agregada a la tabla comparativa de ofertas, **una fila por propuesta** — cada propuesta calcula su propio `% = totalCost_de_la_propuesta / inversión_autorizada`, sin importar de qué proveedor sea ni cuántas ofertas compitan. Se descartó una versión inicial que solo mostraba el semáforo de la oferta más barata (`best`) en un resumen agregado: con varias ofertas de varios proveedores (o del mismo proveedor con variantes), Procura necesita ver el nivel de riesgo de cada una para comparar, no solo el de la ganadora tentativa.
- Por qué / causa raíz: los 3 umbrales de semáforo se crearon en CONFIG APP (Fase 1.4) como catálogo completo pero sin consumidor real. El usuario pidió conectar el indicador solo donde aporta a la decisión de negocio: Presidencia (supervisión de cartera) y Procura (evaluación de ofertas antes de adjudicar) — explícitamente no en Finanzas, que solo libera pagos ya aprobados y no evalúa presupuesto. Tras la primera versión, el usuario señaló que en Procura el semáforo debía ser por oferta individual, no un resumen de la mejor.
- Archivos: nuevo `src/hooks/useBudgetSemaphore.ts`; modificados `src/views/PresidenciaDashboard/components/FinancialOverviewSection.tsx`, `src/views/ProcuraPanel/components/BidEvaluationSection.tsx` (columna Semáforo por fila en la tabla comparativa); tests nuevos `src/__tests__/hooks/useBudgetSemaphore.test.ts` (8 tests: clasificación por umbral default/personalizado, carga desde `/settings`, fallback ante error de red).
- Verificación: `tsc --noEmit` limpio. **624/624 tests frontend.**

## [2026-08-12] — CONFIG APP: validación estricta de porcentajes + guardado estilo Odoo (borrador/sección/global)
- Tipo: feature + fix
- Qué:
  - **Validación de rango e integridad numérica**: `SettingRow` ahora usa el componente compartido `NumericInput` (mismo que ya sanea inputs numéricos en Procura/Analistas/Finanzas) para los settings `integer`/`float` — bloquea notación científica ('10e5'), fuerza enteros sin decimales cuando `type === "integer"`, y clampa en vivo contra `min_value`/`max_value` provistos por el backend (los 5 settings porcentuales quedan acotados a 0–100). Antes el input aceptaba cualquier texto y solo el backend rechazaba al guardar.
  - `NumericInput` (componente compartido) ganó un prop `max` opcional que clampa el valor tecleado o pegado — antes solo clampaba negativos; ahora también topea máximos. Beneficia a los 11 consumidores existentes del componente, no solo CONFIG APP.
  - **Guardado estilo Odoo**: se eliminó el botón "Guardar" por fila. `ConfigAppPanel` ahora mantiene un borrador local (`draft`, `Record<id, value>`) — escribir en un campo no persiste nada. Cada sección (Card) tiene su propio botón "Guardar sección (N)" que persiste solo los cambios pendientes de esa sección. Una barra flotante inferior aparece únicamente mientras hay cambios pendientes en cualquier sección, con "Guardar todo" (persiste todos los borradores) y "Descartar cambios" (revierte todo a los valores originales sin llamar al backend).
  - `SettingRow` pasó de componente con estado propio + botón de guardado a componente controlado puro (`value`/`onChange` desde el padre) — el dueño del estado y del guardado es `ConfigAppPanel`.
- Por qué / causa raíz: el usuario señaló dos problemas tras la primera versión del panel: (1) los inputs de porcentaje aceptaban "10e" o valores fuera de 0–100 sin bloqueo visual, mismo bug que ya se había resuelto para otros formularios con `NumericInput` — se reutilizó esa solución en vez de reinventar sanitización; (2) pidió explícitamente el patrón de guardado de Odoo (borrador + guardado por sección + guardado/descarte global) en vez de un botón de guardado inmediato por campo.
- Archivos: modificados `src/components/UI/NumericInput.tsx` (prop `max`), `src/views/ConfigAppPanel/index.tsx` (reescrito: estado de borrador, guardado por sección, barra global), `src/views/ConfigAppPanel/components/SettingRow.tsx` (reescrito: componente controlado, usa `NumericInput`), `src/hooks/useAppSettings.ts` (tipo `AppSettingRecord` con `min_value`/`max_value`); tests reescritos `src/__tests__/views/ConfigAppPanel/SettingRow.test.tsx` (11 tests, incluye clamp/enteros/notación científica), `src/__tests__/views/ConfigAppPanel/index.test.tsx` (7 tests, incluye guardado por sección/global/descarte).
- Verificación: `tsc --noEmit` limpio. **616/616 tests frontend** (1 test de `ExportButton` intermitente por timeout en corrida completa, verde en aislado — no relacionado a este cambio).

## [2026-08-12] — Plan 90 días, Fase 1.4: panel CONFIG APP (frontend)
- Tipo: feature
- Qué:
  - Nueva ruta `/config-app` (`ROUTES.CONFIG_APP`) + entrada en el dropdown de Configuración del sidebar, protegida para SUPERADMIN/ADMIN (matriz de permisos ya soporta rutas nuevas sin refactor, confirmado en la auditoría de Fase 0).
  - `useAppSettings(authToken)`: carga `GET /settings` (agrupado por sección) y expone `updateSetting(id, value)`.
  - `views/ConfigAppPanel/`: una `Card` por grupo (Presupuesto y anticipos, Notificaciones, Datos fiscales, Moneda, Ratings, Alertas de precio, Inflación, Aplicación — orden fijo, no alfabético), cada una con sus settings editables inline vía `SettingRow` (input tipado según `type`: texto/número/checkbox/textarea JSON, botón Guardar habilitado solo si el valor cambió).
  - Favicon dinámico (`routeMeta.tsx`) y título de pestaña también cubren la nueva ruta.
- Por qué / causa raíz: Fase 1.4 del plan de 90 días — contraparte de frontend del backend de CONFIG APP (`app_settings`/`SettingsService`, ver CHANGELOG de `infraestructura-back`).
- Archivos: nuevos `src/hooks/useAppSettings.ts`, `src/views/ConfigAppPanel/index.tsx`, `src/views/ConfigAppPanel/components/SettingRow.tsx`; modificados `src/routes.tsx`, `src/routes/AuthenticatedRoutes.tsx`, `src/components/UI/ConfigDropdown.tsx`, `src/routeMeta.tsx`; tests nuevos `src/__tests__/hooks/useAppSettings.test.ts` (3 tests), `src/__tests__/views/ConfigAppPanel/SettingRow.test.tsx` (6 tests), `src/__tests__/views/ConfigAppPanel/index.test.tsx` (3 tests).
- Verificación: `tsc --noEmit` limpio. **609/609 tests frontend.**

## [2026-08-12] — Toast de notificación dura más (7s vs 4s normal) para no pasar inadvertido
- Tipo: fix
- Qué: nueva `NOTIFICATION_DURATION_MS = 7000` y helper `getToastDuration(priority, variant)` en `Toast.tsx` que centraliza la regla de duración (antes solo dependía de `priority`). Los toasts `variant="notification"` ahora duran 7s en vez de los 4s normales — más tiempo que el default para no pasar inadvertidos, pero menos que los 8s de `priority="high"` (reservado para casos realmente urgentes/bloqueantes).
- Por qué / causa raíz: pedido del usuario — la duración por defecto de 4s hacía fácil perderse el toast de notificación.
- Archivos: modificado `src/components/UI/Toast.tsx`; test nuevo en `src/__tests__/components/UI/Toast.test.tsx` (visible pasados los 4s normales, sigue visible cerca de los 7s, desaparece poco después).
- Verificación: `tsc --noEmit` limpio. **597/597 tests.**

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
