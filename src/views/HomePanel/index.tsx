/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Home: única ruta ("/") para todos los roles, con contenido distinto según
 * quién esté autenticado — KPIs y listas derivados de `projects`/`auditLogs`
 * (ya cargados por App.tsx, sin endpoint nuevo) relevantes al trabajo de su
 * rol, y accesos directos a sus módulos. Reemplaza el <Navigate> que antes
 * hacía que "/" saltara directo al primer módulo permitido — con esto,
 * ningún rol (incluidos los de una sola vista) llega a una pantalla vacía
 * tras el login.
 *
 * Jerarquía deliberada, de arriba a abajo: quién sos (hero) → cómo está tu
 * trabajo ahora mismo (KPIs con la lista real detrás del número, no solo la
 * cifra) → qué pasó últimamente (actividad) → a dónde ir (módulos). Cada
 * bloque entra en su propio momento (stagger), no todo de golpe.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock, Megaphone, Sparkles } from "lucide-react";
import { SkeletonBlock, SkeletonStats } from "../../components/SkeletonLoader";
import { SEMANTIC_COLOR_MAP } from "../../components/UI/colorTokens";
import EmptyState from "../../components/UI/EmptyState";
import { roleLabel } from "../../constants/roles";
import { getUserInitials, getRoleColor } from "../../utils";
import { getRoleHomeConfig } from "./roleHomeConfig";
import type { AuditLog, Project } from "../../types";

interface HomePanelProps {
  user: { name: string; email: string } | null;
  activeRole: string;
  projects: Project[];
  auditLogs?: AuditLog[];
  isLoading?: boolean;
  /** Aviso editable desde CONFIG APP (opcional) — se muestra por encima del mensaje dinámico. */
  announcement?: string | null;
}

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.02 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};

const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

const MAX_PREVIEW = 3;
const MAX_ACTIVITY = 6;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function firstName(fullName: string | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

/**
 * Mensaje dinámico bajo el tagline — un resumen en una frase de cuánto
 * pendiente hay hoy, derivado de los mismos KPIs que ya se muestran abajo
 * (no un dato nuevo, solo su versión "leída en voz alta"). Sin pendientes,
 * confirma que está al día en vez de quedar en silencio.
 */
function buildStatusMessage(kpiValues: { label: string; matches: unknown[] }[]): string {
  const withPending = kpiValues.filter((k) => k.matches.length > 0);
  if (withPending.length === 0) {
    return kpiValues.length > 0 ? "Todo al día — sin pendientes en este momento." : "";
  }
  if (withPending.length === 1) {
    const k = withPending[0];
    const count = k.matches.length;
    return `Hay ${count} ${count === 1 ? "expediente" : "expedientes"} en "${k.label.toLowerCase()}".`;
  }
  const total = withPending.reduce((sum, k) => sum + k.matches.length, 0);
  return `Hay ${total} expedientes esperando acción entre ${withPending.length} frentes distintos.`;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "recién";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export default function HomePanel({ user, activeRole, projects, auditLogs = [], isLoading = false, announcement = null }: HomePanelProps) {
  const config = useMemo(() => getRoleHomeConfig(activeRole), [activeRole]);
  const reduceMotion = useReducedMotion();
  const moduleRoutes = useMemo(() => new Set(config.modules.map((m) => m.route)), [config.modules]);

  const kpiValues = useMemo(
    () =>
      config.kpis.map((k) => ({
        ...k,
        matches: k.filter(projects),
      })),
    [config.kpis, projects],
  );

  const statusMessage = useMemo(() => buildStatusMessage(kpiValues), [kpiValues]);
  const allCaughtUp = kpiValues.length > 0 && kpiValues.every((k) => k.matches.length === 0);

  const recentActivity = useMemo(() => auditLogs.slice(0, MAX_ACTIVITY), [auditLogs]);

  if (isLoading) return <HomeSkeleton />;

  const hasActivity = recentActivity.length > 0;

  return (
    <div className="space-y-8 pb-4">
      {/* ── Hero ── */}
      <motion.div
        variants={reduceMotion ? undefined : heroContainer}
        initial={reduceMotion ? undefined : "hidden"}
        animate={reduceMotion ? undefined : "show"}
        className="relative overflow-hidden rounded-container border border-border-default/70 bg-surface-inverted px-6 py-8 text-text-inverted sm:px-9 sm:py-10"
      >
        {/* Malla de gradientes de marca — mismo lenguaje visual que el login,
            para que el Home se sienta parte de la misma familia premium.
            Los orbes derivan lentamente sin detenerse nunca del todo (mismo
            patrón que BackgroundDecor del login) — antes eran estáticos. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/30 blur-[80px]"
            animate={reduceMotion ? undefined : { x: [0, 60, 0], y: [0, 34, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-20 -bottom-28 h-80 w-80 rounded-full bg-indigo-500/25 blur-[90px]"
            animate={reduceMotion ? undefined : { x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.18, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 90% 100% at 0% 0%, black 30%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 90% 100% at 0% 0%, black 30%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative flex items-center gap-4">
          {user?.name && (
            <motion.div
              variants={reduceMotion ? undefined : heroItem}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-lg font-black text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/15"
            >
              {getUserInitials(user.name)}
            </motion.div>
          )}
          <div>
            <motion.p
              variants={reduceMotion ? undefined : heroItem}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300/80"
            >
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              {greeting()}{user?.name ? `, ${firstName(user.name)}` : ""}
            </motion.p>
            <motion.h1
              variants={reduceMotion ? undefined : heroItem}
              className="mt-1 text-[1.9rem] font-black leading-tight tracking-tight text-white sm:text-3xl"
            >
              {roleLabel(activeRole)}
            </motion.h1>
            <motion.p
              variants={reduceMotion ? undefined : heroItem}
              className="mt-1.5 max-w-md text-sm font-medium leading-relaxed text-slate-300/90"
            >
              {config.tagline}
            </motion.p>

            {announcement && (
              <motion.p
                variants={reduceMotion ? undefined : heroItem}
                className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold leading-snug text-amber-200"
              >
                <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                {announcement}
              </motion.p>
            )}

            {statusMessage && (
              <motion.p
                variants={reduceMotion ? undefined : heroItem}
                className={`mt-3 flex items-center gap-1.5 text-sm font-bold ${allCaughtUp ? "text-emerald-300" : "text-white"}`}
              >
                {allCaughtUp && <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                {statusMessage}
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Cuerpo: KPIs + módulos (principal) / actividad reciente (lateral) ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* ── KPIs con lista real detrás del número ── */}
          {kpiValues.length > 0 && (
            <motion.div
              variants={reduceMotion ? undefined : sectionReveal}
              initial={reduceMotion ? undefined : "hidden"}
              whileInView={reduceMotion ? undefined : "show"}
              viewport={{ once: true, margin: "-40px" }}
            >
              <h2 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                Requiere atención
              </h2>
              <motion.div
                variants={reduceMotion ? undefined : gridStagger}
                initial={reduceMotion ? undefined : "hidden"}
                whileInView={reduceMotion ? undefined : "show"}
                viewport={{ once: true, margin: "-40px" }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {kpiValues.map((k) => {
                  const semantic = SEMANTIC_COLOR_MAP[k.accent];
                  const preview = k.matches.slice(0, MAX_PREVIEW);
                  const showRoute = moduleRoutes.has(k.route) ? k.route : null;

                  return (
                    <motion.div
                      key={k.key}
                      variants={reduceMotion ? undefined : gridItem}
                      className="group relative flex flex-col overflow-hidden rounded-container border border-border-default/80 bg-surface shadow-sm transition-shadow duration-300 hover:shadow-lg"
                    >
                      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${semantic.gradientFrom} ${semantic.gradientTo}`} />

                      <div className="flex items-start justify-between gap-3 p-5 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${semantic.bg100}`}>
                            <span className={semantic.icon500}>{k.icon}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-tertiary">
                            {k.label}
                          </span>
                        </div>
                        <p className="shrink-0 text-3xl font-black leading-none tracking-tight text-text-primary tabular-nums">
                          {k.matches.length}
                        </p>
                      </div>

                      {/* Lista real de hasta 3 proyectos — el KPI deja de ser
                          solo un número flotante y pasa a ser un resumen
                          accionable de qué específicamente lo compone. */}
                      {preview.length > 0 ? (
                        <ul className="border-t border-border-subtle px-5 py-3">
                          {preview.map((proj) => (
                            <li key={proj.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                              <span className="min-w-0 truncate font-semibold text-text-secondary">{proj.title}</span>
                              <span className="shrink-0 font-mono text-[10px] text-text-muted">{proj.id}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="border-t border-border-subtle px-5 py-4 text-xs font-medium text-text-muted">
                          Nada pendiente aquí — al día.
                        </p>
                      )}

                      {showRoute && k.matches.length > 0 && (
                        <Link
                          to={showRoute}
                          className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle px-5 py-3 text-xs font-bold text-text-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-text-primary"
                        >
                          Ver {k.matches.length > MAX_PREVIEW ? `los ${k.matches.length}` : "todos"}
                          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* ── Accesos directos a sus módulos ── */}
          {config.modules.length > 0 && (
            <motion.div
              variants={reduceMotion ? undefined : sectionReveal}
              initial={reduceMotion ? undefined : "hidden"}
              whileInView={reduceMotion ? undefined : "show"}
              viewport={{ once: true, margin: "-40px" }}
            >
              <h2 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                Módulos disponibles
              </h2>
              <motion.div
                variants={reduceMotion ? undefined : gridStagger}
                initial={reduceMotion ? undefined : "hidden"}
                whileInView={reduceMotion ? undefined : "show"}
                viewport={{ once: true, margin: "-40px" }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {config.modules.map((mod) => {
                  const semantic = SEMANTIC_COLOR_MAP[mod.accent];
                  return (
                    <motion.div key={mod.route} variants={reduceMotion ? undefined : gridItem}>
                      <Link
                        to={mod.route}
                        className="group relative flex h-full items-start gap-3.5 overflow-hidden rounded-container border border-border-default/80 bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-border-default"
                      >
                        <div
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${semantic.gradientFrom} ${semantic.gradientTo} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.04]`}
                        />
                        <div
                          className={`relative shrink-0 rounded-xl p-2.5 ${semantic.bg100} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                        >
                          <span className={semantic.icon500}>{mod.icon}</span>
                        </div>
                        <div className="relative min-w-0 flex-1">
                          <p className="font-black tracking-tight text-text-primary">{mod.label}</p>
                          <p className="mt-0.5 text-xs font-medium leading-snug text-text-muted">{mod.description}</p>
                        </div>
                        <ArrowRight
                          className="relative mt-1 h-4 w-4 shrink-0 text-text-muted opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                          strokeWidth={2.5}
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* ── Actividad reciente (lateral en desktop) ── */}
        <motion.div
          variants={reduceMotion ? undefined : sectionReveal}
          initial={reduceMotion ? undefined : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={{ once: true, margin: "-40px" }}
          className="lg:col-span-1"
        >
          <h2 className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
            <Clock className="h-3 w-3" strokeWidth={2.5} />
            Actividad reciente
          </h2>
          <div className="rounded-container border border-border-default/80 bg-surface shadow-sm">
            {hasActivity ? (
              <ul className="divide-y divide-border-subtle">
                {recentActivity.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      className={`mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${getRoleColor(log.role)}`}
                    >
                      {log.role}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text-primary">{log.action}</p>
                      {log.projectTitle && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted">{log.projectTitle}</p>
                      )}
                      <p className="mt-1 text-[10px] font-mono text-text-tertiary">{timeAgo(log.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6">
                <EmptyState message="Sin actividad reciente todavía." />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-8 pb-4">
      <div className="rounded-container border border-border-default/70 bg-surface-inverted px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-40" />
            <SkeletonBlock className="h-8 w-56" />
            <SkeletonBlock className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="space-y-3.5">
            <SkeletonBlock className="h-3 w-40" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <SkeletonStats key={i} />
              ))}
            </div>
          </div>
          <div className="space-y-3.5">
            <SkeletonBlock className="h-3 w-32" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <SkeletonStats key={`m-${i}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3.5">
          <SkeletonBlock className="h-3 w-36" />
          <SkeletonStats className="h-64" />
        </div>
      </div>
    </div>
  );
}
