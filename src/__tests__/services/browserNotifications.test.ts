import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestNotificationPermission, notifyBrowser } from "@/services/browserNotifications";

// Mock mínimo con tipado laxo a propósito: la Notification API real tiene
// `permission` como propiedad estática del constructor y `requestPermission`
// como método estático — reproducir eso con los tipos estrictos de vi.fn()
// agrega más ruido de casteo que valor; el contrato real se verifica en los
// tests (permission se lee/asigna, requestPermission/el constructor se invocan).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockNotificationCtor = any;

describe("browserNotifications", () => {
  let originalNotification: typeof Notification | undefined;
  let mockRequestPermission: ReturnType<typeof vi.fn>;
  let mockNotificationConstructor: MockNotificationCtor;
  let mockInstance: { close: ReturnType<typeof vi.fn>; onclick: (() => void) | null };

  beforeEach(() => {
    originalNotification = (window as unknown as { Notification?: typeof Notification }).Notification;
    mockRequestPermission = vi.fn().mockResolvedValue("granted");
    mockInstance = { close: vi.fn(), onclick: null };

    mockNotificationConstructor = vi.fn(function () {
      return mockInstance;
    });
    mockNotificationConstructor.permission = "default";
    mockNotificationConstructor.requestPermission = mockRequestPermission;

    (window as unknown as { Notification: unknown }).Notification = mockNotificationConstructor;
    Object.defineProperty(document, "hidden", { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    if (originalNotification) {
      (window as unknown as { Notification: unknown }).Notification = originalNotification;
    } else {
      delete (window as unknown as { Notification?: unknown }).Notification;
    }
    vi.restoreAllMocks();
  });

  describe("requestNotificationPermission", () => {
    it("pide permiso cuando el estado es 'default' (nunca decidido)", () => {
      mockNotificationConstructor.permission = "default";

      requestNotificationPermission();

      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });

    it("no vuelve a pedir permiso si ya fue concedido", () => {
      mockNotificationConstructor.permission = "granted";

      requestNotificationPermission();

      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it("no vuelve a pedir permiso si ya fue denegado", () => {
      mockNotificationConstructor.permission = "denied";

      requestNotificationPermission();

      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it("no explota si el navegador no soporta la Notification API", () => {
      delete (window as unknown as { Notification?: unknown }).Notification;

      expect(() => requestNotificationPermission()).not.toThrow();
    });
  });

  describe("notifyBrowser", () => {
    it("crea una notificación nativa cuando el permiso está concedido y la pestaña está oculta", () => {
      mockNotificationConstructor.permission = "granted";
      Object.defineProperty(document, "hidden", { value: true, configurable: true });

      notifyBrowser("Obra Test", "Rechazo de cuadro comparativo");

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Obra Test",
        expect.objectContaining({ body: "Rechazo de cuadro comparativo", tag: "ivoo-notification" }),
      );
    });

    it("NO crea notificación si el permiso no está concedido", () => {
      mockNotificationConstructor.permission = "default";
      Object.defineProperty(document, "hidden", { value: true, configurable: true });

      notifyBrowser("Obra Test", "Acción");

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });

    it("NO crea notificación si la pestaña está visible (regla acordada: toast en pantalla ya alcanza)", () => {
      mockNotificationConstructor.permission = "granted";
      Object.defineProperty(document, "hidden", { value: false, configurable: true });

      notifyBrowser("Obra Test", "Acción");

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });

    it("enfoca la ventana y cierra la notificación al hacer click", () => {
      mockNotificationConstructor.permission = "granted";
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      const focusSpy = vi.spyOn(window, "focus").mockImplementation(() => {});

      notifyBrowser("Obra Test", "Acción");
      mockInstance.onclick?.();

      expect(focusSpy).toHaveBeenCalledTimes(1);
      expect(mockInstance.close).toHaveBeenCalledTimes(1);
    });

    it("no explota si el navegador no soporta la Notification API", () => {
      delete (window as unknown as { Notification?: unknown }).Notification;

      expect(() => notifyBrowser("Obra Test", "Acción")).not.toThrow();
    });
  });
});
