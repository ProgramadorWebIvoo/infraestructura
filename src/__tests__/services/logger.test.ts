import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe("getErrorMessage", () => {
    it("extrae el mensaje de una instancia de Error", async () => {
      const { getErrorMessage } = await import("@/services/logger");
      expect(getErrorMessage(new Error("boom"))).toBe("boom");
    });

    it("retorna el string tal cual si error es un string", async () => {
      const { getErrorMessage } = await import("@/services/logger");
      expect(getErrorMessage("algo salió mal")).toBe("algo salió mal");
    });

    it("serializa objetos planos a JSON", async () => {
      const { getErrorMessage } = await import("@/services/logger");
      expect(getErrorMessage({ code: 500 })).toBe('{"code":500}');
    });

    it("usa el fallback si el objeto no es serializable (referencia circular)", async () => {
      const { getErrorMessage } = await import("@/services/logger");
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(getErrorMessage(circular, "fallback custom")).toBe("fallback custom");
    });

    it("usa el fallback por defecto si no se especifica uno", async () => {
      const { getErrorMessage } = await import("@/services/logger");
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(getErrorMessage(circular)).toBe("Error inesperado.");
    });
  });

  describe("en desarrollo (DEV)", () => {
    beforeEach(() => {
      vi.stubEnv("PROD", false);
    });

    it("logError escribe a console.error con el prefijo [IVOO]", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { logError } = await import("@/services/logger");

      logError("ctx", new Error("fail"), "extra");

      expect(spy).toHaveBeenCalledWith("[IVOO] ctx:", "fail", "extra");
    });

    it("logWarn escribe a console.warn", async () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { logWarn } = await import("@/services/logger");

      logWarn("ctx", "cuidado");

      expect(spy).toHaveBeenCalledWith("[IVOO] ctx:", "cuidado");
    });

    it("logInfo escribe a console.info", async () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const { logInfo } = await import("@/services/logger");

      logInfo("ctx", "dato");

      expect(spy).toHaveBeenCalledWith("[IVOO] ctx:", "dato");
    });
  });

  describe("en producción (PROD)", () => {
    beforeEach(() => {
      vi.stubEnv("PROD", true);
    });

    it("logError NO escribe a console", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { logError } = await import("@/services/logger");

      logError("ctx", new Error("fail"));

      expect(spy).not.toHaveBeenCalled();
    });

    it("logWarn NO escribe a console", async () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { logWarn } = await import("@/services/logger");

      logWarn("ctx", "cuidado");

      expect(spy).not.toHaveBeenCalled();
    });

    it("logInfo NO escribe a console", async () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const { logInfo } = await import("@/services/logger");

      logInfo("ctx", "dato");

      expect(spy).not.toHaveBeenCalled();
    });

    it("logError sigue notificando al errorSink configurado", async () => {
      const { logError, setErrorSink } = await import("@/services/logger");
      const sink = vi.fn();
      setErrorSink(sink);

      const error = new Error("fail");
      logError("ctx", error);

      expect(sink).toHaveBeenCalledWith("ctx", error, "fail");
    });
  });

  describe("errorSink", () => {
    it("setErrorSink(null) desconecta el sink previamente configurado", async () => {
      const { logError, setErrorSink } = await import("@/services/logger");
      const sink = vi.fn();
      setErrorSink(sink);
      setErrorSink(null);

      logError("ctx", new Error("fail"));

      expect(sink).not.toHaveBeenCalled();
    });
  });
});
