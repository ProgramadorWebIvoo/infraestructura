import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { renderHook } from "@testing-library/react";
import type { AppNotification } from "@/types";
import { useNotifications, NotificationsProvider } from "@/components/UI/NotificationsProvider";

// Simula el Echo real lo suficiente para probar la suscripción: private()
// devuelve un canal con listen()/stopListening(), y el módulo expone el
// callback registrado para que el test lo dispare manualmente (equivalente
// a "el WS recibió un evento").
const mockChannelListen = vi.fn();
const mockEcho = {
  private: vi.fn(() => ({ listen: mockChannelListen })),
  leave: vi.fn(),
  disconnect: vi.fn(),
};
const mockCreateEchoClient = vi.fn(() => mockEcho);
vi.mock("@/services/echo", () => ({
  createEchoClient: () => mockCreateEchoClient(),
}));

type MockAuthUser = { id: number; name: string; email: string } | null;
const mockUseAuth = vi.fn<() => { authToken: string; authUser: MockAuthUser }>(() => ({
  authToken: "token",
  authUser: { id: 1, name: "Test", email: "t@t.com" },
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 1,
    project_id: "PRJ-001",
    project_title_snapshot: "Obra Test",
    action: "Creacion de peticion de obra",
    type: "informacion",
    details: null,
    read_at: null,
    created_at: "2026-08-12T10:00:00.000000Z",
    ...overrides,
  };
}

// useNotifications() ahora solo lee un contexto compartido — la lógica real
// (fetch inicial, suscripción WS, toast) vive en useNotificationsSource(),
// instanciada UNA sola vez por <NotificationsProvider> (evita duplicar
// conexiones/toasts cuando NotificationBell se monta más de una vez, ver
// App.tsx). Los tests siguen ejercitando el comportamiento a través del
// hook público, envuelto en el provider.
function renderNotifications() {
  return renderHook(() => useNotifications(), {
    wrapper: ({ children }) => <NotificationsProvider>{children}</NotificationsProvider>,
  });
}

/** Extrae el callback que la suscripción registró para "notification.created". */
function getListenCallback(): (payload: AppNotification) => void {
  const call = mockChannelListen.mock.calls.find(([event]) => event === ".notification.created");
  if (!call) throw new Error('Ningún listener registrado para ".notification.created"');
  return call[1] as (payload: AppNotification) => void;
}

describe("useNotifications", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockShowToast.mockClear();
    mockCreateEchoClient.mockClear();
    mockChannelListen.mockClear();
    mockEcho.private.mockClear();
    mockEcho.leave.mockClear();
    mockEcho.disconnect.mockClear();
    mockUseAuth.mockReturnValue({ authToken: "token", authUser: { id: 1, name: "Test", email: "t@t.com" } });
  });

  it("carga notificaciones y conteo de no leídas al montar", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification()])
      .mockResolvedValueOnce({ count: 3 });

    const { result } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(3);
    expect(result.current.isLoading).toBe(false);
  });

  it("sin authToken no consulta el endpoint ni abre conexión WebSocket", async () => {
    mockUseAuth.mockReturnValue({ authToken: "", authUser: null });

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockCreateEchoClient).not.toHaveBeenCalled();
  });

  it("se suscribe al canal privado App.Models.User.{id} cuando hay authToken y authUser", async () => {
    mockApiFetch.mockResolvedValue([]);

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCreateEchoClient).toHaveBeenCalled();
    expect(mockEcho.private).toHaveBeenCalledWith("App.Models.User.1");
    expect(mockChannelListen).toHaveBeenCalledWith(".notification.created", expect.any(Function));
  });

  it("markRead llama al endpoint PATCH y actualiza estado local", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 5 })])
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(undefined); // PATCH response

    const { result } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.markRead(5);
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/notifications/5/read", { method: "PATCH", token: "token" });
    expect(result.current.notifications[0].read_at).not.toBeNull();
    expect(result.current.unreadCount).toBe(0);
  });

  it("markAllRead llama al endpoint y limpia el contador", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification(), makeNotification({ id: 2 })])
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce(undefined); // PATCH response

    const { result } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/notifications/read-all", { method: "PATCH", token: "token" });
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every(n => n.read_at !== null)).toBe(true);
  });

  it("deleteNotification llama al endpoint DELETE y quita la notificación del estado local", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 5 })])
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(undefined); // DELETE response

    const { result } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.deleteNotification(5);
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/notifications/5", { method: "DELETE", token: "token" });
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it("deleteNotification de una notificación ya leída no descuenta el contador de no leídas", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 5, read_at: "2026-08-12T10:05:00.000000Z" })])
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce(undefined); // DELETE response

    const { result } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.deleteNotification(5);
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it("deleteAllNotifications llama al endpoint DELETE y vacía notificaciones y contador", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification(), makeNotification({ id: 2 })])
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce(undefined); // DELETE response

    const { result } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.deleteAllNotifications();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/notifications", { method: "DELETE", token: "token" });
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it("no dispara toast en la carga inicial", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 }), makeNotification({ id: 2 })])
      .mockResolvedValueOnce({ count: 2 });

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("dispara un toast (variant notification) al recibir una notificación por el canal WebSocket", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 })])
      .mockResolvedValueOnce({ count: 1 });

    const { result } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    const onNotificationCreated = getListenCallback();

    act(() => {
      onNotificationCreated(
        makeNotification({ id: 2, project_title_snapshot: "Obra Nueva", action: "Rechazo de cuadro comparativo" }),
      );
    });

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      "Obra Nueva — Rechazo de cuadro comparativo",
      "info",
      { variant: "notification" },
    );
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(2);
  });

  it("mapea el type del backend al AlertType correcto del toast", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 })])
      .mockResolvedValueOnce({ count: 1 });

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    const onNotificationCreated = getListenCallback();

    act(() => {
      onNotificationCreated(
        makeNotification({ id: 2, action: "Rechazo de cuadro comparativo", type: "accion_requerida" }),
      );
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining("Rechazo de cuadro comparativo"),
      "action-required",
      { variant: "notification" },
    );
  });

  it("limpia la suscripción (leave + disconnect) al desmontar", async () => {
    mockApiFetch.mockResolvedValue([]);

    const { unmount } = renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(mockEcho.leave).toHaveBeenCalledWith("App.Models.User.1");
    expect(mockEcho.disconnect).toHaveBeenCalled();
  });

  it("una sola instancia de NotificationsProvider comparte estado entre múltiples consumidores (fix de toasts/conexiones duplicadas)", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 })])
      .mockResolvedValueOnce({ count: 1 });

    function TwoConsumers() {
      const a = useNotifications();
      const b = useNotifications();
      return { a, b };
    }

    const { result } = renderHook(() => TwoConsumers(), {
      wrapper: ({ children }) => <NotificationsProvider>{children}</NotificationsProvider>,
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Ambos consumidores ven exactamente el mismo estado (misma referencia de
    // array) — si cada uno tuviera su propia instancia del hook fuente,
    // serían dos arrays con el mismo contenido pero distinta identidad.
    expect(result.current.a.notifications).toBe(result.current.b.notifications);
    expect(result.current.a.unreadCount).toBe(result.current.b.unreadCount);

    // apiFetch se llamó exactamente 2 veces (list + count) en total, no 4
    // (2 por consumidor) — confirma una sola instancia de useNotificationsSource.
    expect(mockApiFetch).toHaveBeenCalledTimes(2);

    // Idem para la conexión WebSocket: una sola suscripción, no dos.
    expect(mockCreateEchoClient).toHaveBeenCalledTimes(1);
  });
});
