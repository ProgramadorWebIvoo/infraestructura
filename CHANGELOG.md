# CHANGELOG

## Sinopsis del Proyecto

**Stack:** React 19 + TypeScript 5.8 + Vite 6 + TailwindCSS 4 (Frontend SPA) — Laravel + Sanctum (Backend API) — MySQL/MariaDB.

**Propósito:** Sistema multi-rol para gestionar el ciclo de vida completo de obras de infraestructura y mantenimiento. Cada obra pasa secuencialmente por 8 departamentos (Infraestructura → Cierre de Obra → Procura → Analistas → Finanzas → etc.) con trazabilidad en tiempo real mediante bitácora de auditoría.

**Estructura clave:**
- `src/App.tsx` — Ruteo, estado global, handlers de API, modal de inspección
- `src/components/ProcuraPanel.tsx` — Panel de Procura con tabla de evaluación comparativa
- `src/components/AnalistasPanel.tsx` — Panel de Analistas (carga de propuestas)
- `src/types.ts` — Interfaces `Project`, `Proposal`, `Contractor`, `ProjectStatus`
- `src/services/` — (nuevo) Servicios de integración con APIs externas
- `database.sql` — Schema completo MySQL con migrations y seed data

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
