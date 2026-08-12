import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { renderHook } from "@testing-library/react";
import type { AppNotification } from "@/types";
import { useNotifications, NotificationsProvider } from "@/components/UI/NotificationsProvider";

const mockUsePolling = vi.fn();
vi.mock("@/hooks/usePolling", () => ({
  usePolling: (...args: unknown[]) => mockUsePolling(...args),
}));

const mockUseAuth = vi.fn(() => ({ authToken: "token" }));
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
    details: null,
    read_at: null,
    created_at: "2026-08-12T10:00:00.000000Z",
    ...overrides,
  };
}

// useNotifications() ahora solo lee un contexto compartido — la lógica real
// (fetch, polling, toast) vive en useNotificationsSource(), instanciada UNA
// sola vez por <NotificationsProvider> (evita duplicar polling/toasts cuando
// NotificationBell se monta más de una vez, ver App.tsx). Los tests siguen
// ejercitando el comportamiento a través del hook público, envuelto en el provider.
function renderNotifications() {
  return renderHook(() => useNotifications(), {
    wrapper: ({ children }) => <NotificationsProvider>{children}</NotificationsProvider>,
  });
}

describe("useNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUsePolling.mockClear();
    mockApiFetch.mockClear();
    mockShowToast.mockClear();
    mockUseAuth.mockReturnValue({ authToken: "token" });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("sin authToken no consulta el endpoint", async () => {
    mockUseAuth.mockReturnValue({ authToken: "" });

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("activa polling de 8s con pauseWhenHidden=false cuando hay authToken", async () => {
    mockApiFetch.mockResolvedValue([]);

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    // pauseWhenHidden=false es intencional (regression test): las notifica-
    // ciones nativas del navegador (Notification API) exigen que el fetch
    // detecte la novedad MIENTRAS la pestaña sigue oculta — si el polling se
    // pausara en background (como el resto de pollings de la app), nunca se
    // dispararía nada mientras el usuario no mira la pestaña, y al volver ya
    // es tarde (notifyBrowser() exige document.hidden en el momento del disparo).
    expect(mockUsePolling).toHaveBeenCalledWith(expect.any(Function), 8_000, true, false);
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

  it("no dispara toast en la carga inicial (solo en polls posteriores)", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 }), makeNotification({ id: 2 })])
      .mockResolvedValueOnce({ count: 2 });

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("dispara un toast (variant notification) por cada notificación nueva detectada en un poll posterior", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 })])
      .mockResolvedValueOnce({ count: 1 });

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockUsePolling).toHaveBeenCalled();
    const pollCallback = mockUsePolling.mock.calls[0][0] as () => Promise<void>;

    mockApiFetch
      .mockResolvedValueOnce([
        makeNotification({ id: 1 }),
        makeNotification({ id: 2, project_title_snapshot: "Obra Nueva", action: "Rechazo de cuadro comparativo" }),
      ])
      .mockResolvedValueOnce({ count: 2 });

    await act(async () => {
      await pollCallback();
    });

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      "Obra Nueva — Rechazo de cuadro comparativo",
      "info",
      { variant: "notification" },
    );
  });

  it("no dispara toast en un poll si no hay notificaciones nuevas", async () => {
    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 })])
      .mockResolvedValueOnce({ count: 1 });

    renderNotifications();

    await act(async () => {
      await Promise.resolve();
    });

    const pollCallback = mockUsePolling.mock.calls[0][0] as () => Promise<void>;

    mockApiFetch
      .mockResolvedValueOnce([makeNotification({ id: 1 })])
      .mockResolvedValueOnce({ count: 1 });

    await act(async () => {
      await pollCallback();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("una sola instancia de NotificationsProvider comparte estado entre múltiples consumidores (fix de toasts/polling duplicados)", async () => {
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
  });
});