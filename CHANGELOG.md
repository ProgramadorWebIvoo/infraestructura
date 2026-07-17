# CHANGELOG

## [2026-07-17] — Feature: Importación automática de propuestas de proveedores al cuadro comparativo (Analistas)

**Tipo:** feature

**Qué:** Nuevo botón "Traer del portal" en el panel de Analistas que importa automáticamente las propuestas de materiales recibidas desde el portal público de proveedores (`SupplierMaterialProposal`) como propuestas del cuadro comparativo (`ProjectProposal`).

**Flujo completo:**
1. El analista selecciona un expediente en estado `CONFIRMADO_PROCURA`
2. Hace clic en "Traer del portal" (integrado en el header de "Propuestas Ingresadas")
3. El frontend llama al nuevo endpoint `POST /api/projects/{project}/import-supplier-proposals`
4. El backend busca todas las `SupplierMaterialProposal` del proyecto, matchea cada una con un `Contractor` registrado (por email o nombre), calcula `materialCost` (suma de items), convierte duración a semanas, y crea los `ProjectProposal` correspondientes
5. Si el contratista ya tiene una propuesta en el proyecto, se omite (deduplicación)
6. El proyecto se actualiza en tiempo real en el frontend

**UX:**
- Botón integrado en el header de la sección de propuestas (antes estaba como bloque independiente entre la card de inversión y las propuestas)
- Loading state con spinner y texto "Importando..."
- Feedback success en banner verde con fade-out suave: 5s visible → 700ms transición `max-height` + `opacity` + `margin` → colapso sin saltos de layout
- Feedback error en banner rojo (permanente hasta nuevo intento)
- Mensaje de empty state actualizado para mencionar la opción de importación

**Backend — nuevo endpoint:**
- `POST /api/projects/{project}/import-supplier-proposals` en `ProjectController::importSupplierProposals`
- Sin body, sin validación extra (opera sobre datos ya existentes en BD)
- Retorna `{ message, imported, skipped, errors, project }`

**Archivos frontend:**
- `src/components/AnalistasPanel.tsx` — nuevo prop `onImportSupplierProposals`, estados `isImporting`/`importFeedback`, handler `handleImport`, botón integrado en header, feedback con transición smooth
- `src/App.tsx` — nuevo handler `handleImportSupplierProposals` (línea 359), pasado a AnalistasPanel en ruta `/analistas`

**Archivos backend:**
- `app/Http/Controllers/Api/ProjectController.php` — nuevo método `importSupplierProposals` (línea 179), import `SupplierMaterialProposal`
- `routes/api.php` — nueva ruta `POST /projects/{project}/import-supplier-proposals` (línea 47)

---

## [2026-07-17] — Feature: Skeleton loading en todas las vistas del sistema

**Tipo:** feature

**Qué:** Implementación de skeleton loaders animados en todas las vistas principales del frontend. Cuando `isLoadingApi` es `true` (carga inicial de datos desde Laravel), cada panel muestra un esqueleto visual que coincide con su layout bento — tarjetas KPI, tablas, listas y cards — en vez de renderizar arrays vacíos que mostraban mensajes de "No hay nada pendiente" erróneamente.

**Causa raíz (hallazgos G3/L2):**
- `isLoadingApi` se declaraba en App.tsx (línea 192) pero **nunca se consumía** en ningún componente.
- Los estados `projects`, `contractors`, `auditLogs`, `materialsCatalog` inician como `[]`.
- Durante los ~2-5 segundos que tarda `loadApiData()`, los paneles renderizan con arrays vacíos → mostraban el mensaje de "empty state" ("No hay obras", "No hay proveedores", etc.).
- Al completar la carga, los datos aparecían de golpe → parpadeo visual y confusión del usuario.

**Solución:**

1. **`src/components/SkeletonLoader.tsx`** (NUEVO) — Componente con primitivas reutilizables:
   - `SkeletonBlock` — bloque genérico animate-pulse con `bg-slate-200 rounded-xl`
   - `SkeletonCard` — card bento completa con header (icono + título) + 3 bloques de contenido
   - `SkeletonStats` / `SkeletonStatsDark` — KPI cards para el dashboard de Presidencia
   - `SkeletonTable` — tabla completa con header + N filas skeleton
   - `SkeletonList` — lista de items skeleton
   - `SkeletonBadge`, `SkeletonButton` — elementos pequeños

2. **Cada panel** recibe `isLoading?: boolean` y muestra su skeleton correspondiente cuando está en `true`:
   - `PresidenciaDashboard` → 4 KPI cards + chart card + audit table + projects table
   - `CierreObraPanel` → cards en grid 7/5 + listas
   - `ProcuraPanel` → card de formulario + tabla comparativa
   - `AnalistasPanel` → cards en grid 7/5 + comparative panel
   - `FinanzasPanel` → 2 cards en grid + ledger table
   - `InfraestructuraMantenimientoPanel` → skeleton en "Peticiones del Departamento" (sidebar)
   - `ProveedoresRegistrados` → skeleton rows en tabla de contratistas

3. **`App.tsx`** — Se pasa `isLoading={isLoadingApi}` a cada panel en las rutas.

**Estética:** Los skeletons usan `animate-pulse` de Tailwind con `bg-slate-200`, bordes `rounded-xl`/`rounded-2xl` que matchean el diseño bento existente. Sin animaciones bruscas ni colores distractores.

**Archivos:**
- `src/components/SkeletonLoader.tsx` — [NUEVO]
- `src/components/PresidenciaDashboard.tsx` — isLoading prop + PresidenciaSkeleton
- `src/components/CierreObraPanel.tsx` — isLoading prop + CierreObraSkeleton
- `src/components/ProcuraPanel.tsx` — isLoading prop + ProcuraSkeleton
- `src/components/AnalistasPanel.tsx` — isLoading prop + AnalistasSkeleton
- `src/components/FinanzasPanel.tsx` — isLoading prop + FinanzasSkeleton
- `src/components/InfraestructuraMantenimientoPanel.tsx` — isLoading prop + skeleton en sidebar
- `src/components/ProveedoresRegistrados.tsx` — isLoading prop + skeleton rows en tabla
- `src/App.tsx` — isLoading={isLoadingApi} en todas las rutas

---

## [2026-07-17] — Fix: input type="number" se incrusta en 0 al borrar y tipear nuevo valor

**Tipo:** fix

**Qué:** En todos los `<input type="number">` controlados con estado `number`, cuando el usuario borraba todo el contenido el valor se forzaba a `0` vía `parseFloat(e.target.value) || 0`. Al tipear un nuevo dígito, el `0` se quedaba "incrustado" en el input porque React y el browser nativo se desincronizaban (bug conocido de controlled number inputs con valor `0`).

**Causa raíz:** El patrón `parseFloat(e.target.value) || FALLBACK` en el onChange devolvía `0` cuando el string estaba vacío (`parseFloat("")` = `NaN`), causando que el estado siempre fuera `number` y nunca `""`. React re-renderizaba el input con `value={0}`, y el navegador nativo no podía reemplazar limpiamente ese `0` cuando el usuario tipeaba un nuevo número.

**Solución (Opción 2):** Cambiar el tipo de estado a `number | ""` y preservar el string vacío en el onChange cuando el usuario borra el campo:
- Estado: `useState<number | "">(INITIAL)`
- onChange: `e.target.value === "" ? "" : parseFloat(e.target.value) || FALLBACK`
- Normalización a número en los handlers de submit/uso (via `Number(valor || DEFAULT)`)
- Se mantiene el mismo patrón ya probado en `estimatedDays` de `PropuestaMaterialesPublica.tsx`

**Archivos modificados:**
- `src/components/AnalistasPanel.tsx` — `deliveryWeeks`, `materialCost`, `laborCost`: estados `number | ""`, handlers actualizados, normalización en `handleAddProposal`
- `src/components/ProcuraPanel.tsx` — `approvedAmount`: estado `number | ""`, handler actualizado, normalización en `handleApproveInvestment`
- `src/components/InfraestructuraMantenimientoPanel.tsx` — `materialQty`, `customMaterialPrice`: estados `number | ""`, handlers actualizados, normalización en `handleAddMaterial`
- `src/components/ProveedoresRegistrados.tsx` — `editRating`: estado `number | ""`, handler actualizado con early return para `""`, normalización en `handleSave`
- `src/components/PropuestaMaterialesPublica.tsx` — `ItemRow` sobrescribe `unitPrice` y `quantity` como `number | ""`, `updateItem` normaliza en totalPrice, 3 onChange handlers actualizados, submit handler normaliza antes de enviar a API

### Adicional: Sanitización de notación científica ('e'/'E')

**Qué:** Los `<input type="number">` del navegador aceptan el caracter 'e' como parte de notación científica (ej. `5e2` = 500). En un flujo contable esto genera riesgo de error humano: un usuario que teclea `5e2` pensando que escribe `52` obtiene `500` sin advertencia.

**Fix:** Se agregó `.replace(/[eE]/g, '')` a `e.target.value` en todos los onChange handlers de inputs numéricos. Esto elimina cualquier caracter 'e'/'E' antes del parseFloat/parseInt, previniendo la interpretación de notación científica.

**Archivos:** Mismos 5 archivos + `PropuestaMaterialesPublica.tsx` (estimatedDays)

## Sinopsis del Proyecto

**Stack:** React 19 + TypeScript 5.8 + Vite 6 + TailwindCSS 4 (Frontend SPA) — Laravel + Sanctum (Backend API) — MySQL/MariaDB.

**Propósito:** Sistema multi-rol para gestionar el ciclo de vida completo de obras de infraestructura y mantenimiento. Cada obra pasa secuencialmente por 8 departamentos (Infraestructura → Cierre de Obra → Procura → Analistas → Finanzas → etc.) con trazabilidad en tiempo real mediante bitácora de auditoría.

**Estructura clave:**
- `src/App.tsx` — Ruteo, estado global, handlers de API, modal de inspección
- `src/components/ProcuraPanel.tsx` — Panel de Procura con tabla de evaluación comparativa + botón Evaluación Inteligente IA
- `src/components/CierreObraPanel.tsx` — ✅ Overflow horizontal resuelto (grid + truncate, ver 2026-07-17)
- `src/components/AnalistasPanel.tsx` — Panel de Analistas (carga de propuestas y cuadro comparativo)
- `src/components/EvaluacionInteligenteModal.tsx` — Modal IA con 4 estados (idle/loading/result/error) y selector de proveedor
- `src/components/MaterialesProveedores.tsx` — Portal público de registro de proveedores
- `src/components/PropuestaMaterialesPublica.tsx` — Portal público de cotización de materiales (vía token)
- `src/components/ProveedoresRegistrados.tsx` — Catálogo de proveedores + invitaciones + propuestas recibidas
- `src/components/UsuariosPanel.tsx` — CRUD de usuarios del sistema
- `src/types.ts` — Interfaces `Project`, `Proposal`, `Contractor`, `ProjectStatus` y más
- `src/services/aiEvaluationService.ts` — Servicio de llamada a backend Laravel para evaluación IA con failover
- `src/components/SkeletonLoader.tsx` — Componente de skeleton loading reutilizable (primitivas: SkeletonBlock, SkeletonCard, SkeletonTable, SkeletonStats, SkeletonList)
- `src/components/InteractiveOrganigrama.tsx` — ⚠️ **Código muerto** (no se importa en ningún lado)
- `mobile/App.tsx` — App mobile React Native con los mismos paneles (lectura y acciones básicas)
- `database.sql` — Schema completo MySQL con migrations y seed data

---

## [2026-07-17] — Auditoría completa del frontend (24 hallazgos documentados)

**Tipo:** audit

**Qué:** Auditoría integral del frontend (web + mobile) cubriendo configuración, dependencias, seguridad, calidad de código, estilos visuales, rendimiento y accesibilidad. Se documentaron 24 hallazgos clasificados por severidad.

**Hallazgos por categoría:**

### 🔴 Críticos (3)

| ID | Hallazgo | Archivos | Impacto |
|----|----------|----------|---------|
| C1 | Clases Tailwind v4 inválidas (`h-4.5`, `w-4.5`, `pl-9.5`, `p-4.5`) no generan CSS — iconos del sidebar sin dimensión, padding de inputs de búsqueda roto | `src/App.tsx`, `src/components/ProveedoresRegistrados.tsx`, `src/components/PresidenciaDashboard.tsx`, `src/components/InfraestructuraMantenimientoPanel.tsx` | Iconos del sidebar toman tamaño SVG nativo (24×24) en vez de 18×18; el icono Search en inputs de búsqueda se superpone con el texto |
| C2 | `.env` con `GEMINI_API_KEY` trackeado por git (pese a `.gitignore`) | `.env` | Exposición de secretos si se hace push; el archivo no debe estar en el repo |
| C3 | 8 dependencias no utilizadas + `vite` duplicado en dependencies y devDependencies | `package.json` | Bundle inflado, mantenibilidad degradada |
| C4 | Carga de archivos NO DESEADOS | `package.json` | Los inputs de carga de archivos permiten cargar archivos fuera de lo que son .PDF, .DWG, .DXF, .PNG, .JPG, .SVG |

### 🟠 Graves (5)

| ID | Hallazgo | Archivos | Impacto |
|----|----------|----------|---------|
| G1 | `InteractiveOrganigrama.tsx` — 307 líneas de código nunca importado | `src/components/InteractiveOrganigrama.tsx` | Código muerto mantenido sin propósito |
| G2 | `syncProject()` llama `refreshAuditLogs()` + `loadApiData()` — hace 6 fetchs por mutación | `src/App.tsx:258-263` | 6 peticiones HTTP donde 1-2 bastan; race condition potencial |
| G3 | `isLoadingApi` nunca se consume — el layout se renderiza con arrays vacíos hasta que carga la API | `src/App.tsx:187-193,232-238` | El usuario ve dashboard con $0, 0 obras, 0 proveedores durante ~segundos, luego parpadea |
| G4 | `activeRole` derivado de la URL, no del rol del usuario autenticado | `src/App.tsx:167` | Badge "Terminal: X" puede mostrar rol incorrecto |
| G5 | Doble punto y coma `;;` en dos archivos | `src/components/MaterialesProveedores.tsx:10`, `src/components/UsuariosPanel.tsx:19` | Código sucio |

### 🟡 Moderados (8)

| ID | Hallazgo | Archivos |
|----|----------|----------|
| M1 | Componente muerto InteractiveOrganigrama (duplica G1) | `src/components/InteractiveOrganigrama.tsx` |
| M2 | `strict: false` implícito en tsconfig.json → `useState([])` infiere `never[]` | `tsconfig.json`, `src/App.tsx:190` |
| M3 | Alias `@` apunta a la raíz del proyecto, no a `./src` | `vite.config.ts:11` |
| M4 | `setMaterialsCatalog(never[])` + `handleAddCatalogItem` agrega elemento no-tipado | `src/App.tsx:190,463-465` |
| M5 | `handleResetApp` y `handleLogout` mezclan datos de respaldo locales vs API | `src/App.tsx:483-521` |
| M6 | Solo `handleSelectContractor` propaga errores al caller; los demás usan `alert()` | `src/App.tsx` (múltiples handlers) |
| M7 | `refreshAuditLogs()` redundante porque `loadApiData()` lo incluye | `src/App.tsx:240-261` |
| M8 | Código comentado legacy (initial state con datos mock) | `src/App.tsx:182-186` |

### 🔵 Leves (5)

| ID | Hallazgo | Archivos |
|----|----------|----------|
| L1 | `html lang="en"` cuando la UI está en español | `index.html:2` |
| L2 | Sin loading skeleton en carga inicial (ídem G3) | `src/App.tsx` |
| L3 | `text-slate-400` sobre `bg-white` tiene contraste ~3.2:1 (WCAG AA requiere 4.5:1) | Múltiples componentes |
| L4 | Icon-only buttons sin `aria-label` | `src/App.tsx` (botones X, menú hamburguesa) |
| L5 | Sin rate limiting visual ni CAPTCHA en login | `src/App.tsx` |

### 📱 Mobile (3)

| ID | Hallazgo | Archivos |
|----|----------|----------|
| X1 | Props `visible` y `transparent` en Modal sin valor explícito (`={true}`) | `mobile/App.tsx:746` |
| X2 | URL del API hardcodeada en vez de configurable | `mobile/App.tsx:22` |
| X3 | Credenciales por defecto hardcodeadas (admin@ivoo.local / Admin12345) | `mobile/App.tsx:436-437` |

**Archivos:**
- (hallazgos cubren todo el frontend — no hay cambios aplicados, solo diagnóstico documentado)

---

## [2026-07-17] — Seed masivo de datos en infraestructura_ivoo (50+ registros por tabla)

**Tipo:** feature

**Qué:** Población completa de la base de datos `infraestructura_ivoo` con 50+ registros en cada tabla para propósitos de depuración y pruebas visuales/funcionales.

**Detalle por tabla (registros finales):**
- `app_modules`: 12 (4 nuevos)
- `contractors`: 55 (50 nuevos)
- `material_catalog`: 55 (45 nuevos)
- `projects`: 53 (ninguno nuevo, solo actualización de estados)
- `project_materials`: 55 (45 nuevos)
- `project_proposals`: 53 (50 nuevos)
- `project_payments`: 50 (48 nuevos)
- `audit_logs`: 58 (50 nuevos)
- `users`: 58 (51 nuevos)
- `project_documents`: 50 (50 nuevos)

**Workflow:** Los 53 proyectos ahora están distribuidos en los 9 estados del workflow (CREADO→COMPLETADO_PAGADO), simulando un pipeline realista. 40 proyectos tienen propuestas vinculadas, 50 pagos con referencias a propuestas.

**Archivos:** (temporales eliminados)
- seed_full.sql → seed_v2.sql (eliminados post-ejecución)

---

## [2026-07-17] — Fix overflow horizontal en CierreObraPanel (causa raíz identificada y resuelta)

**Tipo:** fix

**Qué:** El contenedor de "Revisión de Cálculos y Planos" en `CierreObraPanel` se expandía horizontalmente sin control al mostrar proyectos con títulos largos. Fix integral en TODA la cadena de contenedores.

**Causa raíz:** El componente original NO tenía NINGUNA protección contra overflow horizontal:
- Sin `max-w-full` en el root grid → el grid podía expandirse según contenido
- Sin `min-w-0` en grid/flex items → no podían encogerse por debajo del `min-content` del texto
- Sin `overflow-hidden` en cards/secciones → overflow no se recortaba
- `line-clamp-1` en títulos → `-webkit-box` intrínseco = texto completo (~1950px)
- Sin `truncate` en location → locations largos empujaban containers

**Cambios integrales:**
- **Root grid**: `max-w-full overflow-hidden` — límite superior contraído
- **Section 1 & 2**: `min-w-0 overflow-hidden` — permiten encoger, recortan overflow
- **Cards**: `overflow-hidden` — recortan cualquier desbordamiento interno
- **`space-y-5` / `space-y-2.5` divs**: `min-w-0` — eslabones intermedios quebradizos
- **Botones**: `min-w-0 overflow-hidden` — encogen y recortan
- **Títulos**: `line-clamp-1` → `truncate` — sin `-webkit-box` intrinsic bug
- **Location**: `truncate` → texto largo con elipsis
- **Form y detalles**: `min-w-0 overflow-hidden break-words` — protección del formulario activo
- **Badges/Status**: `shrink-0` — no se comprimen en flex
- **Section 2 items**: `truncate` en títulos, `truncate` en location con `<span>` wrapper

**Archivos:**
- `src/components/CierreObraPanel.tsx`

---

## [2026-07-16]

### Cambio: Plan de Integración de Evaluación Inteligente con IA (Procura)

Se definió e inició la implementación del sistema de Evaluación Inteligente de Ofertas para el módulo de Procura. El sistema evaluará las propuestas de contratistas usando 3 proveedores de IA (ChatGPT, Gemini, Claude) con failover automático entre ellos.

**Arquitectura decidida:**
- Backend AI Proxy en **Laravel** (endpoints nuevos en el API existente)
- Frontend React llama al endpoint Laravel `POST /api/ai/evaluate-proposals`
- Failover en orden: ChatGPT → Gemini → Claude
- Rol del prompt: "Ingeniero en Infraestructura con experiencia en finanzas y contratación"
- Se incluye el campo `observations` en `Proposal` para datos contextuales (tasa dólar, garantía, disponibilidad de material, etc.)

**Archivos afectados (frontend - este repo):**
- `src/types.ts` — agregar `observations` a `Proposal`
- `src/components/ProcuraPanel.tsx` — columna Observaciones + botón Evaluación Inteligente
- `src/services/aiEvaluationService.ts` — [NUEVO] servicio de llamada al proxy AI
- `src/components/EvaluacionInteligenteModal.tsx` — [NUEVO] modal con estados carga → resultado → error
- `database.sql` — columna `observations` en `project_proposals`

**Archivos afectados (backend - repo Laravel):**
- `app/Http/Controllers/Api/AIEvaluationController.php` — [NUEVO]
- `app/Services/AIEvaluationService.php` — [NUEVO] orquestador con failover
- `app/Services/Providers/OpenAIProvider.php` — [NUEVO]
- `app/Services/Providers/GeminiProvider.php` — [NUEVO]
- `app/Services/Providers/AnthropicProvider.php` — [NUEVO]
- `config/ai.php` — [NUEVO] configuración de API keys
- Migration para columna `observations` en `project_proposals`

**Causa raíz:** No existía análisis cualitativo automatizado para la selección de contratistas. La decisión se tomaba solo con datos cuantitativos (precio, plazo, % anticipo) sin considerar factores contextuales ni análisis financiero profundo.

---

## [2026-07-16] — Implementación Frontend

### Cambio: Implementación completa del frontend para Evaluación Inteligente

- **`src/types.ts`** — Agregado campo `observations?: string` a interfaz `Proposal` (uso interno para contexto AI: tasa dólar, garantía, disponibilidad material).
- **`database.sql`** — Agregada columna `observations TEXT` en tabla `project_proposals`.
- **`src/services/aiEvaluationService.ts`** — [NUEVO] Servicio que llama al endpoint Laravel `POST /api/ai/evaluate-proposals`. Tipado completo de request/response.
- **`src/components/EvaluacionInteligenteModal.tsx`** — [NUEVO] Modal con 3 estados:
  - *idle*: Resumen del proyecto, tabla de propuestas, botón "Iniciar Evaluación con IA"
  - *loading*: Animación con indicador del proveedor activo (ChatGPT → Gemini → Claude), barra de progreso, bitácora de failover en vivo
  - *result*: Score de confianza, tarjeta del ganador destacada, matriz comparativa (fortalezas/debilidades/riesgos), análisis cualitativo, recomendación final, botón "Aceptar recomendación"
  - *error*: Mensaje + botón reintentar
- **`src/components/ProcuraPanel.tsx`** — Agregado botón "Evaluación Inteligente" (icono BrainCircuit) en el header de cada proyecto con estado `COMPARATIVA_ENVIADA`. Al hacer clic abre el modal conectado al servicio AI.

**Arquitectura del flujo:**
```
Botón → setAiEvalProject → Modal (idle)
  → "Iniciar" → evaluateProposals() → POST /api/ai/evaluate-proposals
    → Loading (anima proveedor activo + log failover)
    → Result | Error
      → "Aceptar recomendación" → onSelectContractor()
```

**Próximo paso:** Implementar el backend Laravel (AIEvaluationController, AIEvaluationService con 3 providers, failover y rate-limit handling).

**Archivos:**
- `src/types.ts`
- `src/services/aiEvaluationService.ts`
- `src/components/EvaluacionInteligenteModal.tsx`
- `src/components/ProcuraPanel.tsx`
- `database.sql`

---

## [2026-07-16] — Feature Completa: Evaluación Inteligente con Selección de Proveedor

### Frontend (React + TypeScript)

**Nuevas capacidades:**
- **Selector de proveedor IA** en el modal: Automático (failover), ChatGPT, Gemini, Claude
- **Feedback visual correcto** según modo seleccionado:
  - Modo específico: muestra el proveedor elegido (ej. "Consultando: Gemini (Google)")
  - Modo automático: muestra "Automático (Failover: ChatGPT → Gemini → Claude)"
- **Log inicial dinámico**: "Iniciando evaluación con [proveedor]..." o "Iniciando evaluación en modo automático..."
- **Iconos Lucide** por proveedor: Network (auto), Bot (ChatGPT), Sparkles (Gemini), Brain (Claude)

**Archivos actualizados:**
- `src/components/EvaluacionInteligenteModal.tsx` — Selector, loading dinámico, logs correctos
- `src/services/aiEvaluationService.ts` — Parámetro opcional `provider` en `evaluateProposals()`

### Backend (Laravel)

**Endpoint mejorasel API)**
- `POST /api/ai/evaluate-proposals` acepta parámetro opcional `provider` (`chatgpt` | `gemini` | `claude`)
- Si se envía `provider`: usa **solo** ese proveedor (sin failover)
- Si no se envía: failover automático ChatGPT → Gemini → Claude
- Validación con `Rule::in(['chatgpt','gemini','claude'])`

**Archivos actualizados:**
- `app/Http/Controllers/Api/AIEvaluationController.php` — Parámetro `provider` opcional
- `app/Services/AI/AIEvaluationService.php` — Método `evaluateWithProvider()` para modo forzado

---

### Estado Final: Feature Completa ✅

**Para producción solo falta configurar API keys en `.env` del backend:**
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## [2026-07-16] — Eliminada columna `observations` (redundante)

**Causa:** La columna `observations` era redundante ya que `description` en `Proposal` cubre el mismo propósito. Los datos contextuales para la evaluación IA (tasa dólar, garantías, disponibilidad de material) se ingresarán en `description`.

**Cambios:**
- `src/types.ts` — eliminado campo `observations?: string` de interfaz `Proposal`
- `src/services/aiEvaluationService.ts` — eliminado `observations` del payload y tipo inline
- `database.sql` — eliminada columna `observations` de tabla `project_proposals`

**Archivos:**
- `src/types.ts`
- `src/services/aiEvaluationService.ts`
- `database.sql`

---

## [2026-07-16] — Fix UX: Feedback visual al adjudicar contratista desde modal IA

**Tipo:** fix

**Qué:** El modal de Evaluación Inteligente se quedaba con el estado "Adjudicando..." indefinidamente después de aceptar la recomendación, sin mostrar éxito o error. El callback `onSelectContractor` se ejecutaba fire-and-forget y el estado `accepting` nunca se resetaba.

**Causa raíz:**
1. `handleAccept` en el modal no hacía `await` del callback `onSelectContractor` (tipado como `void`)
2. `handleSelectContractor` en App.tsx atrapaba errores con `alert()` sin re-lanzar, por lo que el modal nunca se enteraba del resultado
3. No existían estados de `acceptSuccess` ni `acceptError` para renderizar feedback

**Cambios:**
- `src/components/EvaluacionInteligenteModal.tsx`:
  - Tipado de `onSelectContractor` cambiado a `Promise<void>`
  - `handleAccept` hecho `async` con `await` al callback + try/catch
  - Nuevos estados: `acceptSuccess` (boolean) y `acceptError` (string | null)
  - `ResultView`: al success muestra badge animado "¡Adjudicado!" con CheckCircle; al error muestra banner rojo con AlertTriangle + mensaje
  - Footer: texto dinámico según estado, badge "Adjudicado" animado en éxito
  - Auto-cierre del modal 1.8s después del éxito vía `setTimeout(() => onClose(), 1800)`
  - Reset de los nuevos estados al reabrir el modal
- `src/App.tsx` (`handleSelectContractor`): eliminado `alert()` y agregado `throw error` para propagar al modal
- `src/components/ProcuraPanel.tsx`: tipado de `onSelectContractor` actualizado a `Promise<void>`

**Archivos:**
- `src/components/EvaluacionInteligenteModal.tsx`
- `src/App.tsx`
- `src/components/ProcuraPanel.tsx`

---

## [2026-07-16] — Feature: Rating del contratista como criterio en evaluación IA

**Tipo:** feature

**Qué:** El `confidenceScore` asignado por la IA ahora considera también el `rating` (1.0–5.0) del contratista, que refleja su desempeño histórico, calidad y cumplimiento.

**Cambios:**
- `src/types.ts` — agregado `contractorRating: number` a interfaz `Proposal`
- `src/components/AnalistasPanel.tsx` — al crear una propuesta se incluye `contractorRating: contractor.rating`
- `src/services/aiEvaluationService.ts` — `contractorRating` incluido en el payload enviado al backend AI

**Archivos:**
- `src/types.ts`
- `src/components/AnalistasPanel.tsx`
- `src/services/aiEvaluationService.ts`

---

## [2026-07-16] — Fix overflow horizontal en CierreObraPanel (Revisión de Cálculos y Planos)

**Tipo:** fix

**Qué:** El contenedor de "Revisión de Cálculos y Planos" en el panel de Cierre de Obra se expandía horizontalmente sin límite al mostrar proyectos con títulos/locations largos (195+ caracteres). Se aplicaron 3 capas de defensa + scrollbar custom con estilo bento.

**Causa raíz:** CSS Grid items tienen `min-width: auto` por defecto, impidiendo que los botones del selector se encojan por debajo del tamaño de su contenido. Los textos largos expandían los grid items, y estos estiraban el contenedor padre horizontalmente. No había `overflow-x` que cortara el desbordamiento.

**Cambios:**
- `src/index.css` — nueva clase `.scrollbar-thin` (webkit + Firefox) con diseño thin, color slate-300/400, bordes redondeados, que matchea la estética bento de la app
- `src/components/CierreObraPanel.tsx`:
  - Card contenedor: `overflow-x-auto scrollbar-thin` — scroll horizontal solo cuando el contenido excede, con scrollbar estilizado
  - Grid items (botones): `min-w-0` — permite que se encojan por debajo del contenido, activando el truncamiento
  - Location text: `truncate` — equivalente a `overflow-hidden text-ellipsis whitespace-nowrap`
  - (Título ya tenía `line-clamp-1`)

**Archivos:**
- `src/index.css`
- `src/components/CierreObraPanel.tsx`

---

## [2026-07-16] — [RESUELTO 2026-07-17] Overflow horizontal en CierreObraPanel (Revisión de Cálculos y Planos)

**Tipo:** fix (resuelto el 2026-07-17)

**Qué:** El contenedor de "Revisión de Cálculos y Planos" en el panel de Cierre de Obra se expande horizontalmente sin control al mostrar 53 proyectos con títulos largos (~195 chars). El error persiste a pesar de múltiples intentos de fix.

**Intentos realizados (todos fallaron):**

1. `overflow-x-auto` en el card + `min-w-0` en botones + `truncate` en location
2. `min-w-0` en Section 1 wrapper (`lg:col-span-7`)
3. `overflow-x-auto` en `<main>` y route wrapper (App.tsx) + eliminado `transition-all`
4. `overflow-hidden` en botones + cards + Section 1
5. `min-w-0` en Section 2 wrapper (`lg:col-span-5`) + grid root `max-w-full`
6. Cambio de `display: grid` a `flex flex-wrap` con `width: calc(50%-6px)` en botones
7. Estilos inline con `maxWidth: '100%', overflow: 'hidden'` en grid root

**Hipótesis actual:** El `display: -webkit-box` de `line-clamp-1` en el título tiene un `min-content` intrínseco igual al ancho del texto completo (195 chars) que el navegador usa para calcular el ancho mínimo del botón como grid/flex item, y ese ancho se propaga hacia arriba en la cadena de contenedores a pesar de `min-w-0` y `overflow-hidden`.

**Archivos modificados (cambios actuales en disco pendientes de solución):**
- `src/App.tsx` — `<main>`: `min-w-0 overflow-x-auto`; route wrapper: `min-w-0 overflow-x-auto` (sin `transition-all`) — se mantienen como safety net
- `src/components/CierreObraPanel.tsx` — fix aplicado (ver entrada 2026-07-17)
- `src/index.css` — limpio (sin cambios pendientes)
