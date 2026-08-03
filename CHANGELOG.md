# CHANGELOG

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
