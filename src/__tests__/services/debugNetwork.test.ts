import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  applyNetworkProfile,
  simulatedDelayMs,
  createOfflineError,
  notifyConnectivity,
  NETWORK_PROFILES,
} from "@/utils/debugNetworkProfile";
import { applyDebugNetworkProfile } from "@/services/debugNetwork";
import { useDebugStore } from "@/stores/debugStore";
import { ApiError } from "@ivoo/shared";

describe("simulatedDelayMs", () => {
  it("none y offline no agregan latencia", () => {
    expect(simulatedDelayMs("none")).toBe(0);
    expect(simulatedDelayMs("offline")).toBe(0);
  });

  it("slow4g y 3g quedan dentro de base ± jitter", () => {
    for (const key of ["slow4g", "3g"] as const) {
      const { baseMs, jitterMs } = NETWORK_PROFILES[key];
      expect(simulatedDelayMs(key, () => 0)).toBe(baseMs - jitterMs);
      expect(simulatedDelayMs(key, () => 0.5)).toBe(baseMs);
      expect(simulatedDelayMs(key, () => 1)).toBe(baseMs + jitterMs);
    }
  });
});

describe("applyNetworkProfile", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("none resuelve de inmediato", async () => {
    await expect(applyNetworkProfile("none")).resolves.toBeUndefined();
  });

  it("slow4g espera la latencia simulada", async () => {
    let done = false;
    const promise = applyNetworkProfile("slow4g", { random: () => 0.5 }).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(399);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(done).toBe(true);
  });

  it("offline rechaza con un error de red que NO es ApiError (conserva la clave de idempotencia)", async () => {
    const error = await applyNetworkProfile("offline").catch(e => e);
    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error.message).toBe(createOfflineError().message);
  });

  it("respeta AbortSignal durante la espera y si ya venía abortado", async () => {
    const controller = new AbortController();
    const waiting = applyNetworkProfile("3g", { signal: controller.signal, random: () => 0.5 });
    const assertion = expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await assertion;

    await expect(applyNetworkProfile("3g", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("applyDebugNetworkProfile (integración con el store)", () => {
  beforeEach(() => {
    useDebugStore.setState({ enabled: true, paused: false, entries: [], dropped: 0, networkProfile: "none" });
  });

  it("no hace nada con el modo apagado aunque quede un perfil", async () => {
    useDebugStore.setState({ enabled: false, networkProfile: "offline" });
    await expect(applyDebugNetworkProfile("GET /x")).resolves.toBeUndefined();
  });

  it("offline bloquea, deja una entrada de red advertida y rechaza", async () => {
    useDebugStore.setState({ networkProfile: "offline" });
    await expect(applyDebugNetworkProfile("GET /projects")).rejects.toBeInstanceOf(TypeError);
    const [entry] = useDebugStore.getState().entries;
    expect(entry).toMatchObject({ kind: "http", level: "warn", category: "NETWORK" });
    expect(entry.label).toBe("GET /projects — bloqueado (offline simulado)");
  });
});

describe("conectividad (eventos online/offline)", () => {
  let events: string[];
  const record = (e: Event) => events.push(e.type);

  beforeEach(() => {
    events = [];
    window.addEventListener("offline", record);
    window.addEventListener("online", record);
    useDebugStore.setState({ enabled: true, networkProfile: "none" });
  });
  afterEach(() => {
    window.removeEventListener("offline", record);
    window.removeEventListener("online", record);
  });

  it("notifyConnectivity solo dispara al entrar/salir de offline", () => {
    notifyConnectivity("none", "slow4g");
    notifyConnectivity("none", "offline");
    notifyConnectivity("offline", "offline");
    notifyConnectivity("offline", "3g");
    expect(events).toEqual(["offline", "online"]);
  });

  it("apagar el modo con perfil offline restaura online y resetea el perfil", () => {
    useDebugStore.getState().setNetworkProfile("offline");
    expect(events).toEqual(["offline"]);

    useDebugStore.getState().setEnabled(false, { persist: false });
    expect(events).toEqual(["offline", "online"]);
    expect(useDebugStore.getState().networkProfile).toBe("none");
  });
});
