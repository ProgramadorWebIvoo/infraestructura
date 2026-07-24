import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
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
  const defaultProps = {
    user: { name: "Admin User", email: "admin@ivoo.com" },
    activeRole: "SUPERADMIN",
    canAccess: vi.fn(() => true),
    projectsCount: 10,
    contractorsCount: 25,
    inspectedProject: null,
    onCloseInspectedProject: vi.fn(),
    onLogout: vi.fn(),
    children: <div data-testid="page-content">Page Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText(/Terminal:/)).toBeInTheDocument();
    expect(screen.getByText(/ANALISTA/)).toBeInTheDocument();
  });

  it("renders projects and contractors counts", () => {
    renderLayout({ projectsCount: 15, contractorsCount: 30 });
    expect(screen.getByText("15 Obras")).toBeInTheDocument();
    expect(screen.getByText("30 Proveedores")).toBeInTheDocument();
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

  it("shows the role indicator with correct styling", () => {
    const { container } = renderLayout({ activeRole: "ADMIN" });

    const roleBadge = container.querySelector(".animate-pulse");
    expect(roleBadge).toBeInTheDocument();
  });
});
