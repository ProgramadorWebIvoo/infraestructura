import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AppNotification } from "@/types";
import NotificationBell from "@/components/UI/NotificationBell";

const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockUseNotifications = vi.fn();

vi.mock("@/components/UI/NotificationsProvider", () => ({
  useNotifications: () => mockUseNotifications(),
}));

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 1,
    project_id: "PRJ-001",
    project_title_snapshot: "Obra Test",
    action: "Rechazo de cuadro comparativo",
    type: "accion_requerida",
    details: "Motivo del rechazo",
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationBell", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    mockMarkRead.mockClear();
    mockMarkAllRead.mockClear();
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });
    document.body.style.overflow = "";
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.body.style.overflow = "";
  });

  it("no muestra el badge de contador cuando no hay no leídas", () => {
    render(<NotificationBell />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("muestra el contador de no leídas en el badge", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification()],
      unreadCount: 4,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationBell />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("muestra 9+ cuando el contador supera 9", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 15,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationBell />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("abre el dropdown al hacer click en la campana y muestra las notificaciones", () => {
    // Dos shells se montan simultáneamente (dropdown desktop + bottom sheet
    // mobile, CSS decide cuál se ve por breakpoint) — jsdom no evalúa media
    // queries, así que el contenido aparece duplicado; se verifica con getAllBy.
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification()],
      unreadCount: 1,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationBell />);

    fireEvent.click(screen.getByLabelText(/Notificaciones/));

    expect(screen.getAllByText("Obra Test").length).toBe(2);
    expect(screen.getAllByText("Rechazo de cuadro comparativo").length).toBe(2);
  });

  it("muestra 'Sin notificaciones' cuando la lista está vacía", () => {
    render(<NotificationBell />);

    fireEvent.click(screen.getByLabelText(/Notificaciones/));

    expect(screen.getAllByText("Sin notificaciones").length).toBe(2);
  });

  it("llama markRead al hacer click en el check de una notificación no leída", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification({ id: 7 })],
      unreadCount: 1,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText(/Notificaciones/));
    fireEvent.click(screen.getAllByLabelText("Marcar como leída")[0]);

    expect(mockMarkRead).toHaveBeenCalledWith(7);
  });

  it("llama markAllRead al hacer click en 'Marcar todas'", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification()],
      unreadCount: 1,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText(/Notificaciones/));
    fireEvent.click(screen.getAllByText("Marcar todas")[0]);

    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it("no muestra el botón 'Marcar todas' si no hay leídas pendientes", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification({ read_at: new Date().toISOString() })],
      unreadCount: 0,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText(/Notificaciones/));

    expect(screen.queryByText("Marcar todas")).not.toBeInTheDocument();
  });

  it("mobile sheet cierra al hacer click en el botón X y desktop dropdown en click-outside", async () => {
    mockUseNotifications.mockReturnValue({
      notifications: [makeNotification()],
      unreadCount: 1,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText(/Notificaciones/));
    expect(screen.getAllByText("Obra Test").length).toBe(2);

    fireEvent.click(screen.getByLabelText("Cerrar"));

    await waitFor(() => {
      expect(screen.queryAllByText("Obra Test").length).toBe(0);
    });
  });

  it("bloquea el scroll del body al abrir en mobile (viewport < lg)", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText(/Notificaciones/));

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("NO bloquea el scroll del body al abrir en desktop (viewport >= lg) — bug reportado por QA", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText(/Notificaciones/));

    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
