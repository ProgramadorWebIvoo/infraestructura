/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Flujo de decisiones (Organigrama IVOO) — réplica fiel en SVG del
 * flujograma real de draw.io (docs-infraestructura, fuente entregada por el
 * usuario: INFRAESTRUCTURA → OBRA → AUDITORIA → ... → FINANZAS PAGA
 * FINIQUITO, con las bifurcaciones de rechazo/reevaluación/renegociación).
 * Coordenadas y conexiones tomadas 1:1 del XML de draw.io — no aproximadas.
 * Extraído de InspectProjectModal.tsx (división por SRP: cada sección del
 * modal es visual y lógicamente independiente de las otras dos).
 */

import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { Project } from "@/types";
import { ProjectStatus } from "@/types";

type NodeKind = "actor" | "artifact" | "decision";

interface FlowNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Color de acento (solo "actor"). */
  hue?: string;
  /** Posición en el camino feliz — determina done/pending. undefined = nodo de soporte/bifurcación, sin semáforo propio. */
  order?: number;
}

/** Fracción [x,y] (0-1) del punto de conexión sobre el borde del nodo — mismo significado que exitX/exitY y entryX/entryY del XML de draw.io. */
type Anchor = [number, number];

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** Waypoints explícitos (coordenadas del diagrama) para las conexiones largas del XML original. */
  points?: [number, number][];
  /** exitX/exitY del XML — lado exacto por donde sale la conexión del nodo origen. undefined = drawio la infiere sola (queda como centro, oculto bajo el propio nodo). */
  exit?: Anchor;
  /** entryX/entryY del XML — lado exacto por donde entra al nodo destino. undefined = sin dirección fija (fallback al ruteo por posición relativa). */
  entry?: Anchor;
}

/**
 * Nodos del flujo real — depurado contra el código actual (ProjectController,
 * AwardApprovalService, ProjectClosureService), no una copia literal del XML:
 * - Sin cajas "NOTIFICACIÓN": una notificación es un efecto secundario del
 *   rechazo, no un estado propio del flujo — el rechazo mismo ya lo dice.
 * - Sin PROPUESTA / PROPUESTA APROBADA / segundo PROVEEDOR "de cotización":
 *   el código no tiene ese paso — cargar/renegociar propuestas (manual o vía
 *   portal) es una acción de ANALISTAS, no un estado de máquina separado.
 * - Sin REVISIÓN DE PRESUPUESTO ni PROCURA SOLICITA PAGO ANTICIPO como
 *   rombos propios: AwardApprovalService tiene una sola decisión real acá
 *   (Presidencia aprueba/rechaza la adjudicación) — se fusiona en PRESIDENCIA.
 */
const NODES: FlowNode[] = [
  { id: "infraestructura", kind: "actor", label: "INFRAESTRUCTURA", x: 230, y: 60, w: 140, h: 60, hue: "cyan", order: 0 },
  { id: "obra", kind: "artifact", label: "OBRA", x: 260, y: 190, w: 80, h: 40, order: 1 },
  { id: "auditoria", kind: "actor", label: "AUDITORIA", x: 530, y: 180, w: 140, h: 60, hue: "blue", order: 2 },
  { id: "revision_expediente", kind: "decision", label: "REVISIÓN DE\nEXPEDIENTE", x: 535, y: 320, w: 130, h: 120, order: 3 },
  { id: "procura", kind: "actor", label: "PROCURA", x: 530, y: 510, w: 140, h: 60, hue: "purple", order: 4 },
  { id: "revision_procura", kind: "decision", label: "REVISIÓN\nPROCURA", x: 525, y: 630, w: 150, h: 140, order: 5 },
  { id: "analistas", kind: "actor", label: "ANALISTAS", x: 530, y: 840, w: 140, h: 60, hue: "emerald", order: 6 },
  { id: "cuadro_comparativo", kind: "artifact", label: "CUADRO\nCOMPARATIVO", x: 805, y: 840, w: 120, h: 60, order: 7 },
  { id: "procura_evalua", kind: "decision", label: "PROCURA\nEVALUA", x: 800, y: 650, w: 150, h: 140, order: 8 },
  { id: "presidencia", kind: "actor", label: "PRESIDENCIA", x: 950, y: 335, w: 140, h: 60, hue: "amber", order: 9 },
  { id: "finanzas_1", kind: "actor", label: "FINANZAS", x: 1155, y: 335, w: 140, h: 60, hue: "rose", order: 10 },
  { id: "anticipo", kind: "artifact", label: "ANTICIPO", x: 1165, y: 470, w: 120, h: 60, order: 11 },
  { id: "residentes", kind: "actor", label: "RESIDENTES", x: 1155, y: 610, w: 140, h: 60, hue: "indigo", order: 12 },
  { id: "proveedor_2", kind: "actor", label: "PROVEEDOR", x: 1320, y: 610, w: 140, h: 60, hue: "pink", order: 12 },
  { id: "informe_cierre", kind: "artifact", label: "INFORMES\nDE CIERRE", x: 1250, y: 780, w: 120, h: 60, order: 13 },
  { id: "auditoria_evalua", kind: "decision", label: "AUDITORIA\nEVALUA", x: 1235, y: 890, w: 150, h: 140, order: 14 },
  { id: "procura_solicita_finiquito", kind: "decision", label: "PROCURA SOLICITA\nFINIQUITO", x: 1490, y: 890, w: 150, h: 140, order: 15 },
  { id: "finanzas_paga_finiquito", kind: "decision", label: "FINANZAS PAGA\nFINIQUITO", x: 1490, y: 650, w: 150, h: 140, order: 16 },
];

/**
 * Anchors calcados de entryX/entryY/exitX/exitY del XML original cuando el
 * tramo se conserva igual; los tramos reescritos (rechazos directos,
 * renegociación hacia Analistas, aprobación/rechazo de Presidencia, y el
 * regreso de Procura a Auditoría en el finiquito) usan el ruteo automático
 * por posición relativa — no hay geometría "oficial" de draw.io que calcar
 * para una conexión que no existía en el diagrama original.
 */
const EDGES: FlowEdge[] = [
  { from: "infraestructura", to: "obra", label: "CREA / CORRIGE", entry: [0.5, 0] },
  { from: "obra", to: "auditoria", label: "ENVÍA SOLICITUD", entry: [0, 0.5] },
  { from: "auditoria", to: "revision_expediente", label: "ANALIZA", entry: [0.5, 0] },
  // Rodea por la izquierda (x=150, fuera de todo nodo) en vez de una línea
  // directa: revision_expediente queda a la derecha de infraestructura, así
  // que "entrar por la izquierda" en línea recta cruzaba el propio nodo
  // destino de punta a punta y tapaba la flecha entera.
  { from: "revision_expediente", to: "infraestructura", label: "RECHAZA (dato obligatorio)", dashed: true, exit: [0, 0.5], entry: [0, 0.5], points: [[150, 380], [150, 90]] },
  { from: "revision_expediente", to: "procura", label: "APRUEBA" },
  { from: "procura", to: "revision_procura", label: "ANALIZA", entry: [0.5, 0] },
  // Igual idea: sale por la derecha y sube bien a la derecha de PROCURA
  // EVALUA antes de entrar a Auditoría por su lado derecho — la ruta directa
  // pasaba a mitad de camino entre ambos rombos y el label quedaba pegado al
  // de "APRUEBA" de al lado.
  { from: "revision_procura", to: "auditoria", label: "REQUIERE REEVALUACIÓN", dashed: true, exit: [1, 0.5], entry: [1, 0.5], points: [[780, 700], [780, 210]] },
  // Waypoint intermedio colineal (misma x): no cambia la línea recta, solo
  // corre el punto medio (de donde sale la etiqueta) fuera de la punta
  // inferior del rombo REVISIÓN PROCURA, que tapaba "AUTORIZA INVERSIÓN".
  { from: "revision_procura", to: "analistas", label: "AUTORIZA INVERSIÓN", entry: [0.5, 0], points: [[600, 805]] },
  { from: "analistas", to: "cuadro_comparativo", label: "CREA / CARGA PROPUESTAS", entry: [0, 0.5] },
  { from: "cuadro_comparativo", to: "procura_evalua", label: "ENVÍA", entry: [0.5, 1] },
  // Única bifurcación de rechazo del comparativo — rodea por la izquierda de
  // CUADRO COMPARATIVO (x=700, fuera de su rango 805-925) en vez de
  // atravesarlo por la mitad. (Se eliminó la bifurcación "RENEGOCIACIÓN": no
  // es una transición de estado real — renegociar una propuesta es una
  // acción de Analistas sobre CONFIRMADO_PROCURA, no un rombo propio — y
  // duplicaba visualmente esta misma flecha.)
  { from: "procura_evalua", to: "analistas", label: "RECHAZA", dashed: true, exit: [0, 0.5], entry: [0.5, 1], points: [[700, 720], [700, 960]] },
  // PROCURA EVALUA es un rombo: solo sus 4 vértices (arriba/derecha/abajo/
  // izquierda) tocan la figura de verdad — un anchor "de lado" como [0.3,0]
  // cae en la esquina vacía del bounding box y la flecha queda flotando sin
  // tocar nunca el rombo. Ambas flechas usan el vértice de arriba, y se
  // separan con waypoints distintos para no superponerse.
  { from: "procura_evalua", to: "presidencia", label: "APROBADO", exit: [0.5, 0], entry: [0.3, 1], points: [[875, 520], [992, 520]] },
  { from: "presidencia", to: "finanzas_1", label: "APRUEBA", entry: [0, 0.5] },
  // Entra por el vértice derecho del rombo — el izquierdo ya lo usa la
  // salida de "RECHAZA" hacia Analistas, y compartirlo las hacía chocar.
  { from: "presidencia", to: "procura_evalua", label: "RECHAZA ADJUDICACIÓN", dashed: true, exit: [0.7, 1], entry: [1, 0.5], points: [[1048, 720]] },
  { from: "finanzas_1", to: "anticipo", label: "LIBERA", entry: [0.5, 0] },
  { from: "anticipo", to: "residentes", label: "PERMITE", entry: [0.5, 0] },
  { from: "anticipo", to: "proveedor_2", label: "PERMITE", entry: [0.5, 0] },
  // Entran por lados opuestos de INFORMES DE CIERRE (izquierda/derecha, no
  // ambas por el centro-arriba) para que los dos "INFORME PROPIO" no
  // converjan al mismo punto y sus labels queden pegados.
  { from: "residentes", to: "informe_cierre", label: "INFORME PROPIO", entry: [0.2, 0] },
  { from: "proveedor_2", to: "informe_cierre", label: "INFORME PROPIO", entry: [0.8, 0] },
  { from: "informe_cierre", to: "auditoria_evalua", label: "ENVÍA (ambos informes)", entry: [0.5, 0] },
  // El tramo horizontal a y=960 (por debajo de INFORMES DE CIERRE, que
  // termina en y=840) es el que faltaba: sin él, el punto medio calculado
  // para el label caía encima de esa entidad y el texto largo quedaba tapado.
  { from: "auditoria_evalua", to: "proveedor_2", label: "RECHAZA PROVEEDOR", dashed: true, entry: [0.808, 1], points: [[1432.5, 960]] },
  { from: "auditoria_evalua", to: "residentes", label: "RECHAZA RESIDENTE", dashed: true, entry: [0.231, 1], points: [[1187.52, 960]] },
  { from: "auditoria_evalua", to: "procura_solicita_finiquito", label: "APROBADO", exit: [0.5, 1], entry: [0.5, 1] },
  { from: "procura_solicita_finiquito", to: "finanzas_paga_finiquito", label: "ENVÍA", entry: [0.5, 1] },
  // Desvío por debajo de ambos rombos (y=1080, espacio abierto) en vez de la
  // línea recta y=960 entre ellos: ese corredor mide apenas ~105 unidades y
  // un label largo como este no cabía sin quedar tapado por su propio nodo.
  { from: "procura_solicita_finiquito", to: "auditoria_evalua", label: "DEVUELVE (en desacuerdo)", dashed: true, exit: [0.5, 1], entry: [0.5, 1], points: [[1565, 1080], [1310, 1080]] },
];

/** Nodo del camino feliz "donde está" la obra ahora mismo, según su status.
 *  RECHAZADO_AUDITORIA y EN_REEVALUACION_AUDITORIA no tienen caja de
 *  notificación propia (se quitaron): resaltan directamente al actor que
 *  debe actuar — Infraestructura corrigiendo, Auditoría reevaluando. */
function currentNodeId(status: string): string | null {
  switch (status) {
    case ProjectStatus.CREADO:
      return "revision_expediente";
    case ProjectStatus.RECHAZADO_AUDITORIA:
      return "infraestructura";
    case ProjectStatus.REVISADO_AUDITORIA:
      return "revision_procura";
    case ProjectStatus.EN_REEVALUACION_AUDITORIA:
      return "auditoria";
    case ProjectStatus.CONFIRMADO_PROCURA:
      return "analistas";
    case ProjectStatus.COMPARATIVA_ENVIADA:
      return "procura_evalua";
    case ProjectStatus.PENDIENTE_PRESIDENCIA:
    case ProjectStatus.APROBADO_PRESIDENCIA:
      // Ambos status quedan sobre el mismo nodo PRESIDENCIA en esta versión
      // simplificada: el paso intermedio de Procura confirmando la
      // contratación ya no tiene caja propia (ver comentario de EDGES).
      return "presidencia";
    case ProjectStatus.CONTRATADO:
      return "finanzas_1";
    case ProjectStatus.EN_EJECUCION:
      return "residentes"; // proveedor_2 comparte order=15, ver isCurrent()
    case ProjectStatus.INFORME_ENVIADO:
    case ProjectStatus.VERIFICANDO_FINALIZACION:
      return "auditoria_evalua";
    case ProjectStatus.PENDIENTE_SOLICITUD_FINIQUITO:
      return "procura_solicita_finiquito";
    case ProjectStatus.LISTO_PAGO_FINAL:
      return "finanzas_paga_finiquito";
    default:
      return null;
  }
}

const HUE_FILL: Record<string, string> = {
  cyan: "#ecfeff", blue: "#eff6ff", purple: "#faf5ff", emerald: "#ecfdf5",
  amber: "#fffbeb", rose: "#fff1f2", indigo: "#eef2ff", pink: "#fdf2f8", slate: "#f8fafc",
};
const HUE_STROKE: Record<string, string> = {
  cyan: "#06b6d4", blue: "#2563eb", purple: "#9333ea", emerald: "#059669",
  amber: "#d97706", rose: "#e11d48", indigo: "#4f46e5", pink: "#db2777", slate: "#94a3b8",
};
const HUE_TEXT: Record<string, string> = {
  cyan: "#0e7490", blue: "#1d4ed8", purple: "#7e22ce", emerald: "#047857",
  amber: "#b45309", rose: "#be123c", indigo: "#4338ca", pink: "#be185d", slate: "#475569",
};

/**
 * Colorimetría de estado — canal separado de la identidad de rol (HUE_* de
 * arriba): el rol dice QUIÉN actúa, el estado dice QUÉ tan avanzado está.
 * Se aplica igual a nodos y a aristas (de flujo y de bifurcación):
 * - Verde: ambos extremos ya se cumplieron (tramo del pasado).
 * - Azul + animado: un extremo es el paso "en curso" ahora mismo.
 * - Gris: ninguno de los dos ocurrió todavía (tramo futuro) — y en las
 *   bifurcaciones, cualquiera que no salga del paso actual, ya sea porque
 *   la obra ya pasó ese punto o porque todavía no llega a él (ambos casos
 *   son igual de "no aplica ahora mismo").
 * - Naranja + animado (más lento que el azul): la ÚNICA bifurcación que
 *   podría dispararse desde el paso actual — la que de verdad importa
 *   vigilar en este momento.
 */
const DONE_FILL = "#ecfdf5";
const DONE_STROKE = "#10b981";
const CURRENT_STROKE = "#0ea5e9";
const CURRENT_FILL = "#e0f2fe";
const GRAY_STROKE = "#94a3b8";
const GRAY_TEXT = "#64748b";
const LIVE_STROKE = "#fb923c";
const LIVE_TEXT = "#c2410c";

function nodeById(id: string): FlowNode {
  const n = NODES.find((x) => x.id === id);
  if (!n) throw new Error(`Flow node desconocido: ${id}`);
  return n;
}

function center(n: FlowNode) {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

/** Punto de anclaje sobre el borde de `n` para la fracción [x,y] dada (mismo significado que entryX/entryY|exitX/exitY del XML). Sin fracción → centro del nodo (el propio fill del nodo lo tapa, ya que se dibuja encima). */
function anchorPoint(n: FlowNode, frac?: Anchor): { x: number; y: number } {
  if (!frac) return center(n);
  return { x: n.x + frac[0] * n.w, y: n.y + frac[1] * n.h };
}

type Side = "up" | "down" | "left" | "right" | null;

/** Lado del borde que representa una fracción de anclaje — null si cae en una zona ambigua (ni borde vertical ni horizontal claro), caso en que no hay dirección fija. */
function sideOf(frac?: Anchor): Side {
  if (!frac) return null;
  const [fx, fy] = frac;
  if (fy <= 0.05) return "up";
  if (fy >= 0.95) return "down";
  if (fx <= 0.05) return "left";
  if (fx >= 0.95) return "right";
  return null;
}

/**
 * Ruta ortogonal entre dos puntos cuando el XML no trae waypoints explícitos
 * — dobla según el LADO de entrada real al destino (entryX/entryY), no por
 * una heurística de posición relativa: por eso antes algunas flechas cortaban
 * a través de nodos intermedios o llegaban "de rebote" en vez de entrar
 * limpiamente por el lado que draw.io definió.
 */
function orthogonalRoute(p1: { x: number; y: number }, p2: { x: number; y: number }, entrySide: Side): { x: number; y: number }[] {
  if (entrySide === "up" || entrySide === "down") {
    if (Math.abs(p1.x - p2.x) < 1) return [p1, p2];
    const midY = (p1.y + p2.y) / 2;
    return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
  }
  if (entrySide === "left" || entrySide === "right") {
    if (Math.abs(p1.y - p2.y) < 1) return [p1, p2];
    const midX = (p1.x + p2.x) / 2;
    return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
  }
  // Sin lado de entrada fijo: mismo elbow de respaldo, por posición relativa entre centros.
  if (Math.abs(p1.x - p2.x) < 15 || Math.abs(p1.y - p2.y) < 15) return [p1, p2];
  const midY = (p1.y + p2.y) / 2;
  return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
}

/**
 * Punto donde un rayo desde el centro de `n` hacia (tx,ty) cruza su borde —
 * usado cuando el edge no fija un `exit`. Sin esto, el "punto de partida" es
 * el centro exacto del nodo, y en tramos cortos entre nodos cercanos (p.ej.
 * PRESIDENCIA → FINANZAS) el punto medio del label cae aún DENTRO del nodo
 * origen — se veía la mitad del texto tapada por su propio nodo.
 */
function autoExitPoint(n: FlowNode, tx: number, ty: number): { x: number; y: number } {
  const c = center(n);
  const dx = tx - c.x;
  const dy = ty - c.y;
  if (dx === 0 && dy === 0) return c;
  const tX = dx !== 0 ? n.w / 2 / Math.abs(dx) : Infinity;
  const tY = dy !== 0 ? n.h / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tX, tY);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

function edgePoints(edge: FlowEdge): { x: number; y: number }[] {
  const a = nodeById(edge.from);
  const b = nodeById(edge.to);
  const end = anchorPoint(b, edge.entry);
  // La dirección para el auto-exit apunta al primer punto real del trazado
  // (el primer waypoint si lo hay, si no el destino) — no siempre el destino
  // final: con waypoints, el primer tramo va hacia el primer waypoint, y
  // usar el destino ahí daba un punto de salida diagonal que rompía el
  // primer tramo horizontal/vertical ya calculado a mano.
  const towards = edge.points?.[0] ? { x: edge.points[0][0], y: edge.points[0][1] } : end;
  const start = edge.exit ? anchorPoint(a, edge.exit) : autoExitPoint(a, towards.x, towards.y);
  if (edge.points) {
    const explicit = edge.points.map(([x, y]) => ({ x, y }));
    return [start, ...explicit, end];
  }
  return orthogonalRoute(start, end, sideOf(edge.entry));
}

/** Punto sobre el segmento from→to, a distancia `d` de `from` (clamped a la mitad del segmento). */
function stepFrom(from: { x: number; y: number }, to: { x: number; y: number }, d: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const clamped = Math.min(d, len / 2);
  return { x: from.x + (dx / len) * clamped, y: from.y + (dy / len) * clamped };
}

/** Ruta ortogonal con esquinas redondeadas (radio pequeño) en cada codo — sin
 *  esto, cada quiebre a 90° se ve como un escalón; con la curva, la línea se
 *  lee como un conector fluido, acorde al resto de bordes redondeados de la
 *  app. No cambia el trazado recto/las esquinas de los tramos, solo las suaviza. */
function pathD(points: { x: number; y: number }[], radius = 12): string {
  if (points.length <= 2) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const a = stepFrom(cur, prev, radius);
    const b = stepFrom(cur, next, radius);
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function midLabelPoint(points: { x: number; y: number }[]): { x: number; y: number } {
  const mid = points[Math.floor((points.length - 1) / 2)];
  const next = points[Math.min(Math.floor((points.length - 1) / 2) + 1, points.length - 1)];
  return { x: (mid.x + next.x) / 2, y: (mid.y + next.y) / 2 };
}

function NodeLabel({ label, x, y, fill }: { label: string; x: number; y: number; fill: string }) {
  const lines = label.split("\n");
  const lineHeight = 13;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text x={x} y={startY} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight={700} fill={fill} fontFamily="Inter, sans-serif">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>{line}</tspan>
      ))}
    </text>
  );
}

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

const MIN_SCALE = 0.12;
const MAX_SCALE = 3;

/**
 * Lienzo con pan/zoom para el flujograma — el diagrama completo (≈1650×1080)
 * no entra legible en el ancho del modal, así que en vez de forzar scroll
 * horizontal (ilegible/incómodo) se ajusta a la ventana por defecto y el
 * usuario hace zoom manual sobre lo que le interesa (rueda, pellizco táctil,
 * o los botones +/-/ajustar).
 */
function FlowCanvas({ diagramWidth, diagramHeight, viewBox, children }: { diagramWidth: number; diagramHeight: number; viewBox: string; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  // Anima el transform solo cuando el cambio viene de un botón o del ajuste
  // automático — durante el arrastre a mano el transform debe seguir al
  // puntero al instante, sin easing de por medio (si no, se siente con lag).
  const [isDragging, setIsDragging] = useState(false);
  const reduceMotion = useReducedMotion();

  const fit = () => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw === 0 || ch === 0) return;
    const scale = Math.min(Math.max(Math.min(cw / diagramWidth, ch / diagramHeight) * 0.94, MIN_SCALE), MAX_SCALE);
    setTransform({ scale, tx: (cw - diagramWidth * scale) / 2, ty: (ch - diagramHeight * scale) / 2 });
  };

  useLayoutEffect(() => {
    fit();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramWidth, diagramHeight]);

  const zoomBy = (factor: number, originX?: number, originY?: number) => {
    const el = containerRef.current;
    if (!el) return;
    const ox = originX ?? el.clientWidth / 2;
    const oy = originY ?? el.clientHeight / 2;
    setTransform((t) => {
      const next = Math.min(Math.max(t.scale * factor, MIN_SCALE), MAX_SCALE);
      const ratio = next / t.scale;
      return { scale: next, tx: ox - (ox - t.tx) * ratio, ty: oy - (oy - t.ty) * ratio };
    });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Sin esto, arrastrar sobre el SVG arranca una selección de texto nativa
    // del navegador (el cursor "fantasma" arrastrando texto en vez de
    // mover el diagrama) — preventDefault en pointerdown la evita de raíz.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx: transform.tx, ty: transform.ty };
    setIsDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    setTransform((t) => ({ ...t, tx: drag.tx + (e.clientX - drag.startX), ty: drag.ty + (e.clientY - drag.startY) }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  /** Zoom con rueda solo cuando se sostiene Ctrl/⌘ (el gesto de pellizco en
   *  trackpad ya llega con ctrlKey=true) — sin eso, la rueda hace scroll
   *  normal. Se registra como listener nativo con passive:false porque el
   *  onWheel sintético de React no siempre deja que preventDefault frene el
   *  scroll del modal contenedor — con addEventListener sí, de forma
   *  consistente entre navegadores. El factor se escala con la magnitud real
   *  de deltaY (no un multiplicador fijo por evento): un trackpad dispara
   *  decenas de eventos pequeños por gesto, así que un factor fijo por
   *  evento se acumulaba en un zoom brusco y exagerado. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: globalThis.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.min(Math.max(Math.exp(-e.deltaY * 0.0015), 0.85), 1.15);
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[360px] sm:h-[440px] overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/60 to-slate-100/40 touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
            width: diagramWidth,
            height: diagramHeight,
            transition: isDragging || reduceMotion ? "none" : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <motion.svg
            width={diagramWidth}
            height={diagramHeight}
            viewBox={viewBox}
            role="img"
            aria-label="Flujograma del proceso de obra IVOO"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {children}
          </motion.svg>
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-sm p-1">
        <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Alejar" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-90 transition-all duration-150 cursor-pointer">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={fit} aria-label="Ajustar a pantalla" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-90 transition-all duration-150 cursor-pointer">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => zoomBy(1.25)} aria-label="Acercar" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-90 transition-all duration-150 cursor-pointer">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-center text-[10px] text-slate-400 font-medium">
        <span className="sm:hidden">Pellizca para hacer zoom · arrastra para mover</span>
        <span className="hidden sm:inline">Ctrl/⌘ + rueda para hacer zoom · arrastra para mover</span>
      </p>
    </div>
  );
}

export default function ProjectOrganigrama({ project }: { project: Project }) {
  const markerId = useId().replace(/[:]/g, "");
  const reduceMotion = useReducedMotion();
  const isComplete = project.status === ProjectStatus.COMPLETADO_PAGADO;
  const activeCurrentId = currentNodeId(project.status);
  const currentOrder = activeCurrentId ? nodeById(activeCurrentId).order : undefined;

  const isCurrent = (n: FlowNode) => !isComplete && (n.id === activeCurrentId || (activeCurrentId === "residentes" && n.id === "proveedor_2"));
  const isDone = (n: FlowNode) => {
    if (isComplete) return true;
    if (n.order === undefined) return false;
    if (currentOrder === undefined) return false;
    return n.order < currentOrder;
  };

  // El viewBox debe cubrir también los waypoints explícitos de las aristas
  // (p.ej. el rodeo de "RECHAZA" hasta x=150) — si solo se miden los nodos,
  // esos tramos quedan fuera del viewBox y el navegador los recorta: la
  // flecha "desaparece" a mitad de camino y solo se ve la punta ya dentro
  // del rango visible.
  const allWaypoints = EDGES.flatMap((e) => e.points ?? []);
  const xs = [...NODES.map((n) => n.x), ...NODES.map((n) => n.x + n.w), ...allWaypoints.map((p) => p[0])];
  const ys = [...NODES.map((n) => n.y), ...NODES.map((n) => n.y + n.h), ...allWaypoints.map((p) => p[1])];
  const minX = Math.min(...xs) - 20;
  const minY = Math.min(...ys) - 20;
  const maxX = Math.max(...xs) + 20;
  const maxY = Math.max(...ys) + 40;

  return (
    <section aria-label="Flujo de decisiones — Organigrama IVOO">
      <FlowCanvas diagramWidth={maxX - minX} diagramHeight={maxY - minY} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
          <defs>
            {(["gray", "green", "blue", "live"] as const).map((kind) => (
              <marker key={kind} id={`arrow-${kind}-${markerId}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={{ gray: GRAY_STROKE, green: DONE_STROKE, blue: CURRENT_STROKE, live: LIVE_STROKE }[kind]} />
              </marker>
            ))}
            {/* Resplandor suave del nodo "en curso" — un único filtro reutilizado, no uno por nodo. */}
            <filter id={`glow-${markerId}`} x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={CURRENT_STROKE} floodOpacity="0.55" />
            </filter>
            <style>{`
              .io-flow-node { transition: fill 280ms ease, stroke 280ms ease; }
              .io-flow-node:hover { filter: brightness(1.05); }
              .io-flow-edge { transition: stroke 280ms ease; }
            `}</style>
          </defs>

          {/*
            Aristas — debajo de los nodos, para que el fill del nodo tape la
            entrada de la línea. Colorimetría de estado (no de identidad):
            - verde: los dos extremos ya se cumplieron.
            - azul + punto viajero: uno de los extremos es el paso actual.
            - naranja + triángulo viajero (más lento que el punto azul): la
              bifurcación que SÍ podría dispararse desde el paso actual.
            - gris: todo lo demás — tramo futuro o bifurcación que ya no
              aplica (la obra pasó ese punto o nunca lo tomó).
          */}
          {EDGES.map((edge, i) => {
            const pts = edgePoints(edge);
            const labelPt = edge.label ? midLabelPoint(pts) : null;
            const a = nodeById(edge.from);
            const b = nodeById(edge.to);

            const kind: "gray" | "green" | "blue" | "live" = edge.dashed
              ? isCurrent(a) ? "live" : "gray"
              : isCurrent(a) || isCurrent(b) ? "blue"
                : isDone(a) && isDone(b) ? "green"
                  : "gray";

            const stroke = { gray: GRAY_STROKE, green: DONE_STROKE, blue: CURRENT_STROKE, live: LIVE_STROKE }[kind];
            const textFill = { gray: GRAY_TEXT, green: "#047857", blue: "#0369a1", live: LIVE_TEXT }[kind];
            const animated = !reduceMotion && !isComplete && (kind === "blue" || kind === "live");

            return (
              <g key={i}>
                <path
                  className="io-flow-edge"
                  d={pathD(pts)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={kind === "gray" ? 1.4 : 1.8}
                  strokeDasharray={edge.dashed ? "5 4" : undefined}
                  markerEnd={`url(#arrow-${kind}-${markerId})`}
                >
                  {/* "Cinta transportadora": el punteado se desplaza sobre sí mismo
                      sin fin — solo en la bifurcación realmente activa ahora mismo,
                      para que el movimiento signifique algo (no decore las que ya
                      no aplican). Anima solo stroke-dashoffset (compositor, no layout). */}
                  {edge.dashed && kind === "live" && !reduceMotion && (
                    <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.7s" repeatCount="indefinite" />
                  )}
                </path>
                {/* Objeto en movimiento: punto (flujo en curso) o triángulo
                    (bifurcación activa, con recorrido más lento) — nativo
                    (SVG animateMotion), sin costo de render/reflow en React. */}
                {animated && kind === "blue" && (
                  <circle r={3.2} fill={CURRENT_STROKE}>
                    <animateMotion dur="1.8s" repeatCount="indefinite" path={pathD(pts)} />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.85;1" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                {animated && kind === "live" && (
                  <polygon points="-3.5,-3 3.5,0 -3.5,3" fill={LIVE_STROKE}>
                    <animateMotion dur="3.2s" repeatCount="indefinite" path={pathD(pts)} rotate="auto" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.9;1" dur="3.2s" repeatCount="indefinite" />
                  </polygon>
                )}
                {labelPt && (
                  <text x={labelPt.x} y={labelPt.y - 4} textAnchor="middle" fontSize="8.5" fontWeight={700} fill={textFill} fontFamily="ui-monospace, monospace" style={{ paintOrder: "stroke", stroke: "#f8fafc", strokeWidth: 3 }}>
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodos */}
          {NODES.map((n) => {
            const current = isCurrent(n);
            const done = isDone(n);
            const cx = n.x + n.w / 2;
            const cy = n.y + n.h / 2;

            let fill = "#ffffff";
            let stroke = "#cbd5e1";
            let textFill = "#475569";

            // Identidad de rol (categórica, fija) solo en actores — un rombo
            // de decisión o un artefacto no "pertenecen" a un rol, así que
            // quedan neutros y dejan que el color hable de estado, no de
            // identidad (antes toda decisión era celeste fijo sin importar
            // si estaba pendiente, en curso o ya resuelta).
            if (n.kind === "actor") {
              fill = HUE_FILL[n.hue ?? "slate"];
              stroke = HUE_STROKE[n.hue ?? "slate"];
              textFill = HUE_TEXT[n.hue ?? "slate"];
            }
            if (done) {
              fill = DONE_FILL;
              stroke = DONE_STROKE;
              textFill = "#047857";
            }
            if (current) {
              fill = CURRENT_FILL;
              stroke = CURRENT_STROKE;
              textFill = "#0369a1";
            }

            return (
              <g key={n.id} filter={current ? `url(#glow-${markerId})` : undefined}>
                {n.kind === "decision" ? (
                  <polygon
                    className="io-flow-node"
                    points={`${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}`}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={current ? 2.5 : 1.4}
                  />
                ) : (
                  <rect
                    className="io-flow-node"
                    x={n.x}
                    y={n.y}
                    width={n.w}
                    height={n.h}
                    rx={n.kind === "actor" ? 10 : 3}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={current ? 2.5 : 1.4}
                  />
                )}
                {current && !reduceMotion && (
                  <circle cx={n.x + n.w - 6} cy={n.y + 6} r={4} fill={CURRENT_STROKE}>
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="r" values="4;5;4" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                {current && reduceMotion && <circle cx={n.x + n.w - 6} cy={n.y + 6} r={4} fill={CURRENT_STROKE} />}
                <NodeLabel label={n.label} x={cx} y={cy} fill={textFill} />
              </g>
            );
          })}
      </FlowCanvas>

      {/* Leyenda de estado — mismo código de color para nodos y aristas. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-[10px] font-mono font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border" style={{ background: DONE_FILL, borderColor: DONE_STROKE }} /> Hecho</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border animate-pulse" style={{ background: CURRENT_FILL, borderColor: CURRENT_STROKE }} /> En curso</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" /> Pendiente</span>
        <span className="inline-flex items-center gap-1 border-l border-slate-200 pl-3"><span className="h-0.5 w-4 rounded-full" style={{ background: DONE_STROKE }} /> Flujo cumplido</span>
        <span className="inline-flex items-center gap-1"><span className="h-0.5 w-4 rounded-full" style={{ background: CURRENT_STROKE }} /> Flujo en curso</span>
        <span className="inline-flex items-center gap-1"><span className="h-0.5 w-4 rounded-full" style={{ background: GRAY_STROKE }} /> Flujo futuro</span>
        <span className="inline-flex items-center gap-1 border-l border-slate-200 pl-3"><span className="h-3 w-4 border-t-2 border-dashed" style={{ borderColor: LIVE_STROKE }} /> <span style={{ color: LIVE_TEXT }}>Bifurcación activa</span></span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-4 border-t-2 border-dashed border-slate-300" /> Bifurcación no aplica</span>
      </div>
    </section>
  );
}
