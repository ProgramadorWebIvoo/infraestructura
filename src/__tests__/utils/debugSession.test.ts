import { describe, it, expect, beforeEach } from "vitest";
import {
  buildSessionExport,
  parseSessionImport,
  MAX_IMPORT_BYTES,
  SESSION_SCHEMA,
} from "@/utils/debugSession";
import { useDebugStore, type DebugEntry } from "@/stores/debugStore";
import { useDebugReviewStore } from "@/stores/debugReviewStore";

function liveEntry(overrides: Partial<DebugEntry> = {}): DebugEntry {
  return { id: 1, kind: "http", category: "NETWORK", timestamp: 1_700_000_000_000, label: "GET /x — 200", searchText: "get /x — 200", ...overrides };
}

const validFile = (entries: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ schema: SESSION_SCHEMA, version: 1, exportedAt: "2026-10-01T10:00:00.000Z", app: { version: "1.0.0", mode: "development" }, entries, ...extra });

describe("export → import (ida y vuelta)", () => {
  it("conserva las entradas y recalcula id y searchText", () => {
    const exported = buildSessionExport(
      [liveEntry({ id: 77, level: "warn", durationMs: 12, detail: { status: 200 }, searchText: "texto-falso" })],
      { version: "1.0.0", mode: "development" },
      new Date("2026-10-01T10:00:00Z"),
    );
    const parsed = parseSessionImport(JSON.stringify(exported));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const [entry] = parsed.session.entries;
    expect(entry).toMatchObject({ id: 1, kind: "http", category: "NETWORK", level: "warn", durationMs: 12, label: "GET /x — 200", detail: { status: 200 } });
    expect(entry.searchText).toContain("get /x");
    expect(entry.searchText).not.toContain("texto-falso");
    expect(parsed.session.app).toEqual({ version: "1.0.0", mode: "development" });
  });
});

describe("parseSessionImport — rechazos", () => {
  it.each([
    ["no es JSON", "esto no es json", /JSON válido/],
    ["no es una sesión del DEBUG-MODE", JSON.stringify({ hola: 1 }), /Formato no reconocido/],
    ["es un array suelto", JSON.stringify([liveEntry()]), /Formato no reconocido/],
    ["versión no soportada", validFile([], { version: 9 }), /no soportada/],
    ["entries no es lista", validFile([], { entries: "x" }), /lista de eventos/],
  ])("%s", (_name, text, message) => {
    const parsed = parseSessionImport(text as string);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(message as RegExp);
  });

  it("rechaza más de 300 eventos", () => {
    const parsed = parseSessionImport(validFile(Array.from({ length: 301 }, () => liveEntry())));
    expect(parsed.ok).toBe(false);
  });

  it("rechaza texto por encima del tope de tamaño", () => {
    const parsed = parseSessionImport("x".repeat(MAX_IMPORT_BYTES + 1));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/supera/);
  });
});

describe("parseSessionImport — datos no confiables", () => {
  it("omite entradas con kind/level/timestamp/label inválidos y las cuenta", () => {
    const parsed = parseSessionImport(
      validFile([
        liveEntry(),
        { ...liveEntry(), kind: "hack" },
        { ...liveEntry(), level: "critical" },
        { ...liveEntry(), timestamp: "ayer" },
        { ...liveEntry(), label: 42 },
        "basura",
        null,
      ]),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.session.entries).toHaveLength(1);
      expect(parsed.skipped).toBe(6);
    }
  });

  it("re-sanea secretos que vengan en el archivo y descarta claves peligrosas", () => {
    const parsed = parseSessionImport(
      validFile([
        {
          ...liveEntry(),
          label: "POST /login maria@ivoo.com",
          detail: JSON.parse('{"password":"hunter2","__proto__":{"admin":true},"nota":"Bearer abc.def"}'),
        },
      ]),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const serialized = JSON.stringify(parsed.session.entries);
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("maria@ivoo.com");
    expect(serialized).not.toContain("Bearer abc");
    expect(serialized).not.toContain("admin");
  });

  it("acota el label y el searchText aunque el archivo traiga valores enormes", () => {
    const parsed = parseSessionImport(validFile([{ ...liveEntry(), label: "a".repeat(5000), searchText: "z".repeat(1_000_000) }]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.session.entries[0].label.length).toBeLessThanOrEqual(500);
    expect(parsed.session.entries[0].searchText.length).toBeLessThanOrEqual(400);
  });

  it("ignora una categoría fuera de la whitelist y usa la derivada del kind", () => {
    const parsed = parseSessionImport(validFile([{ ...liveEntry(), category: "ROOT" }]));
    expect(parsed.ok && parsed.session.entries[0].category).toBe("NETWORK");
  });

  it("no ejecuta ni interpreta HTML: el label queda como texto", () => {
    const parsed = parseSessionImport(validFile([{ ...liveEntry(), label: "<img src=x onerror=alert(1)>" }]));
    expect(parsed.ok && parsed.session.entries[0].label).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("buffer de revisión separado del vivo", () => {
  beforeEach(() => {
    useDebugStore.setState({ enabled: true, paused: false, entries: [], dropped: 0 });
    useDebugReviewStore.getState().close();
  });

  it("push no escribe en la sesión de revisión y cerrar no toca la captura en vivo", () => {
    const parsed = parseSessionImport(validFile([liveEntry()]));
    if (!parsed.ok) throw new Error("debía ser válida");
    useDebugReviewStore.getState().open(parsed.session);

    useDebugStore.getState().push({ kind: "log", label: "en vivo" });
    expect(useDebugReviewStore.getState().session?.entries).toHaveLength(1);
    expect(useDebugStore.getState().entries).toHaveLength(1);

    useDebugReviewStore.getState().close();
    expect(useDebugReviewStore.getState().session).toBeNull();
    expect(useDebugStore.getState().entries).toHaveLength(1);
  });
});
