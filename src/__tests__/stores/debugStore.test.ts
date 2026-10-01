import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useDebugStore, pushDebugEntry, prepareForDebug } from "@/stores/debugStore";
import { installGlobalErrorCapture } from "@/stores/debugCapture";
import { resolveDebugGuardAction, canUseDebugMode } from "@/hooks/useDebugModeGuard";

describe("debugStore.push", () => {
  beforeEach(() => {
    useDebugStore.setState({ enabled: true, paused: false, entries: [] });
  });

  it("sanea label y detail antes de entrar al buffer", () => {
    pushDebugEntry({
      kind: "http",
      label: "POST /login a@b.com",
      detail: { requestBody: { email: "a@b.com", password: "hunter2" }, requestHeaders: { Authorization: "Bearer abc" } },
    });
    const [entry] = useDebugStore.getState().entries;
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("Bearer abc");
    expect(serialized).not.toContain("a@b.com");
    expect(entry.searchText).not.toContain("hunter2");
  });

  it("no captura con el modo apagado", () => {
    useDebugStore.setState({ enabled: false });
    pushDebugEntry({ kind: "log", label: "x" });
    expect(useDebugStore.getState().entries).toHaveLength(0);
  });

  it("setEnabled(false, { persist:false }) apaga en memoria sin tocar localStorage", () => {
    window.localStorage.setItem("ivoo_debug_mode", "1");
    useDebugStore.getState().setEnabled(false, { persist: false });
    expect(useDebugStore.getState().enabled).toBe(false);
    expect(window.localStorage.getItem("ivoo_debug_mode")).toBe("1");
    useDebugStore.getState().setEnabled(false);
    expect(window.localStorage.getItem("ivoo_debug_mode")).toBe("0");
  });
});

describe("prepareForDebug", () => {
  it("sanea ANTES de truncar: un payload grande no deja el password dentro del preview", () => {
    const big = { password: "hunter2", rows: Array.from({ length: 5000 }, (_, i) => ({ i, text: "x".repeat(20) })) };
    const result = prepareForDebug(big) as { preview?: string };
    expect(JSON.stringify(result)).not.toContain("hunter2");
  });
});

describe("installGlobalErrorCapture", () => {
  beforeEach(() => {
    useDebugStore.setState({ enabled: true, paused: false, entries: [] });
  });
  afterEach(() => vi.restoreAllMocks());

  it("captura mientras está instalado y se remueve por completo con dispose", () => {
    const dispose = installGlobalErrorCapture();
    window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
    expect(useDebugStore.getState().entries).toHaveLength(1);

    dispose();
    window.dispatchEvent(new ErrorEvent("error", { message: "after" }));
    expect(useDebugStore.getState().entries).toHaveLength(1);
  });

  it("conteo de referencias: doble instalación (StrictMode) no duplica ni remueve antes de tiempo", () => {
    const first = installGlobalErrorCapture();
    const second = installGlobalErrorCapture();
    window.dispatchEvent(new ErrorEvent("error", { message: "once" }));
    expect(useDebugStore.getState().entries).toHaveLength(1);

    first();
    first(); // dispose idempotente
    window.dispatchEvent(new ErrorEvent("error", { message: "still" }));
    expect(useDebugStore.getState().entries).toHaveLength(2);

    second();
    window.dispatchEvent(new ErrorEvent("error", { message: "gone" }));
    expect(useDebugStore.getState().entries).toHaveLength(2);
  });
});

describe("resolveDebugGuardAction", () => {
  const base = { enabled: true, hasSession: true, activeRole: "ADMIN", isLoadingPermissions: false };

  it("no actúa con el modo apagado ni mientras cargan permisos", () => {
    expect(resolveDebugGuardAction({ ...base, enabled: false })).toBe("none");
    expect(resolveDebugGuardAction({ ...base, activeRole: "PROCURA", isLoadingPermissions: true })).toBe("none");
  });

  it("no apaga por un rol aún sin resolver (estado transitorio)", () => {
    expect(resolveDebugGuardAction({ ...base, activeRole: null })).toBe("none");
    expect(resolveDebugGuardAction({ ...base, activeRole: undefined })).toBe("none");
  });

  it("limpia el buffer en logout y conserva la preferencia", () => {
    expect(resolveDebugGuardAction({ ...base, hasSession: false, activeRole: null })).toBe("clear");
  });

  it("apaga si el rol resuelto no tiene acceso; mantiene ADMIN/SUPERADMIN", () => {
    expect(resolveDebugGuardAction({ ...base, activeRole: "FINANZAS" })).toBe("disable");
    expect(resolveDebugGuardAction({ ...base, activeRole: "ADMIN" })).toBe("none");
    expect(resolveDebugGuardAction({ ...base, activeRole: "SUPERADMIN" })).toBe("none");
    expect(canUseDebugMode("RESIDENTE")).toBe(false);
  });
});
