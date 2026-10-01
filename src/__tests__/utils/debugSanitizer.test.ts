import { describe, it, expect } from "vitest";
import { sanitizeForDebug, maskSensitiveString, isSensitiveKey, REDACTED } from "@/utils/debugSanitizer";

describe("isSensitiveKey", () => {
  it.each(["password", "current_password", "newPassword", "passwordConfirmation", "accessToken", "x-refresh-token", "Authorization", "Set-Cookie", "X-XSRF-TOKEN", "api_key", "apiKey", "client_secret"])(
    "marca %s como sensible",
    key => {
      expect(isSensitiveKey(key)).toBe(true);
    },
  );

  it.each(["name", "status", "bypass", "passport_note", "compass", "projectId", "title"])("no marca %s", key => {
    // "passport"/"compass" contienen "pass" pero no "password": no deben enmascararse.
    expect(isSensitiveKey(key)).toBe(false);
  });
});

describe("sanitizeForDebug — por clave", () => {
  it("reemplaza el valor completo, incluso si es un objeto anidado", () => {
    const result = sanitizeForDebug({
      user: { name: "Ana", password: "abc123", nested: { token: { a: 1 } } },
      headers: { Authorization: "Bearer xyz", Accept: "application/json" },
    });
    expect(result.user.password).toBe(REDACTED);
    expect(result.user.nested.token).toBe(REDACTED);
    expect(result.user.name).toBe("Ana");
    expect(result.headers.Authorization).toBe(REDACTED);
    expect(result.headers.Accept).toBe("application/json");
  });

  it("no modifica el objeto original", () => {
    const original = { password: "abc" };
    sanitizeForDebug(original);
    expect(original.password).toBe("abc");
  });
});

describe("maskSensitiveString — por patrón de valor", () => {
  it("enmascara JWT y Bearer", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    expect(maskSensitiveString(`token=${jwt}`)).not.toContain("eyJhbGci");
    expect(maskSensitiveString("Authorization: Bearer abc.def-ghi")).toBe("Authorization: Bearer [redacted]");
  });

  it("enmascara pares password dentro de JSON serializado", () => {
    const masked = maskSensitiveString('{"email":"a@b.com","password":"hunter2","note":"ok"}');
    expect(masked).not.toContain("hunter2");
    expect(masked).toContain('"note":"ok"');
  });

  it("enmascara secretos en query-string", () => {
    expect(maskSensitiveString("/download?id=3&token=SECRETO&x=1")).toBe("/download?id=3&token=[redacted]&x=1");
  });

  it("enmascara emails conservando la inicial y el dominio", () => {
    expect(maskSensitiveString("contacto: maria.lopez@ivoo.com.ve")).toBe("contacto: m***@ivoo.com.ve");
  });

  it("enmascara RIF/cédula y teléfonos venezolanos", () => {
    expect(maskSensitiveString("RIF J-12345678-9")).toBe("RIF [id-fiscal]");
    expect(maskSensitiveString("tel 0414-1234567")).toBe("tel [telefono]");
  });

  it("NO toca IDs de la app, UUIDs, fechas ni montos", () => {
    const safe = "PRJ-001 MAT-12 3f2504e0-4f89-11d3-9a0c-0305e82c3301 2026-10-01T10:00:00Z 1234567.89 CON-DEBUG";
    expect(maskSensitiveString(safe)).toBe(safe);
  });

  it("es idempotente", () => {
    const once = maskSensitiveString("a@b.com Bearer abc J-12345678-9");
    expect(maskSensitiveString(once)).toBe(once);
  });
});

describe("sanitizeForDebug — robustez", () => {
  it("tolera ciclos", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    expect(sanitizeForDebug(a).self).toBe("[circular]");
  });

  it("corta por profundidad", () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 20; i++) deep = { next: deep };
    expect(JSON.stringify(sanitizeForDebug(deep))).toContain("profundidad");
  });

  it("limita arrays enormes y reporta cuántos items se omitieron", () => {
    const result = sanitizeForDebug(Array.from({ length: 1000 }, (_, i) => i));
    expect(result).toHaveLength(201);
    expect(result[200]).toBe("…[+800 items]");
  });

  it("serializa Error sin filtrar tokens del mensaje", () => {
    const err = new Error("falló /x?token=SECRETO");
    const result = sanitizeForDebug(err) as { message: string };
    expect(result.message).toBe("falló /x?token=[redacted]");
  });

  it("no recorre objetos no planos (Blob, Date) ni claves peligrosas", () => {
    const polluted = JSON.parse('{"__proto__":{"x":1},"ok":1}');
    expect(Object.keys(sanitizeForDebug(polluted))).toEqual(["ok"]);
    expect(sanitizeForDebug({ blob: new Blob(["a"]) }).blob).toBe("[Blob]");
    expect(sanitizeForDebug(new Date("2026-10-01T00:00:00Z"))).toBe("2026-10-01T00:00:00.000Z");
  });

  it("deja pasar primitivos", () => {
    expect(sanitizeForDebug(null)).toBeNull();
    expect(sanitizeForDebug(42)).toBe(42);
    expect(sanitizeForDebug(true)).toBe(true);
  });
});
