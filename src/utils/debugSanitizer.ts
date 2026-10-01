/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sanitización de datos sensibles para el DEBUG-MODE. Hoja pura: NO importa
 * stores ni services (evita ciclos con api.ts/debugStore.ts, ver Plan
 * DEBUG-MODE Mejoras §Bloque 1).
 *
 * Dos capas complementarias:
 *  - por NOMBRE de clave (password, token, authorization, cookie…): el valor
 *    completo se reemplaza por "[redacted]";
 *  - por PATRÓN de valor en strings (JWT, Bearer, emails, RIF/cédula,
 *    teléfonos, tokens en query-string, pares "password":"…" dentro de JSON
 *    serializado).
 *
 * Debe aplicarse ANTES de truncar: `truncateForDebug` serializa el payload a
 * un string `preview`, donde ya no hay claves que enmascarar.
 */

export const REDACTED = "[redacted]";

const MAX_DEPTH = 8;
const MAX_NODES = 5000;
const MAX_ARRAY_ITEMS = 200;
const MAX_STRING_CHARS = 50_000;

/** Clave normalizada (minúsculas, solo alfanumérico) que delata un secreto. */
const SENSITIVE_KEY_PATTERN =
  /password|passwd|pwd|token|secret|authorization|cookie|apikey|cvv|cardnumber|creditcard|credential|xsrf|csrf|otp|privatekey/;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

const JWT_PATTERN = /\beyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}\b/g;
const BEARER_PATTERN = /\bBearer\s+[\w.~+/-]+=*/gi;
// "password":"abc" / 'token': 'abc' dentro de JSON/strings serializados.
const SERIALIZED_PAIR_PATTERN =
  /(["']?[\w-]*(?:password|passwd|pwd|token|secret|authorization|apikey|api_key|cvv|credential)[\w-]*["']?\s*[:=]\s*)(["'])[^"']*\2/gi;
const QUERY_SECRET_PATTERN = /([?&](?:[\w-]*token|api[_-]?key|key|signature|secret|password)=)[^&\s#]+/gi;
const EMAIL_PATTERN = /\b([\w.+-])[\w.+-]*@([\w-]+(?:\.[\w-]+)+)\b/g;
// RIF/cédula venezolanos: letra + guion obligatorio ("J-12345678-9"); no
// coincide con IDs de la app (PRJ-001, MAT-1) ni con UUIDs/fechas/montos.
const RIF_PATTERN = /\b[VEJGP]-\d{7,9}(?:-\d)?\b/g;
const PHONE_PATTERN = /(?<![\d-])(?:\+?58|0)[-\s]?(?:4(?:12|14|16|24|26)|2\d{2})[-\s]?\d{7}(?![\d-])/g;

/** Aplica los patrones de valor a un string. Idempotente. */
export function maskSensitiveString(input: string): string {
  const value = input.length > MAX_STRING_CHARS ? input.slice(0, MAX_STRING_CHARS) : input;
  return value
    .replace(JWT_PATTERN, "[jwt]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(SERIALIZED_PAIR_PATTERN, `$1$2${REDACTED}$2`)
    .replace(QUERY_SECRET_PATTERN, `$1${REDACTED}`)
    .replace(EMAIL_PATTERN, "$1***@$2")
    .replace(RIF_PATTERN, "[id-fiscal]")
    .replace(PHONE_PATTERN, "[telefono]");
}

interface SanitizeContext {
  seen: WeakSet<object>;
  nodes: number;
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function sanitizeNode(value: unknown, depth: number, ctx: SanitizeContext): unknown {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") return maskSensitiveString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return `[${typeof value}]`;

  const obj = value as object;
  if (ctx.seen.has(obj)) return "[circular]";
  if (depth >= MAX_DEPTH || ctx.nodes >= MAX_NODES) return "[profundidad/tamaño máximo]";
  ctx.seen.add(obj);
  ctx.nodes++;

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: maskSensitiveString(obj.message),
      stack: obj.stack ? maskSensitiveString(obj.stack) : undefined,
    };
  }
  if (obj instanceof Date) return obj.toISOString();

  if (Array.isArray(obj)) {
    const head = obj.slice(0, MAX_ARRAY_ITEMS).map(item => sanitizeNode(item, depth + 1, ctx));
    if (obj.length > MAX_ARRAY_ITEMS) head.push(`…[+${obj.length - MAX_ARRAY_ITEMS} items]`);
    return head;
  }

  // Blob, File, FormData, nodos DOM, etc.: nunca se recorren.
  if (!isPlainObject(obj)) return `[${obj.constructor?.name ?? "object"}]`;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    out[key] = isSensitiveKey(key) ? REDACTED : sanitizeNode(child, depth + 1, ctx);
  }
  return out;
}

/** Devuelve una copia sanitizada de `value` (el original no se modifica). */
export function sanitizeForDebug<T = unknown>(value: T): T {
  return sanitizeNode(value, 0, { seen: new WeakSet(), nodes: 0 }) as T;
}
