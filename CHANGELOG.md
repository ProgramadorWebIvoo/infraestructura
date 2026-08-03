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
