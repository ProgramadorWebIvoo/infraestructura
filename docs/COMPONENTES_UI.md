# Catálogo de componentes reutilizables (`src/components/UI/`)

> Referencia rápida antes de escribir UI nueva: revisar si ya existe un componente que resuelva el caso, en vez de reimplementar markup/lógica ya cubierta en otra vista. Actualizar este archivo cada vez que se agregue, renombre o elimine un componente de `src/components/UI/`.

## Índice por escenario de uso

- **Botones/acciones**: [Button](#button), [IconActionButton](#iconactionbutton)
- **Feedback/alertas**: [AlertBanner](#alertbanner), [InfoBanner](#infobanner), [Toast](#toast--toastprovider--usetoast), [OfflineBanner](#offlinebanner), [FieldError](#fielderror)
- **Diálogos/modales**: [Modal](#modal), [ConfirmDialog](#confirmdialog), [SelectModal](#selectmodal)
- **Tablas/listados**: [Table](#table), [EmptyState](#emptystate), [AuditLogPanel](#auditlogpanel)
- **Formularios**: [NumericInput](#numericinput), [FileDropZone](#filedropzone), [TagMultiSelect](#tagmultiselect), [RoleMultiSelect](#rolemultiselect), [HintSignals](#hintsignals-requiredmark--helphint)
- **Badges/estado**: [StatusBadge](#statusbadge), [RoleBadge](#rolebadge)
- **Layout/estructura**: [Card](#card), [SectionHeader](#sectionheader), [KpiCard](#kpicard), [FilterBar](#filterbar-searchinput--selectfilter)
- **Navegación/shell**: [SidebarNav](#sidebarnav), [ConfigDropdown](#configdropdown), [MobileTopBar](#mobiletopbar), [SidebarTip](#sidebartip)
- **Notificaciones internas**: [NotificationBell](#notificationbell), [NotificationList](#notificationlist), [NotificationsProvider](#notificationsprovider--usenotifications)
- **Tooltips**: [Tooltip](#tooltip), [SidebarTip](#sidebartip) (solo sidebar colapsado)
- **Exportación**: [ExportButton](#exportbutton)
- **Helpers no-componente**: [alertStyles.ts](#alertstylests), [sidebarNavClasses.ts](#sidebarnavclassests)

---

## Button

**Path**: `src/components/UI/Button.tsx`

Botón estándar con sistema de variante/tamaño/color y estado de carga integrado.

- **Props**: `variant?: "primary"|"secondary"|"danger"`, `size?: "sm"|"md"`, `colorScheme?: "sky"|"emerald"|"purple"|"rose"|"indigo"|"amber"|"violet"|"slate"`, `isLoading?: boolean`, `icon?: ReactNode`, + atributos nativos de `<button>`
- **Cuándo usarlo**: cualquier botón de acción primaria/secundaria/peligrosa en la app.
- **Convenciones**: `primary` usa gradiente por `colorScheme`; `danger` siempre renderiza gradiente rose sin importar `colorScheme`; muestra `Spinner` interno si `isLoading`.

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
- **Convenciones**: retorna `null` si no hay `message`.

---

## Modal

**Path**: `src/components/UI/Modal.tsx`

Shell de modal genérico basado en portal, con slots de header/body/footer, focus trap y cierre por ESC.

- **Props**: `isOpen`, `onClose`, `children`, `footer?`, `maxWidth?` (`max-w-sm`…`max-w-4xl`), `closeDisabled?`, `hideCloseButton?`, `icon?`, `badge?`, `title?`, `infoLine?`, `iconColor?: "sky"|"amber"|"emerald"|"purple"|"rose"|"slate"`
- **Cuándo usarlo**: base de todo modal nuevo — no crear un modal desde cero con `createPortal` propio.
- **Convenciones**: portal a `document.body`; focus trap con ciclo de Tab y restauración de foco al cerrar; header slate-900; `role="dialog" aria-modal="true"`.

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

Tabla de datos genérica con ordenamiento, paginación, skeleton de carga, empty state, header sticky, click/dblclick/selección de filas, y virtualización opcional. **Exportación nombrada** (`Table`, `Column<T>`), no default.

- **Props**: `columns: Column<T>[]` (`key,label,align?,width?,className?,sortable?,render?`), `data: T[]`, `rowKey`, `isLoading?`, `loadingRows?`, `emptyMessage?`, `emptyState?`, `footer?`, `pageSize?` (activa paginación), `maxHeight?`, `containerClassName?`, `className?`, `stickyHeader?`, `rowHoverClass?`, `alternating?`, `onRowClick?`, `onRowDoubleClick?`, `selectedRowKey?`, `selectedRowClass?`, `virtualizeThreshold?` (default `Infinity`, desactivada)
- **Cuándo usarlo**: cualquier vista tabular — es el primitivo base (usado también dentro de `SelectModal`).
- **Convenciones**: virtualización vía `@tanstack/react-virtual`, solo activa si `data.length > virtualizeThreshold` y hay `maxHeight`; sort/paginación client-side.

## EmptyState

**Path**: `src/components/UI/EmptyState.tsx`

Placeholder con borde punteado para listas/tablas vacías.

- **Props**: `message: string`, `icon?: ReactNode`, `className?`
- **Cuándo usarlo**: cualquier lista/tabla/panel con cero resultados.
- **Convenciones**: ícono por defecto `Inbox`; texto itálico atenuado.

## AuditLogPanel

**Path**: `src/components/UI/AuditLogPanel.tsx`

Panel de historial/auditoría colapsable genérico, con búsqueda y paginación opcional del servidor.

- **Props**: `entries: T[]`, `searchableText: (e:T)=>string`, `renderEntry: (e:T)=>ReactNode`, `keyOf`, `isLoading?`, `defaultOpen?`, `sticky?: boolean`, `stickyOffset?: string`, `fillViewport?: boolean`, `pagination?: {page,lastPage,total,onPageChange}`
- **Cuándo usarlo**: sidebar de "quién cambió qué y cuándo" en vistas de configuración (proveedores, materiales, IA, CONFIG APP).
- **Convenciones**: genérico sobre `T`; `sticky` + `fillViewport` reproducen un panel fijo/scroll-contenido; usa `Spinner`/`EmptyState`.

---

## NumericInput

**Path**: `src/components/UI/NumericInput.tsx`

`<input type="number">` saneado que bloquea notación científica y (por defecto) negativos.

- **Props**: `value: number | ""`, `onChange`, `step?`, `min?` (default `0`), `max?` (clampa), `allowNegative?`, `integer?`, `id?`, `placeholder?`, `className?`
- **Cuándo usarlo**: cualquier campo numérico de cantidad/moneda/semanas.
- **Convenciones**: el estado externo debe ser `number | ""`; sanea en change/keydown/paste; fuente mono-bold integrada.

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

---

## StatusBadge

**Path**: `src/components/UI/StatusBadge.tsx`

Badge de color para códigos de estado de proyecto o de rol.

- **Props**: `code: string`, `label?: string` (sobrescribe el lookup por defecto), `isRole?: boolean`, `className?`
- **Cuándo usarlo**: columna de estado en tablas, visualización de rol.
- **Convenciones**: colores/labels resueltos vía `getRoleColor`/`getStatusColor`/`STATUS_LABELS` de `../../utils` — fuente única de verdad, no crear mapas locales.

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
- **Convenciones**: `hoverable` agrega transición de sombra; sin slots de header/footer (se componen manualmente).

## SectionHeader

**Path**: `src/components/UI/SectionHeader.tsx`

Encabezado de sección: ícono + título + descripción, con acciones opcionales alineadas a la derecha.

- **Props**: `icon: ReactNode`, `title: string`, `description: string`, `color?` (`sky|blue|purple|emerald|amber|rose|indigo|slate`), `actions?: ReactNode`
- **Cuándo usarlo**: encabezado de cualquier panel/tab/sección (frecuentemente con un `ExportButton` en `actions`).
- **Convenciones**: borde inferior + margen integrados; mapa de color para el chip del ícono.

## KpiCard

**Path**: `src/components/UI/KpiCard.tsx`

Tarjeta de estadística de dashboard: ícono, label, value/sub o children personalizados.

- **Props**: `icon: ReactNode`, `label: string`, `value?`, `sub?`, `children?`, `variant?: "light"|"dark"`, `accent?: string`, `borderAccent?: string`, `color?` (deprecado, usar `borderAccent`), `onInspect?: () => void`
- **Cuándo usarlo**: grillas de KPIs/métricas en dashboards (Presidencia, Finanzas, etc.).
- **Convenciones**: `onInspect` muestra un botón de lupa en hover; variante `dark` es una tarjeta slate-900; color del borde izquierdo personalizable vía clase Tailwind.

## FilterBar (SearchInput + SelectFilter)

**Path**: `src/components/UI/FilterBar.tsx`

No tiene default export — expone dos controles pequeños: `SearchInput` y `SelectFilter`.

- **Props**: `SearchInput`: `id,value,onChange,placeholder,ariaLabel,className?`. `SelectFilter`: `id,value,onChange,ariaLabel,options: SelectOption[],title?,className?`
- **Cuándo usarlo**: barra de búsqueda + filtros dropdown arriba de tablas (extraído de patrones duplicados de Presidencia).
- **Convenciones**: named exports (sin default); constante `INPUT_CLASS` compartida para estilo consistente del select.

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

- **Exports**: `AlertType` (`"success"|"error"|"warning"|"info"`), `ALERT_ICONS: Record<AlertType, LucideIcon>`, `ALERT_STYLES: Record<AlertType, {bg,text,border}>`
- **Usado por**: `AlertBanner.tsx` y `Toast.tsx` — paleta/mapa de íconos compartido para no duplicar los mismos estilos carácter por carácter en ambos.

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

## Candidatos a revisar (no consolidados aún, fuera de alcance de 1.5)

Detectados durante la auditoría de la sección 1.5 del Plan Maestro, pendientes de evaluación en una pasada futura — no bloquean trabajo actual:

- Badges ad-hoc fuera de `StatusBadge`/`RoleBadge` en `MaterialAdderSection.tsx`, `PipelineOverview.tsx`, `RequestsTableSection.tsx`.
- El botón de eliminar en `ComparativeTableSection.tsx` no sigue el patrón de `IconActionButton` (sin borde/hover de color) — revisar si vale la pena unificarlo o si es intencionalmente distinto.
