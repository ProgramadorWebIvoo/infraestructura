# Catálogo de componentes reutilizables (`src/components/UI/`)

> Referencia rápida antes de escribir UI nueva: revisar si ya existe un componente que resuelva el caso, en vez de reimplementar markup/lógica ya cubierta en otra vista. Actualizar este archivo cada vez que se agregue, renombre o elimine un componente de `src/components/UI/`.

## Design Tokens

Tokens centralizados en `@theme` (`src/index.css`) — Tailwind v4, sin `tailwind.config.js` separado. Objetivo: que los componentes compartidos consuman una única fuente de verdad de color/radio/densidad/animación en vez de que cada uno (`SectionHeader`, `Modal`, `Button`, `alertStyles.ts`, `KpiCard`) defina su propio mapa paralelo. La migración de los componentes existentes a estos tokens es incremental — ver `PENDIENTES.md` o el historial de PRs; que un componente todavía no los use no es un error, es trabajo en curso.

- **Paleta semántica** (`--color-{rol}-{escalón}`, 6 roles × escalones 50/100/200/400/500/600/700): `brand`, `success`, `danger`, `warning`, `info`, `neutral`. Consumida vía `SEMANTIC_COLOR_MAP` en [`colorTokens.ts`](#colortokensts) — no leer las variables CSS crudas desde un componente nuevo, usar el mapa. **Al agregar un campo nuevo a `SemanticColorClasses`, verificar que el escalón de color que referencia (ej. `-200`) esté definido en `@theme` — Tailwind v4 no genera la utilidad si la variable CSS no existe, falla en silencio sin error de build** (aprendido migrando `alertStyles.ts`: `border200` no se generaba porque faltaba `--color-{rol}-200`).
- **Radios en 3 niveles** (no niveles sueltos por componente): `--radius-container` (16px, tarjetas/paneles/modales), `--radius-control` (12px, botones/inputs), `--radius-pill` (full, badges/chips/tags).
- **Densidad de padding**: `--spacing-card-padding` (24px, `Card`) vs `--spacing-card-padding-compact` (20px, `KpiCard` y header/footer de `Modal`) — la densidad más alta de `KpiCard` es intencional (suele ir en grilla de 3-4 columnas), no una inconsistencia a corregir.
- **Escala tipográfica caption/label**: `--text-caption` (11px, metadatos secundarios: sub de `KpiCard`, headers de `Table`) vs `--text-label` (12px, texto de control/badge).
- **Duración/easing**: `--duration-fast` (150ms, hover/focus sin cambio de layout), `--duration-base` (250ms, aparición de card/toggle), `--duration-slow` (350ms, paneles grandes) + `--ease-standard`/`--ease-out`/`--ease-in`. **`--duration-*` no es un namespace nativo de Tailwind v4** (confirmado por build: a diferencia de `--radius-*`/`--text-*`/`--color-*`, no genera clase utilitaria `duration-fast`) — se consume como variable CSS pura: `transition-duration: var(--duration-fast)` en un `style={{}}` o en un selector CSS, nunca como clase Tailwind. Regla de cuándo usar esto vs Framer Motion: si la animación cambia layout, es entrada/salida, o necesita spring → `motion/react` (ver `springs.gentle`/`springs.snappy` en [`animations.ts`](../src/animations.ts)); si es solo un cambio de color/sombra en hover sin mover nada → CSS con `transition-colors` + `var(--duration-fast)`. Excepción documentada: los `@keyframes` de `Toast.tsx` (`slide-up`, `slide-in/out-right`, `toast-progress`) se quedan en CSS puro — ya resuelven timing de auto-dismiss de forma madura.
- **Neutrales: superficie/texto/borde** — distinto del rol de acento `neutral` de `SEMANTIC_COLOR_MAP` (que es gris pero para KpiCard/SectionHeader/etc. igual que `brand`/`success`/etc.). Nombrados por **rol funcional**, no por el tono Tailwind que resuelven hoy — es el habilitante real de un dark mode futuro: el día que se implemente, solo se redefinen estos valores bajo un selector de tema, sin tocar componentes ni vistas.
  - Superficie: `bg-surface` (blanco, `Card`/`Modal`/`Button` secondary), `bg-surface-sunken` (gris muy claro, fondo hundido/inputs), `bg-surface-raised` (gris claro, hover de superficie), `bg-surface-inverted` (slate-900, headers oscuros de `Modal`/`KpiCard` variant dark).
  - Texto: `text-text-primary` (títulos), `text-text-secondary` (cuerpo secundario), `text-text-tertiary` (labels/metadatos), `text-text-muted` (placeholders/íconos inactivos), `text-text-inverted` (texto sobre superficie oscura).
  - Borde: `border-border-default` (borde estándar), `border-border-subtle` (separador interno, menos contraste), `border-border-inverted` (borde sobre superficie oscura).
  - **Migrados**: `Card`, `KpiCard`, `SectionHeader`, `Modal`, `Button` (variant secondary). Pendiente para la fase de vistas (reactivo, no barrido dedicado): `Table.tsx` y el resto de componentes/vistas — sus `bg-white`/`text-slate-*` literales siguen funcionando igual, solo no pasan aún por el token.
  - **Nota de variantes `dark` locales** (ej. `KpiCard variant="dark"`): no confundir con un futuro tema oscuro de la app — es una variante visual fija elegida por el consumidor, independiente del theme. Usa `surface-inverted`/`text-inverted` porque ese es su color fijo esperado, no porque "reaccione" a dark mode.

### colorTokens.ts

**Path**: `src/components/UI/colorTokens.ts`

- **Exports**: `SemanticColor` (`"brand"|"success"|"danger"|"warning"|"info"|"neutral"`), `SEMANTIC_COLOR_MAP: Record<SemanticColor, SemanticColorClasses>` (clases Tailwind ya resueltas: `bg50`, `bg100`, `border100`, `border200` (alertas), `borderL400`/`borderL500` (borde izquierdo de acento, 4px), `text600`, `text700`, `icon400`, `icon500`, `bgAlpha400` (fondo translúcido 20%, chips sobre superficies oscuras — Modal), `gradientFrom`/`gradientTo` (500/600), `gradientFromHover`/`gradientToHover` (600/700, hover de `Button`), `shadow500`/`shadowHover500` (sombra de color a 20%/30%, acompaña el gradiente de `Button`).
- **Usado por**: `KpiCard.tsx` (borde de acento + ícono default, rol `brand`), `SectionHeader.tsx`/`Modal.tsx`/`Button.tsx` (mapeo de color histórico → rol semántico, mismo criterio en los tres: `COLOR_TO_SEMANTIC`/`ICON_COLOR_TO_SEMANTIC`/`COLOR_SCHEME_TO_SEMANTIC`), `alertStyles.ts` (`ALERT_STYLES` de `success`/`error`/`warning`/`info`). Todos los componentes de la sección "Design Tokens" ya están migrados — futuros componentes con color deben consumir este mapa desde el inicio, no crear uno nuevo.

## Índice por escenario de uso

- **Botones/acciones**: [Button](#button), [IconActionButton](#iconactionbutton)
- **Feedback/alertas**: [AlertBanner](#alertbanner), [InfoBanner](#infobanner), [Toast](#toast--toastprovider--usetoast), [OfflineBanner](#offlinebanner), [FieldError](#fielderror)
- **Diálogos/modales**: [Modal](#modal), [ConfirmDialog](#confirmdialog), [SelectModal](#selectmodal)
- **Tablas/listados**: [Table](#table), [GridView](#gridview), [EmptyState](#emptystate), [AuditLogPanel](#auditlogpanel), [ConfigAuditLogPanel](#configauditlogpanel)
- **Formularios**: [NumericInput](#numericinput), [Select](#select), [FileDropZone](#filedropzone), [TagMultiSelect](#tagmultiselect), [RoleMultiSelect](#rolemultiselect), [HintSignals](#hintsignals-requiredmark--helphint), [PasswordStrengthMeter](#passwordstrengthmeter)
- **Badges/estado**: [StatusBadge](#statusbadge), [RoleBadge](#rolebadge)
- **Layout/estructura**: [Card](#card), [SectionHeader](#sectionheader), [KpiCard](#kpicard), [FilterBar](#filterbar-searchinput--selectfilter), [TableToolbar](#tabletoolbar)
- **Navegación/shell**: [SidebarNav](#sidebarnav), [ConfigDropdown](#configdropdown), [MobileTopBar](#mobiletopbar), [SidebarTip](#sidebartip)
- **Notificaciones internas**: [NotificationBell](#notificationbell), [NotificationList](#notificationlist), [NotificationsProvider](#notificationsprovider--usenotifications)
- **Tooltips**: [Tooltip](#tooltip), [SidebarTip](#sidebartip) (solo sidebar colapsado)
- **Popovers (click, contenido interactivo)**: [VersionHistoryPopover](#versionhistorypopover)
- **Exportación**: [ExportButton](#exportbutton)
- **Helpers no-componente**: [alertStyles.ts](#alertstylests), [sidebarNavClasses.ts](#sidebarnavclassests), [colorTokens.ts](#colortokensts)
- **Design tokens / animación**: ver [sección Design Tokens](#design-tokens) arriba y `springs` en `src/animations.ts`.

---

## Button

**Path**: `src/components/UI/Button.tsx`

Botón estándar con sistema de variante/tamaño/color y estado de carga integrado.

- **Props**: `variant?: "primary"|"secondary"|"danger"`, `size?: "sm"|"md"`, `colorScheme?: "sky"|"emerald"|"purple"|"rose"|"indigo"|"amber"|"violet"|"slate"` (default `"indigo"` en `primary`), `isLoading?: boolean`, `icon?: ReactNode`, + atributos nativos de `<button>`
- **Cuándo usarlo**: cualquier botón de acción primaria/secundaria/peligrosa en la app.
- **Convenciones**: `primary` compone su gradiente desde `SEMANTIC_COLOR_MAP` (`colorTokens.ts`) vía `COLOR_SCHEME_TO_SEMANTIC` — mismo mapeo que `SectionHeader`/`Modal` (`purple/indigo/violet→info`, `sky→brand`, etc.); `danger` siempre renderiza el gradiente del rol `danger` sin importar `colorScheme` (antes era un `Record<ColorScheme,...>` de 8 entradas con el mismo string repetido — colapsado a una función). Radio `rounded-control`; duración de transición `var(--duration-fast)` vía `style` (no clase Tailwind, `--duration-*` no genera utilidad — ver sección Design Tokens). Muestra `Spinner` interno si `isLoading`.

## IconActionButton

**Path**: `src/components/UI/IconActionButton.tsx`

Botón icon-only con `Tooltip` integrado (reemplaza `title` nativo). Promovido en la sección 1.5 del Plan Maestro tras detectar el mismo shell reimplementado en 4+ tablas.

- **Props**: `icon: ReactNode`, `label: string` (aria-label), `tooltip: string`, `onClick`, `disabled?`, `isBusy?`, `tone?: "slate"|"sky"|"indigo"|"emerald"|"amber"|"rose"`, `placement?: TooltipPlacement`
- **Cuándo usarlo**: botones de acción de fila en tablas/tarjetas (editar, eliminar, activar/desactivar, fijar como base, etc.).
- **Convenciones**: `isBusy` deshabilita y muestra `Spinner`; el mapa `tone` define el color de hover. **No reimplementar el botón icon-only con borde + hover de color a mano** — usar este componente.

---

## AlertBanner

**Path**: `src/components/UI/AlertBanner.tsx`

Banner estático inline para mensajes success/error/warning/info (no es un toast, permanece en el DOM).

- **Props**: `type: AlertType`, `message: string`, `icon?: ReactNode`, `className?`
- **Cuándo usarlo**: feedback persistente dentro de una página/formulario.
- **Convenciones**: usa `ALERT_ICONS`/`ALERT_STYLES` compartidos de `alertStyles.ts`; `role="alert"` en error/warning, `role="status"` en el resto.

## InfoBanner

**Path**: `src/components/UI/InfoBanner.tsx`

Caja de ayuda contextual colapsable (explica fórmulas/reglas/umbrales).

- **Props**: `title: string`, `children: ReactNode`, `color?: "sky"|"amber"|"emerald"|"indigo"|"slate"`, `defaultOpen?` (default `true`), `className?`
- **Cuándo usarlo**: explicar lógica de negocio/fórmulas inline sin ocupar espacio permanente.
- **Convenciones**: acordeón con `AnimatePresence`; el estado abierto/cerrado no persiste al desmontar.

## Toast / ToastProvider / useToast

**Path**: `src/components/UI/Toast.tsx`

Sistema global de notificaciones efímeras (provider + hook), apiladas arriba-derecha, auto-dismiss con barra de progreso.

- **API**: `ToastProvider({ children })` (montar una sola vez en la app); hook `useToast(): { showToast(message, type?, options?) }`. `ShowToastOptions`: `action?: {label, onClick}`, `priority?: "normal"|"high"`, `variant?: "default"|"notification"`, `targetRole?` (informativo)
- **Cuándo usarlo**: feedback efímero de éxito/error/warning/info tras una acción del usuario.
- **Convenciones**: máx. 5 toasts simultáneos; duración 4s normal / 8s alta prioridad / 7s variante `notification`; comparte `ALERT_ICONS`/`ALERT_STYLES` con `AlertBanner`. `variant: "notification"` está reservado para alertas de `NotificationsProvider`.

## OfflineBanner

**Path**: `src/components/UI/OfflineBanner.tsx`

Banner fijo arriba del viewport cuando no hay conexión.

- **Props**: ninguno
- **Cuándo usarlo**: montado una sola vez en la raíz de la app (advertencia global de conectividad).
- **Convenciones**: retorna `null` si está online; usa `useOnlineStatus`; `z-[99999]`, `role="alert"`.

## FieldError

**Path**: `src/components/UI/FieldError.tsx`

Mensaje de error inline para un campo de formulario, más un helper de clases para el borde del input.

- **API**: componente `<FieldError message? className? />`; helper `fieldErrorClasses(hasError: boolean): string`
- **Cuándo usarlo**: debajo de cualquier input/select/textarea para mostrar errores de validación, junto con `fieldErrorClasses` para el borde/focus-ring en rojo.
- **Convenciones**: entra/sale con `AnimatePresence` (altura+opacidad, 150ms) en vez de aparecer de golpe — evita el salto de layout cuando el campo cambia de válido a inválido mientras el usuario escribe. No renderiza nada si no hay `message`.

---

## Modal

**Path**: `src/components/UI/Modal.tsx`

Shell de modal genérico basado en portal, con slots de header/body/footer, focus trap y cierre por ESC.

- **Props**: `isOpen`, `onClose`, `children`, `footer?`, `maxWidth?` (`max-w-sm`…`max-w-4xl`), `closeDisabled?`, `hideCloseButton?`, `icon?`, `badge?`, `title?`, `infoLine?`, `iconColor?: "sky"|"blue"|"amber"|"emerald"|"purple"|"indigo"|"rose"|"slate"` (default `"amber"`)
- **Cuándo usarlo**: base de todo modal nuevo — no crear un modal desde cero con `createPortal` propio.
- **Convenciones**: portal a `document.body`; focus trap con ciclo de Tab y restauración de foco al cerrar; header slate-900; `role="dialog" aria-modal="true"`. El chip de ícono resuelve sus clases desde `SEMANTIC_COLOR_MAP` (`colorTokens.ts`, campo `bgAlpha400`/`icon400`) vía `ICON_COLOR_TO_SEMANTIC` — mismo mapeo que `SectionHeader.COLOR_TO_SEMANTIC`. Esta migración corrigió un bug real: `iconColor="indigo"` se usaba en 2 modales pero no existía en el `ICON_COLORS` viejo, así que caían silenciosamente al fallback `amber`; ahora resuelve a `info` (violeta) correctamente. Radio del panel `rounded-container`; radio del chip de ícono `rounded-control`.

## ConfirmDialog

**Path**: `src/components/UI/ConfirmDialog.tsx`

Especialización de `Modal` para confirmaciones "¿estás seguro?".

- **Props**: `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel?`, `cancelLabel?`, `variant?: "danger"|"warning"|"info"`, `isLoading?`
- **Cuándo usarlo**: antes de acciones destructivas o críticas irreversibles (eliminar, cambio de estado irreversible).
- **Convenciones**: `variant` define ícono (AlertTriangle/CheckCircle) y color del botón de confirmar; deshabilita cierre mientras `isLoading`.

## SelectModal

**Path**: `src/components/UI/SelectModal.tsx`

Botón que abre un modal tipo tabla con búsqueda — reemplazo de `<select>` nativo para catálogos grandes.

- **Props**: `isOpen`, `onClose`, `onOpen`, `onSelect`, `options: SelectModalOption<T>[]` (`{value,label,description?,raw}`), `selectedValue?`, `triggerLabel`, `title`, `infoLine?`, `icon?`, `iconColor?`, `maxWidth?`, `columns?: Column<SelectModalOption<T>>[]`, `emptyMessage?`, `disabled?`, `triggerClassName?`, `cancelText?`, `confirmText?`, `allowDeselect?`, `onDeselect?`
- **Cuándo usarlo**: elegir un proveedor/material/proyecto/etc. de un catálogo grande dentro de un formulario.
- **Convenciones**: compone `Modal` + `Table`; filtrado client-side (adecuado para <5k registros); Enter confirma, Esc cierra la búsqueda; genérico sobre `T`.

---

## Table

**Path**: `src/components/UI/Table.tsx`

Tabla de datos genérica con ordenamiento, paginación, skeleton de carga, empty state, header sticky y click/dblclick/selección de filas. **Exportación nombrada** (`Table`, `Column<T>`), no default.

- **Props**: `columns: Column<T>[]` (`key,label,align?,width?,className?,sortable?,render?,sortValue?`), `data: T[]`, `rowKey`, `isLoading?`, `loadingRows?`, `emptyMessage?`, `emptyState?`, `footer?`, `pageSize?` (activa paginación), `maxHeight?`, `fillViewport?`, `containerClassName?`, `className?`, `stickyHeader?`, `rowHoverClass?`, `alternating?`, `onRowClick?`, `onRowDoubleClick?`, `selectedRowKey?`, `selectedRowClass?`
- **Ordenar por un valor calculado**: `sortable: true` por sí solo ordena por `row[column.key]` — si el dato mostrado en la columna no es un campo directo de la fila (ej. un conteo derivado calculado por el consumidor, como "cantidad de rechazos" en `RevisedDocumentsSection.tsx`), agregar `sortValue: (row: T) => string | number` a esa columna. Cuando está presente, `Table` ordena por ese valor en vez de `row[key]` — 100% opt-in y retrocompatible, las columnas existentes sin `sortValue` no cambian de comportamiento.
- **Cuándo usarlo**: cualquier vista tabular — es el primitivo base (usado también dentro de `SelectModal`).
- **Convenciones**: sort/paginación client-side. Botones de paginación con radio `rounded-control` (token). Transición skeleton→contenido vía `AnimatePresence mode="wait"` (crossfade, no swap abrupto) — dentro del `tbody` de datos, las filas entran con stagger (`itemVariants`, `staggerChildren: 0.03`); el cambio de página anima solo la entrada (sin `exit` por fila, para no bloquear la interacción en clicks rápidos de paginación).
- **Alto del contenedor scrolleable — `maxHeight` vs `fillViewport`**: por defecto la tabla no tiene alto máximo (crece con su contenido). Dos formas opt-in de acotarla, mutuamente excluyentes (`fillViewport` gana si ambas se pasan):
  - `maxHeight?: string` (histórico): alto fijo en cualquier unidad CSS (ej. `"29rem"`). Sirve cuando el contexto alrededor de la tabla es estable y se conoce de antemano el alto ideal — pero no se adapta a zoom del navegador ni a pantallas más bajas: con zoom alto o poca altura de viewport, un `maxHeight` fijo puede sobrar o quedar corto, dejando espacio muerto o forzando scroll de página innecesario.
  - `fillViewport?: boolean` (nuevo): dentro de `Table`, hace que el contenedor raíz sea `flex h-full flex-col` y el contenedor scrolleable interno `flex-1 min-h-0` — la tabla ocupa el 100% del alto que le da su contenedor **padre**, en vez de calcular un número propio. **`Table` por sí sola no resuelve nada con esta prop** — necesita que el consumidor le dé una altura real al padre, o no hay nada que "llenar". El patrón completo (ver `UsuariosPanel`/`ProveedoresConfigPanel`/`MaterialConfigPanel`): la columna que envuelve header+`TableToolbar`+`Table` usa `lg:sticky lg:top-6` + `style={{ height: "calc(100vh - 3rem)" }}` + `flex flex-col` — mismo mecanismo que ya usa `ConfigAuditLogPanel`/`AuditLogPanel` (`sticky`+`fillViewport` ahí, con `stickyOffset="1.5rem"` default, que es exactamente ese `top-6`/`3rem`). Con ambas columnas del grid usando el mismo mecanismo `sticky`+`calc(100vh)`, terminan pixel-a-pixel alineadas sin importar zoom o alto de pantalla.
    - **Por qué no bastaba con `h-full` + CSS Grid `stretch`** (intento intermedio, descartado): en teoría un grid con `align-items: stretch` (el default) estira todas las columnas de una fila a la altura de la más alta, así que la columna de la tabla con `h-full` debería heredar la altura de la columna de auditoría. En la práctica esto no funciona en esta app porque **ninguna columna define una altura real** — el layout raíz (`AuthenticatedLayout.tsx`) usa `min-h-screen` en cascada (`min-height`, no `height`), así que no hay ningún ancestro con alto fijo del cual "heredar". El `grid` mide `fit-content` de su fila, que termina siendo la altura *intrínseca* de la columna de la tabla (header+toolbar+filas+paginación, variable según cuántos registros haya) — no la del panel de auditoría, que calcula su altura de forma *absoluta* contra `100vh` sin depender del grid en absoluto. Verificado con medición real en navegador (Playwright): ambas columnas medían alturas distintas y sin relación causal.
    - **Por qué no bastaba con medir `getBoundingClientRect().top` en runtime** (primer intento, también descartado): mismo problema de fondo — sin una altura de referencia fija en el padre, `window.innerHeight - top` da un número que no tiene ninguna garantía de coincidir con el que calcula el panel de auditoría vecino (que usa su propio `top` sticky + su propio `bottom` margin, de forma completamente independiente). Cualquier intento de "medir y calzar" dos elementos que calculan su altura por caminos distintos es frágil por diseño; la solución robusta es que **ambos usen el mismo mecanismo** (`sticky` + `calc(100vh - offset)`), no que uno intente adivinar el resultado del otro.
    - **Alcance**: aplicado en `UsuariosPanel`, `ProveedoresConfigPanel`, `MaterialConfigPanel` (mismo patrón de columna `sticky` en las 3). **No usado** en `AIConfigTable` (dentro de `AIConfigPanel`): ahí la tabla va debajo de `UsageDashboard`, cuyo alto varía con la cantidad de proveedores con actividad, y no vive en un layout de 2 columnas junto a un panel de auditoría que deba calzarle — se dejó con `maxHeight="30rem"` fijo.
- **Nota histórica**: tuvo un sistema de virtualización (`virtualizeThreshold` + `@tanstack/react-virtual`) que ningún consumidor activaba nunca y sin tests — eliminado como código muerto (auditoría de MaterialConfigPanel). Si una tabla futura necesita virtualización real (miles de filas), reintroducir con un caso de uso concreto, no especulativamente. La virtualización real que sí se necesitó después vive en [`GridView`](#gridview) (variante de tarjetas, no de tabla) — no reintroducir aquí.

## GridView

**Path**: `src/components/UI/GridView/` (`GridView.tsx`, `GridCard.tsx`, `useFullViewport.ts`, `types.ts`)

Variante de visualización alternativa a `Table` — mismos datos, layout de cuadrícula de tarjetas en vez de filas. Genérico sobre `T`, misma filosofía que `Column<T>.render`: el componente no conoce el dominio de los items, el consumidor decide qué pintar dentro de cada tarjeta vía `renderCard`. **No es una extensión/subclase de `Table`** — son dos componentes hermanos e independientes que un mismo consumidor puede alternar sobre el mismo `data`/`items` (ver `RevisedDocumentsSection.tsx`, Cierre de Obra → "Historial de Expedientes", primer y único consumidor hoy).

- **Import**: `import GridView from "src/components/UI/GridView/GridView"` (default export).
- **Props** (`GridViewProps<T>`, `types.ts`):
  - `items: T[]` — el dataset, igual rol que `data` en `Table`.
  - `rowKey: (item: T, index: number) => string | number` — igual que `Table.rowKey`.
  - `renderCard: (item: T, index: number) => ReactNode` — **obligatorio**, contenido interno de cada tarjeta. `GridView`/`GridCard` no imponen ninguna estructura (header/métricas/acciones) — el consumidor arma su propio JSX libremente, normalmente en un archivo separado de su propia vista (ver `ExpedienteGridCard.tsx` en Cierre de Obra) para no mezclar la lógica de dominio con el mecanismo del grid.
  - `cardAccent?: (item: T) => SemanticColor | undefined` — color de borde/anillo de selección de la tarjeta, resuelto desde `SEMANTIC_COLOR_MAP` (`colorTokens.ts`). El consumidor decide la condición (ej. `danger` si el item representa algo rechazado); `GridView` no interpreta el dominio, solo aplica el rol indicado. Sin esta prop, o si devuelve `undefined`, usa `neutral`.
  - `onSelect?: (item: T) => void` — click en la tarjeta.
  - `selectedKey?: string | number` — resalta la tarjeta cuya `rowKey` coincide (mismo patrón que `Table.selectedRowKey`).
  - `minCardWidth?: number` (default `280`) — ancho mínimo estimado en px, determina cuántas columnas caben por fila según el ancho medido del contenedor.
  - `estimateRowHeight?: number` (default `180`) — alto estimado de una fila en px, usado por el virtualizador antes de medir filas reales.
  - `emptyState?: ReactNode` — igual rol que `Table.emptyState`.
  - `className?: string`.
- **Cuándo usarlo**: cuando una tabla de filas no es la forma más legible de escanear el dataset (fotos/miniaturas, tarjetas con varias métricas visuales, catálogos) y se quiere ofrecer esa vista como alternativa (no reemplazo) a `Table` sobre el mismo dato — típicamente detrás de un toggle Tabla/Grid que el consumidor arma con dos botones simples (ver `RevisedDocumentsSection.tsx`).
- **Inicializar en Tabla o Grid**: `GridView` no lo decide — es una prop del **consumidor**. Patrón usado en `RevisedDocumentsSection.tsx`: `defaultViewMode?: "table" | "grid"` en las props del componente contenedor (default `"table"`), usado como valor inicial de un `useState` local (`viewMode`) que el toggle actualiza. No hay persistencia automática entre sesiones (ej. `localStorage`) — si se necesita recordar la última vista elegida por el usuario, es responsabilidad explícita a agregar en el consumidor, no algo que `GridView` haga por defecto.
- **Convenciones/mecanismo interno**:
  - **Virtualización**: usa `@tanstack/react-virtual` (`useVirtualizer`), virtualizando por **filas** (la librería es 1D nativamente) — `columnsPerRow` se deriva del ancho medido (`useFullViewport`) y `minCardWidth`, cada fila virtualizada renderiza sus N tarjetas vía `items.slice()`. Solo las filas visibles (+ overscan de 3) están en el DOM — verificable en DevTools con datasets grandes.
  - **`useFullViewport`**: hook interno del componente (no vive en `src/hooks/`, es un detalle de implementación de `GridView`) que mide `clientWidth`/`clientHeight` del contenedor vía `ResizeObserver` — mismo patrón que `useContainerRows` (`src/hooks/useContainerRows.ts`), no mide `window` global. El `containerRef` que devuelve se usa internamente como el propio scroll element del grid; el consumidor no necesita pasarle nada, solo darle un padre con altura real (`flex-1 min-h-0`, igual criterio que `Table fillViewport`).
  - **Animación**: `containerVariants`/`itemVariants` (`src/animations.ts`) para el stagger de montaje de filas; `layout` en cada `GridCard` para reflow orgánico al filtrar; `whileHover`/`whileTap` (leve elevación + escala) en cada tarjeta.
  - **Memoización**: `GridCard` está envuelto en `React.memo` con comparador superficial (`cardKey`, `children`, `accent`, `isSelected`, `onClick`) — el contenido interno (`renderCard`) es responsabilidad del consumidor memoizar si resulta costoso, `GridCard` no puede saberlo.
  - **Color**: nunca hex/rgb hardcodeado — borde/fondo/ring de cada tarjeta resuelven desde `SEMANTIC_COLOR_MAP` según `cardAccent`.
- **Testing en jsdom**: el `ResizeObserver` global de `test/setup.ts` es un no-op (no dispara callback), y `@tanstack/react-virtual` mide el scroll element vía `offsetWidth`/`offsetHeight` (no `getBoundingClientRect` ni solo `clientWidth`/`clientHeight`) — un test que monte `GridView` necesita stubear **ambos** pares de propiedades en `HTMLDivElement.prototype` más un `ResizeObserver` síncrono local (mismo patrón que `useContainerRows.test.tsx`). Ver `src/__tests__/components/UI/GridView.test.tsx` (`stubSyncResizeObserver`/`stubContainerSize`) para el helper ya resuelto — copiar ese patrón en vez de redescubrirlo.

## EmptyState

**Path**: `src/components/UI/EmptyState.tsx`

Placeholder con borde punteado para listas/tablas vacías.

- **Props**: `message: string`, `icon?: ReactNode`, `className?`
- **Cuándo usarlo**: cualquier lista/tabla/panel con cero resultados.
- **Convenciones**: ícono por defecto `Inbox`; texto itálico atenuado.

## AuditLogPanel

**Path**: `src/components/UI/AuditLogPanel.tsx`

Panel de historial/auditoría colapsable genérico, con búsqueda y paginación opcional del servidor.

- **Props**: `entries: T[]`, `searchableText: (e:T)=>string`, `renderEntry: (e:T)=>ReactNode`, `keyOf`, `isLoading?`, `defaultOpen?`, `sticky?: boolean`, `stickyOffset?: string`, `fillViewport?: boolean`, `pagination?: {page,lastPage,total,onPageChange}`, `searchValue?: string`, `onSearchChange?: (v)=>void`, `filtersSlot?: ReactNode`, `activeFilterCount?: number`
- **Cuándo usarlo**: sidebar de "quién cambió qué y cuándo" en vistas de configuración (proveedores, materiales, IA, CONFIG APP, usuarios).
- **Convenciones**: genérico sobre `T`; `sticky` + `fillViewport` reproducen un panel fijo/scroll-contenido; usa `Spinner`/`EmptyState`.
- **Búsqueda client-side vs. server-side**: por defecto (`searchValue`/`onSearchChange` no pasados) filtra `entries` localmente con `searchableText` — solo ve lo que ya está cargado. Pasar ambas props activa **búsqueda controlada**: el panel deja de filtrar internamente (asume que `entries` ya viene filtrada del backend) y el input refleja/dispara ese valor externo — necesario cuando `entries` es solo una página y hay registros que buscar en otras. Único consumidor hoy de este modo: `ConfigAuditLogPanel`.
- **Filtros avanzados (`filtersSlot`)**: slot de contenido libre (selects, inputs de fecha, etc.) que el panel renderiza dentro de un acordeón colapsable ("Filtros avanzados", ícono `SlidersHorizontal`) debajo del buscador, con un badge del número de filtros activos (`activeFilterCount`) en el botón de toggle. El panel no sabe qué filtros son — solo los muestra/oculta; la lógica de cada filtro y su combinación con el buscador vive en el consumidor (`ConfigAuditLogPanel`).

## ConfigAuditLogPanel

**Path**: `src/components/UI/ConfigAuditLogPanel.tsx`

Especialización de `AuditLogPanel` para `ConfigAuditLogRecord` (`useConfigAuditLogs`) — resuelve el título de cada entrada (label legible de setting, o `action` para el resto de entidades administrativas) y arma el `renderEntry`/`searchableText` para que ninguna vista consumidora los reimplemente.

- **Props**: `title?`, `logs: ConfigAuditLogRecord[]`, `isLoading`, `settingLabelByKey?` (solo aplica a `entityType: "setting"`), `searchPlaceholder?`, `emptyMessage?`, `pagination?`, `filters?: ConfigAuditLogFilters`, `onFilterChange?`, `onClearFilters?`, `activeFilterCount?`.
- **Cuándo usarlo**: panel lateral de auditoría en cualquier vista de configuración — `UsuariosPanel`, `ProveedoresConfigPanel`, `MaterialConfigPanel`, `AIConfigPanel`, `ConfigAppPanel` (las 5 lo usan hoy, todas con `useConfigAuditLogs`).
- **Filtros server-side reales**: antes la búsqueda era enteramente client-side sobre la página cargada (20 registros) — un cambio de hace una semana era invisible salvo que estuviera justo en esa página, lo que hacía inútil "auditar" con cualquier volumen de historial. `filters`/`onFilterChange`/`onClearFilters`/`activeFilterCount` (expuestos por `useConfigAuditLogs`) conectan el panel a filtros reales contra el backend: `q` (texto libre sobre setting_key/old_value/new_value/user_name_snapshot/action, con debounce de 350ms), `entityType` (select con catálogo fijo — proveedores/materiales/usuarios/IA/monedas/notificaciones/configuración), `action` (select cuyas opciones se derivan de las acciones ya vistas en los `logs` cargados en esta sesión, no de un catálogo separado — sigue creciendo mientras el usuario navega), `user` (texto libre sobre el nombre del usuario que hizo el cambio, debounced), `dateFrom`/`dateTo` (rango inclusivo). Todos combinables con AND. Sin pasar estas 4 props (`filters`/`onFilterChange`/etc.), el componente cae al comportamiento heredado 100% compatible (búsqueda client-side sobre la página actual, sin acordeón de filtros) — opt-in, no rompe consumidores que aún no los pasen.
- **Backend**: `GET /config-audit-logs` acepta `q`, `entity_type`, `action`, `user`, `date_from`, `date_to` además de `page`/`per_page` — ver `ConfigAuditLogController::index()`. Índices agregados en `config_audit_logs` sobre `(entity_type, changed_at)`, `action`, `changed_at`, `user_name_snapshot` para que el filtrado no haga table scan con el historial creciendo indefinidamente.
- **Badge de tipo de entidad**: cada tarjeta de entrada muestra un badge con el tipo (ej. "Proveedores") cuando `entityType !== "setting"` — antes esta información solo era implícita en el texto de `action`, ahora es visualmente identificable de un vistazo al escanear la lista mezclada.

---

## NumericInput

**Path**: `src/components/UI/NumericInput.tsx`

`<input type="number">` saneado que bloquea notación científica y (por defecto) negativos.

- **Props**: `value: number | ""`, `onChange`, `step?`, `min?` (default `0`), `max?` (clampa), `allowNegative?`, `integer?`, `accent?: SemanticColor` (default `"brand"`), `id?`, `placeholder?`, `className?`
- **Cuándo usarlo**: cualquier campo numérico de cantidad/moneda/semanas.
- **Convenciones**: el estado externo debe ser `number | ""`; sanea en change/keydown/paste; fuente mono-bold integrada; consume `SEMANTIC_COLOR_MAP` para el color de foco vía `accent` (igual criterio que `Select`).

## Select

**Path**: `src/components/UI/Select.tsx`

`<select>` estilizado TRUE VALUE: reemplaza los `<select>` con clases hardcoded duplicadas (radios/paddings/focus-rings distintos entre sí) que existían sueltos por la app antes de este componente. Chevron propio vía `lucide-react` (`appearance-none` oculta el nativo del navegador).

- **Props**: `value: string`, `onChange: (value: string) => void`, `options: SelectOption[]` (`{value,label}`), `id?`, `accent?: SemanticColor` (default `"info"`), `size?: "sm"|"md"` (default `"md"`), `icon?: ReactNode` (ícono inset a la izquierda, ajusta padding automáticamente), `hasError?`, `disabled?`, `required?`, `ariaLabel?`, `title?`, `className?`
- **Cuándo usarlo**: cualquier `<select>` de la app — reemplaza por completo el patrón de escribir un `<select>` a mano con clases propias.
- **Convenciones**: consume `SEMANTIC_COLOR_MAP` para el color de foco (`accent`) vía un mapa estático de clases (nunca interpolar `focus:ring-${accent}-200` directamente — Tailwind v4 no puede purgar/generar clases dinámicas construidas en runtime); consume `fieldErrorClasses` de `FieldError.tsx` para el estado `hasError`; `size="sm"` para selects inline en filas de tabla/tarjeta; `icon` para selects con ícono de contexto (ej. `Shield` en selector de rol de `UserFormModal`).

## FileDropZone

**Path**: `src/components/UI/FileDropZone.tsx`

Zona de arrastrar-y-soltar + click-para-explorar con validación y listado de archivos.

- **Props**: `files: File[]`, `onFilesChange`, `label`, `accept` (lista `.ext`), `extensionsLabel`, `color?: "sky"|"indigo"|"purple"|"emerald"`, `icon?`, `fileIcon?`, `id?`, `required?`, `countLabel?`, `maxSizeBytes?` (default 10MB, `0`=sin límite), `onFileRejected?: (fileName,reason)=>void`
- **Cuándo usarlo**: campos de carga de archivos (planos, documentos, hojas de cálculo) que necesiten validación client-side de extensión/tamaño/MIME.
- **Convenciones**: valida extensión contra `accept`, tamaño y MIME (vía `EXT_MIME_MAP` interno); deduplica por nombre+tamaño; sistema de color por tema.

## TagMultiSelect

**Path**: `src/components/UI/TagMultiSelect.tsx`

Multi-select tipo chip para una lista fija de opciones, con "seleccionar todo"/"ninguno".

- **Props**: `options: TagOption[]` (`{value,label}`), `value: string[]`, `onChange`, `disabled?`, `className?`
- **Cuándo usarlo**: elegir entre un catálogo conocido (roles, categorías) — reemplaza `<select multiple>` o un textarea JSON crudo.
- **Convenciones**: `value`/`onChange` operan sobre `option.value`; `aria-pressed` por chip; es la base de `RoleMultiSelect`.

## RoleMultiSelect

**Path**: `src/components/UI/RoleMultiSelect.tsx`

Wrapper de `TagMultiSelect` específico para roles, con etiquetas legibles.

- **Props**: `roles: string[]`, `value: string[]`, `onChange`, `disabled?`, `className?`
- **Cuándo usarlo**: selectores de rol/permiso en la matriz de notificaciones (CONFIG APP).
- **Convenciones**: mapea roles vía `roleLabel` de `constants/roles`; delgado, sin estilo propio.

## HintSignals (RequiredMark + HelpHint)

**Path**: `src/components/UI/HintSignals.tsx`

Dos indicadores pequeños para componer junto a labels: `RequiredMark` (indicador dinámico de obligatoriedad) y `HelpHint` (ícono de ayuda + `Tooltip`).

- **Props**: `RequiredMark`: `filled: boolean` (obligatoria), `placement?: TooltipPlacement`, `className?`. `HelpHint`: `content: string`, `placement?: TooltipPlacement`, `className?`
- **Cuándo usarlo**: junto a labels de campos de formulario, para marcar obligatoriedad (con feedback en vivo del estado del campo) o dar ayuda contextual.
- **Convenciones**: ambos son named exports; ambos envuelven `Tooltip`; sin opinión sobre el layout del label (se compone en el call site, ej. `<label className="flex items-center gap-1">Nombre <RequiredMark filled={name.trim().length > 0} /></label>`). `RequiredMark` NO es un asterisco estático: mientras `filled` es `false` muestra un triángulo de alerta rojo con tooltip "Este campo es obligatorio"; apenas `filled` es `true` cruza-desvanece (`AnimatePresence`, spring) a un check verde con tooltip "¡Válido!". El caller decide el criterio de "lleno" (ej. trim().length > 0, o coincidencia de confirmación de contraseña) y debe pasarlo de forma controlada — no hay validación interna.

## PasswordStrengthMeter

**Path**: `src/components/UI/PasswordStrengthMeter.tsx`

Indicador de fuerza de contraseña: barra continua + checklist de requisitos, ambos con feedback en vivo mientras el usuario escribe. Extraído para reusarse en cualquier flujo de alta/cambio de contraseña (hoy: `UserFormModal` en creación de usuario).

- **Props**: `password: string`, `requirements: PasswordRequirement[]` (`{label, met}`, calculados por el caller — el componente no conoce las reglas de negocio de complejidad)
- **Cuándo usarlo**: debajo de cualquier input de contraseña nueva (alta de usuario, cambio/reset de contraseña) para dar guía proactiva en vez de solo marcar error al fallar.
- **Convenciones**: no renderiza nada si `password` está vacío. La barra usa `width` animado en `%` (no `scaleX` sobre segmentos `flex-1` — esa primera versión no renderizaba el progreso de forma fiable porque el ancho computado de un hijo `flex-1` no es estable para animar `scaleX`). Nivel de fuerza (`Muy débil→Fuerte`) se deriva de `metCount/requirements.length` y resuelve color vía `SEMANTIC_COLOR_MAP` (`danger→warning→info→success`). El checklist anima cada ítem con check/cruz (`AnimatePresence mode="wait"`, `springs.snappy`) al cumplirse/incumplirse en vivo.

---

## StatusBadge

**Path**: `src/components/UI/StatusBadge.tsx`

Badge de color para códigos de estado de proyecto o de rol.

- **Props**: `code: string`, `label?: string` (sobrescribe el lookup por defecto), `isRole?: boolean`, `className?`
- **Cuándo usarlo**: columna de estado en tablas, visualización de rol.
- **Convenciones**: colores/labels resueltos vía `getRoleColor`/`getStatusColor`/`STATUS_LABELS` de `../../utils` — fuente única de verdad, no crear mapas locales.

## ActiveBadge

**Path**: `src/components/UI/ActiveBadge.tsx`

Badge "Activo/Inactivo" booleano puro con ícono — no está atado a semántica de estado-de-proyecto/rol como `StatusBadge` (por eso no es una variante de ese componente).

- **Props**: `isActive: boolean`, `activeLabel?` (default "Activo"), `inactiveLabel?` (default "Inactivo"), `className?`
- **Cuándo usarlo**: columnas/badges de "activo" en tablas de catálogo (monedas, configuraciones de IA, proveedores) — cualquier booleano activo/inactivo genérico, no un estado de flujo con más de 2 valores.
- **Convenciones**: `isActive` → rol `success` de `SEMANTIC_COLOR_MAP`; `false` → neutrales (`border-border-default`/`bg-surface-raised`/`text-text-tertiary`). Radio `rounded-pill`.

## RoleBadge

**Path**: `src/components/UI/RoleBadge.tsx`

Pastilla pequeña que muestra el rol activo ("Terminal: {rol}").

- **Props**: `role: string`, `variant?: "dark"|"light"`, `compact?: boolean` (omite el prefijo "Terminal:"), `className?`
- **Cuándo usarlo**: indicador de rol en navbar/sidebar.
- **Convenciones**: punto verde pulsante; `dark` para topbars/sidebar oscuros, `light` para superficies claras.

---

## Card

**Path**: `src/components/UI/Card.tsx`

Contenedor blanco redondeado estilo "bento".

- **Props**: `children`, `hoverable?: boolean` (default `true`), `className?`
- **Cuándo usarlo**: wrapper genérico de contenido/sección en dashboards y paneles.
- **Convenciones**: `hoverable` agrega transición de sombra; sin slots de header/footer (se componen manualmente). Radio `rounded-container` (token, 16px) — mismo nivel que `KpiCard`/`Modal`.

## SectionHeader

**Path**: `src/components/UI/SectionHeader.tsx`

Encabezado de sección: ícono + título + descripción, con acciones opcionales alineadas a la derecha.

- **Props**: `icon: ReactNode`, `title: string`, `description: string`, `color?` (`sky|blue|purple|emerald|amber|rose|indigo|slate`), `actions?: ReactNode`
- **Cuándo usarlo**: encabezado de cualquier panel/tab/sección (frecuentemente con un `ExportButton` en `actions`).
- **Convenciones**: borde inferior + margen integrados; el chip del ícono resuelve sus clases desde `SEMANTIC_COLOR_MAP` (`colorTokens.ts`) — la prop `color` sigue aceptando los 8 nombres históricos por compatibilidad (no se fuerza rename en las vistas), pero internamente se mapean a los 6 roles semánticos vía `COLOR_TO_SEMANTIC`: `sky/blue→brand`, `purple/indigo→info` (mismo tono, antes eran dos violetas ligeramente distintos), `emerald→success`, `amber→warning`, `rose→danger`, `slate→neutral`.

## KpiCard

**Path**: `src/components/UI/KpiCard.tsx`

Tarjeta de estadística de dashboard: ícono, label, value/sub o children personalizados.

- **Props**: `icon: ReactNode`, `label: string`, `value?`, `sub?`, `children?`, `variant?: "light"|"dark"`, `accent?: string`, `borderAccent?: string`, `color?` (deprecado, usar `borderAccent`), `onInspect?: () => void`
- **Cuándo usarlo**: grillas de KPIs/métricas en dashboards (Presidencia, Finanzas, etc.).
- **Convenciones**: `onInspect` muestra un botón de lupa en hover; variante `dark` es una tarjeta slate-900; color del borde izquierdo personalizable vía clase Tailwind (`borderAccent`/`accent`) — casi todas las vistas lo pasan explícito para diferenciar KPIs entre sí; el default (sin pasar nada) usa `SEMANTIC_COLOR_MAP.brand` (`colorTokens.ts`). Radio `rounded-container`; padding `p-5` (`--spacing-card-padding-compact`) intencionalmente más denso que `Card` (`p-6`) porque suele ir en grilla de 3-4 columnas.

## FilterBar (SearchInput + SelectFilter)

**Path**: `src/components/UI/FilterBar.tsx`

No tiene default export — expone dos controles pequeños: `SearchInput` y `SelectFilter`.

- **Props**: `SearchInput`: `id,value,onChange,placeholder,ariaLabel,className?`. `SelectFilter`: `id,value,onChange,ariaLabel,options: SelectOption[],title?,className?`
- **Cuándo usarlo**: barra de búsqueda + filtros dropdown arriba de tablas (extraído de patrones duplicados de Presidencia).
- **Convenciones**: named exports (sin default); `SelectFilter` es un wrapper delgado sobre `Select` (ver arriba) — `SelectOption` se define en `Select.tsx` y se re-exporta acá para no duplicar el tipo.

## TableToolbar

**Path**: `src/components/UI/TableToolbar.tsx`

Barra de herramientas para tablas de configuración: `SearchInput` + filtro `SelectFilter` opcional + chip contador animado ("X / Y elementos"). Extraída tras encontrar el mismo bloque duplicado carácter por carácter en `UsuariosPanel`, `ProveedoresConfigPanel` y `MaterialConfigPanel` (cada `index.tsx` lo escribía a mano encima de su `Table`, en vez de encapsularlo una sola vez).

- **Props**: `searchId`, `searchValue`, `onSearchChange`, `searchPlaceholder`, `searchAriaLabel`, `filter?: {id,value,onChange,ariaLabel,options}` (omitido si la vista no necesita un `SelectFilter` adicional), `countIcon: ReactNode`, `filteredCount: number`, `totalCount: number`, `noun: string`, `nounPlural: string`
- **Cuándo usarlo**: inmediatamente antes de un `Table` en cualquier panel de catálogo/configuración que tenga búsqueda + contador de resultados filtrados/totales. Si la vista necesita más de un filtro adicional, rango de fechas, o botones de exportación en la misma barra (ej. `MasterTableSection`/`AuditLogSection` de Presidencia), esas necesidades no encajan en esta abstracción de props fijas — se deja la barra manual en esos casos en vez de forzar un `extra?: ReactNode` de escape que devaluaría la abstracción.
- **Convenciones**: compone `SearchInput`/`SelectFilter` de `FilterBar.tsx`; el chip contador usa el mismo patrón `motion.span` con `springs.snappy` (`key={filteredCount}`, scale+fade al cambiar) que ya usaban las 3 vistas por separado; `filteredCount !== totalCount` muestra la fracción (`"3 / 12"`), si coinciden solo el total (`"12"`).

---

## SidebarNav

**Path**: `src/components/UI/SidebarNav.tsx`

Navegación lateral completa desktop/mobile: marca, links por rol, dropdown de configuración, footer de usuario/logout.

- **Props**: `isOpen`, `onClose`, `user`, `activeRole`, `onLogout`, `canAccess: (path)=>boolean`, `isCollapsed`, `onToggleCollapse`
- **Cuándo usarlo**: navegación primaria del shell de la app — una sola instancia en el layout, no reutilizable por vista.
- **Convenciones**: `memo`izado; rail colapsable con animación ease-out-expo; `SidebarTip` por ítem cuando está colapsado; usa `sidebarNavClasses.ts`; compone `ConfigDropdown`, `NotificationBell`, `RoleBadge`.

## ConfigDropdown

**Path**: `src/components/UI/ConfigDropdown.tsx`

Submenú acordeón de "Configuración" en el sidebar (Usuarios, Proveedores, Material, IA, App).

- **Props**: `isCollapsed: boolean`, `onClose: () => void`
- **Cuándo usarlo**: exclusivo de la sección de configuración de `SidebarNav` (no genérico).
- **Convenciones**: `memo`izado; acordeón de altura con `AnimatePresence`; `SidebarTip` por ítem cuando está colapsado; usa `sidebarNavClasses.ts`.

## MobileTopBar

**Path**: `src/components/UI/MobileTopBar.tsx`

Header superior fijo solo-mobile: botón de menú, logo, badge de rol, campana de notificaciones, email del usuario.

- **Props**: `user: {name,email}|null`, `activeRole: string`, `onMenuClick: () => void`
- **Cuándo usarlo**: header del shell en mobile (`lg:hidden`), pareja del drawer de `SidebarNav`.
- **Convenciones**: tema slate oscuro igual al sidebar; compone `RoleBadge` (dark, compact) y `NotificationBell` (dark).

## SidebarTip

**Path**: `src/components/UI/SidebarTip.tsx`

Tooltip basado en portal específico para el rail colapsado del sidebar.

- **Props**: `label: ReactNode`, `disabled?: boolean`, `children: ReactElement` (hijo único, clonado)
- **Cuándo usarlo**: exclusivo del sidebar; para tooltips de propósito general usar [`Tooltip`](#tooltip) en su lugar.
- **Convenciones**: portal a `document.body` (escapa el recorte de `overflow-y-auto`/`transform-gpu`); clona ref+handlers sobre el hijo vía `Children.only`; `memo`izado; posicionamiento solo a la derecha (sin prop `placement`, a diferencia de `Tooltip`).

---

## NotificationBell

**Path**: `src/components/UI/NotificationBell.tsx`

Ícono de campana con badge de no-leídos; abre dropdown desktop o bottom-sheet mobile.

- **Props**: `variant?: "dark"|"light"`, `align?: "right"|"left-start"` (lado de anclaje del dropdown desktop)
- **Cuándo usarlo**: bandeja de notificaciones internas persistente, montada tanto en `SidebarNav` como en `MobileTopBar`.
- **Convenciones**: consume `useNotifications()` de `NotificationsProvider`; cierra al hacer click afuera; bloquea scroll del body solo en el sheet mobile; renderiza `NotificationList` en ambas superficies.

## NotificationList

**Path**: `src/components/UI/NotificationList.tsx`

Cuerpo compartido de la lista de notificaciones (header + "marcar todo leído" + items), usado por ambas superficies de la campana.

- **Props**: `notifications: AppNotification[]`, `unreadCount`, `onMarkRead: (id)=>void`, `onMarkAllRead`, `listClassName?`
- **Cuándo usarlo**: renderizado dentro del dropdown/sheet de `NotificationBell` — no se usa standalone normalmente.
- **Convenciones**: sin wrapper de posicionamiento propio (el padre decide el marco); timestamps relativos vía `timeAgo` interno.

## NotificationsProvider / useNotifications

**Path**: `src/components/UI/NotificationsProvider.tsx`

Provider de contexto + hook que hace polling de `/notifications` y `/notifications/unread-count`, instancia única compartida por toda la app.

- **API**: `NotificationsProvider({ children })`; hook `useNotifications(): { notifications, unreadCount, isLoading, refresh, markRead, markAllRead }`
- **Cuándo usarlo**: debe envolver la app una sola vez (en `App.tsx`); consumido por `NotificationBell`. No es un componente visual.
- **Convenciones**: intervalo de polling desde `usePollingSettings`; dispara toast + notificación nativa del navegador (solo pestaña en segundo plano) ante IDs nuevos; vive en `UI/` (no en `hooks/`) porque expone JSX, igual que `Toast.tsx`.

---

## Tooltip

**Path**: `src/components/UI/Tooltip.tsx`

Tooltip genérico de propósito general, portal, 4 direcciones, accesible por teclado.

- **Props**: `content: ReactNode`, `placement?: "top"|"bottom"|"left"|"right"`, `disabled?`, `delay?` (default 150ms), `className?`, `children: ReactElement` (hijo único, clonado)
- **Cuándo usarlo**: cualquier tooltip de hover/focus fuera del sidebar (botones de acción de tabla, hints de ayuda, etc.) — es la versión general de `SidebarTip`.
- **Convenciones**: portal a `document.body` (escapa el recorte de `overflow-x-auto` en tablas); setea `aria-describedby` en el trigger; Escape lo cierra; usado por `IconActionButton` y `HelpHint`. **No usar `title="..."` nativo para tooltips nuevos** — usar este componente.

## VersionHistoryPopover

**Path**: `src/components/UI/VersionHistoryPopover.tsx`

Popover flotante controlado por **click** (no hover), con contenido interactivo — a diferencia de `Tooltip`, que es hover-only y `pointer-events-none` (su contenido no se puede clickear). Es el primer Popover genérico del repo; se extrajo el patrón de portal + `getBoundingClientRect()` de `Tooltip.tsx` pero con cierre por click-outside/ESC en vez de mouseleave.

- **Props**: `isOpen: boolean`, `onClose: () => void`, `anchorRef: RefObject<HTMLElement | null>` (elemento contra el que se posiciona), `children: ReactNode`, `placement?: "bottom"|"top"` (default `"bottom"`)
- **Cuándo usarlo**: contenido flotante que el usuario debe poder interactuar dentro (lista clicable, botones, formulario corto) anclado a un botón — no para texto simple de ayuda (eso es `Tooltip`).
- **Convenciones**: tema oscuro fijo (`bg-slate-800/95`, `text-slate-100`, mismo look que `Tooltip`); portal a `document.body`; el estado `isOpen` es controlado por el consumidor (no maneja su propio toggle); cierra con click fuera del popover Y del `anchorRef`, o con tecla ESC. Usado hoy en `ProjectDocumentsList.tsx` (`src/components/UI/`) para el historial de versiones (`V1`, `V2`...) de un documento, siempre con `placement="bottom"` (el único valor ejercitado hasta ahora; `"top"` es soportado pero sin consumidor real todavía).

---

## ExportButton

**Path**: `src/components/UI/ExportButton.tsx`

Botón único que exporta datos tabulares a CSV, XLSX, o una vista imprimible PDF.

- **Props**: `format: "csv"|"excel"|"pdf"`, `filename`, `headers: string[]`, `rows: ExportRow[]`, `title?`, `subtitle?`, `columns?: ExportColumn[]` (width/format/align/money), `footer?: {label,value}`, `icon?`, + atributos nativos de `<button>`
- **Cuándo usarlo**: toolbars de tabla/reporte que necesiten acciones "exportar como...".
- **Convenciones**: CSV usa Blob con BOM UTF-8; Excel carga `write-excel-file/browser` de forma perezosa; PDF inyecta un root DOM oculto solo-impresión (`PDF_PRINT_ROOT_ID`) y llama `window.print()`; formateo de moneda integrado; sin estilo propio del trigger (`className` controla el look por completo).

---

## Helpers (no son componentes)

### alertStyles.ts

**Path**: `src/components/UI/alertStyles.ts`

- **Exports**: `AlertType` (`"success"|"error"|"warning"|"info"|"action-required"|"urgent"`), `ALERT_ICONS: Record<AlertType, LucideIcon>`, `ALERT_STYLES: Record<AlertType, {bg,text,border}>`, `BACKEND_NOTIFICATION_TYPE_MAP`
- **Usado por**: `AlertBanner.tsx` y `Toast.tsx` — paleta/mapa de íconos compartido para no duplicar los mismos estilos carácter por carácter en ambos.
- **Convenciones de color**: `ALERT_STYLES` resuelve `success/error/warning` desde `SEMANTIC_COLOR_MAP` (roles `success`/`danger`/`warning`); `info` usa el rol `brand` (sky) — es el estándar de mercado para "informativo", no el rol interno `info` del mapa (que quedó anclado a violeta por `SectionHeader`, son solo nombres de rol distintos). `action-required` (violeta) y `urgent` (naranja) se quedan con color literal fuera del sistema de 6 roles — colapsarlos perdería la distinción real de negocio entre "requiere acción", "informativo" y "más urgente que error".

### sidebarNavClasses.ts

**Path**: `src/components/UI/sidebarNavClasses.ts`

- **Exports**: `navLinkClass(activeBg, borderColor, isCollapsed)` (className function de `NavLink` según `isActive`), `sidebarIconClass(isActive, activeClass?)`, `sidebarTextClass(isCollapsed, grow?)` (clases de fade/colapso del label)
- **Usado por**: `SidebarNav.tsx` y `ConfigDropdown.tsx` — centraliza factories de clases compartidas para no duplicar los mismos strings entre ambos.

---

## Patrones ya deduplicados (no reintroducir)

Estos patrones fueron identificados como duplicados y consolidados — si aparece una necesidad similar en una vista nueva, usar el componente ya existente en vez de reimplementar:

- **Botón icon-only de acción de fila** (borde + hover de color + tooltip) → [`IconActionButton`](#iconactionbutton). Antes reimplementado por separado en `AIConfigTable`, `CurrencyCard`, `MaterialConfigPanel/columns`, `ProveedoresConfigPanel/columns`.
- **Tooltip nativo (`title="..."`)** en elementos interactivos → [`Tooltip`](#tooltip) o [`IconActionButton`](#iconactionbutton). Preferir siempre el componente accesible (funciona también por teclado) sobre el atributo nativo.
- **Indicador de campo obligatorio** (asterisco o check/alerta junto al label) → [`RequiredMark`](#hintsignals-requiredmark--helphint). No escribir el ícono/estilo a mano.
- **Paleta de colores de alertas** (success/error/warning/info) → `alertStyles.ts`, ya consumido por `AlertBanner`/`Toast`. No crear un tercer mapa de colores igual.
- **Clases de estado activo del sidebar** → `sidebarNavClasses.ts`, ya consumido por `SidebarNav`/`ConfigDropdown`.
- **Mapa de color propio por componente** (`COLOR_MAP`, `ICON_COLORS`, `primaryGradients`/`dangerGradients`, etc.) → [`SEMANTIC_COLOR_MAP`](#colortokensts) (`colorTokens.ts`). Ya migrados: `Card`, `KpiCard`, `SectionHeader`, `Modal`, `Button`, `alertStyles.ts`/`Toast`/`AlertBanner`, `StatusBadge` (radio). Un componente nuevo con color propio no debe crear un sexto mapa — consumir este.
- **`bg-white`/`text-slate-*`/`border-slate-*` escritos a mano** en un componente compartido → tokens de [neutrales](#design-tokens) (`bg-surface`, `text-text-*`, `border-border-*`). Ya migrados: `Card`, `KpiCard`, `SectionHeader`, `Modal`, `Button` (secondary). No escribir `bg-white`/`text-slate-900` etc. en un componente nuevo de `src/components/UI/` — usar el token de rol equivalente.
- **`<select>` crudo con clases propias** (radio/padding/focus-ring distintos en cada sitio) → [`Select`](#select). Ya migrados: `AIConfigFormModal` (proveedor/modelo), `UsageDashboard` (período), `UserFormModal` (rol/estado), `ProposalDetailsSection` (unidad de duración), `EvaluacionInteligenteModal/IdleView` (proveedor IA), `FilterBar.SelectFilter`. No escribir un `<select>` a mano en ninguna vista nueva.
- **Mapa local de badge por enum de vista** (`{label, class}` con clases Tailwind crudas) → mapear a `{label, role: SemanticColor}` y resolver el color en el render vía `SEMANTIC_COLOR_MAP[role]`, no guardar la clase final en el mapa. Patrón usado en `ProveedoresConfigPanel/types.ts` (`SOURCE_BADGE`, `STATUS_BADGE`). No crear un componente compartido para esto salvo que el mismo enum se repita en 2+ vistas — hasta entonces es vocabulario local de la vista, no un componente genérico.
- **Input numérico con sanitización manual** (bloqueo de notación científica/negativos escrito a mano) → [`NumericInput`](#numericinput). Ya migrados: `MaterialFormModal` (precio), `ContractorFormModal` (rating).
- **Barra de búsqueda + filtro + chip contador animado** encima de un `Table`, escrita a mano en el `index.tsx` de cada vista → [`TableToolbar`](#tabletoolbar). Encontrado idéntico carácter por carácter en `UsuariosPanel`, `ProveedoresConfigPanel`, `MaterialConfigPanel`. No repetir el bloque `SearchInput` + chip `motion.span` en una vista de catálogo nueva — usar `TableToolbar` salvo que la barra necesite elementos genuinamente distintos (fechas, exportación, 2+ selects), caso en el que la duplicación puntual es aceptable (ver variantes de Presidencia).
- **Formulario de creación y panel de edición inline como componentes separados** para la misma entidad → un solo modal con `mode: "create"|"edit"` (patrón `ContractorFormModal`/`UserFormModal`). `UsuariosPanel` tenía originalmente un formulario de alta standalone (`UserRegistrationForm`) y una edición expandida inline por fila (`UserRow`) — ambos eliminados y unificados en `UserFormModal`. No crear dos componentes de formulario para alta/edición de la misma entidad si los campos se solapan.

## Candidatos a revisar (no consolidados aún, fuera de alcance de 1.5)

Detectados durante la auditoría de la sección 1.5 del Plan Maestro, pendientes de evaluación en una pasada futura — no bloquean trabajo actual:

- Badges ad-hoc fuera de `StatusBadge`/`RoleBadge` en `MaterialAdderSection.tsx`, `PipelineOverview.tsx`, `RequestsTableSection.tsx`.
- El botón de eliminar en `ComparativeTableSection.tsx` no sigue el patrón de `IconActionButton` (sin borde/hover de color) — revisar si vale la pena unificarlo o si es intencionalmente distinto.
