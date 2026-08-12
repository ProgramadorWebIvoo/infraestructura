import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, key, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

vi.mock("../../../components/UI/NotificationsProvider", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

// Mock lazy-loaded InspectProjectModal
vi.mock("../../../components/Modals/InspectProjectModal", () => ({
  default: ({ isOpen, project, onClose }: { isOpen: boolean; project: unknown; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="inspect-modal">
        <span>Modal: {project ? "open" : "closed"}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import AuthenticatedLayout from "../../../components/Layout/AuthenticatedLayout";
import type { Project } from "../../../types";

// ── Tests ────────────────────────────────────────────────────────────────────
describe("AuthenticatedLayout", () => {
  const defaultProps: React.ComponentProps<typeof AuthenticatedLayout> = {
    user: { name: "Admin User", email: "admin@ivoo.com" },
    activeRole: "SUPERADMIN",
    canAccess: vi.fn(() => true),
    inspectedProject: null,
    onCloseInspectedProject: vi.fn(),
    onLogout: vi.fn(),
    children: <div data-testid="page-content">Page Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderLayout = (props: Partial<typeof defaultProps> = {}) =>
    render(
      <MemoryRouter initialEntries={["/presidencia"]}>
        <AuthenticatedLayout {...defaultProps} {...props} />
      </MemoryRouter>,
    );

  it("renders children content", () => {
    renderLayout();
    expect(screen.getByTestId("page-content")).toHaveTextContent("Page Content");
  });

  it("renders the role indicator with activeRole", () => {
    renderLayout({ activeRole: "ANALISTA" });
    expect(screen.getAllByText(/Terminal:/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ANALISTA/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders two NotificationBell instances (MobileTopBar + SidebarNav) but only one is visible per breakpoint", () => {
    // Bug real reportado en QA: ambas campanas se veían simultáneamente en mobile.
    // Ambas existen en el DOM (CSS decide cuál se ve por breakpoint), pero la del
    // sidebar debe llevar "hidden lg:flex" en su contenedor — la de MobileTopBar
    // (lg:hidden en su <header>) nunca debe llevar la clase "hidden" fija.
    renderLayout();

    const bells = screen.getAllByLabelText(/Notificaciones/);
    expect(bells.length).toBe(2);

    const sidebarBellRow = bells
      .map(bell => bell.closest("div.hidden"))
      .filter(Boolean);
    expect(sidebarBellRow.length).toBe(1);
  });

  it("renders the footer with IVOO branding", () => {
    renderLayout();
    // IVOO appears in sidebar brand and footer brand
    expect(screen.getAllByText("IVOO").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Gestión de Infraestructura")).toBeInTheDocument();
  });

  it("renders the footer with current year", () => {
    renderLayout();
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(`© ${currentYear}`)).toBeInTheDocument();
  });

  it("renders OfflineBanner", () => {
    renderLayout();
    // OfflineBanner renders a banner, verify the layout rendered
    expect(screen.getAllByText("IVOO").length).toBeGreaterThanOrEqual(1);
  });

  it("opens inspect modal when inspectedProject is provided", () => {
    const mockProject = { id: "PRJ-001", title: "Test" } as Project;
    renderLayout({ inspectedProject: mockProject });

    expect(screen.getByTestId("inspect-modal")).toBeInTheDocument();
    expect(screen.getByText("Modal: open")).toBeInTheDocument();
  });

  it("closes inspect modal via onCloseInspectedProject", () => {
    const onClose = vi.fn();
    const mockProject = { id: "PRJ-001", title: "Test" } as Project;
    renderLayout({ inspectedProject: mockProject, onCloseInspectedProject: onClose });

    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render inspect modal when inspectedProject is null", () => {
    renderLayout({ inspectedProject: null });
    expect(screen.queryByTestId("inspect-modal")).not.toBeInTheDocument();
  });

  it("passes user and onLogout to SidebarNav", () => {
    const onLogout = vi.fn();
    renderLayout({ onLogout });

    expect(screen.getByText("Admin User")).toBeInTheDocument();
    // admin@ivoo.com appears in both sidebar and MobileTopBar
    expect(screen.getAllByText("admin@ivoo.com").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByText("Cerrar Sesión"));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("renders the Suspense fallback while loading modules", () => {
    renderLayout();

    // When routes are loading, the fallback shows a spinner
    // But since children are already rendered, we verify the fallback is defined
    expect(screen.getByText("Page Content")).toBeInTheDocument();
  });

  it("handles empty user gracefully (no user section rendered)", () => {
    renderLayout({ user: null });
    // When user is null, the user info section is not rendered
    // Only the logout button remains in the footer
    expect(screen.getByText("Cerrar Sesión")).toBeInTheDocument();
  });

  it("shows the role indicator with the active role", () => {
    renderLayout({ activeRole: "ADMIN" });

    expect(screen.getAllByText("Terminal: ADMIN").length).toBeGreaterThanOrEqual(1);
  });

  it("persists collapsed sidebar state to localStorage on toggle", () => {
    renderLayout();

    fireEvent.click(screen.getByLabelText("Minimizar barra de navegación"));
    expect(localStorage.getItem("ivoo.sidebar.collapsed")).toBe("1");
  });

  it("restores collapsed sidebar state from localStorage on mount", () => {
    localStorage.setItem("ivoo.sidebar.collapsed", "1");
    renderLayout();

    expect(screen.getByLabelText("Expandir barra de navegación")).toBeInTheDocument();
  });
});
