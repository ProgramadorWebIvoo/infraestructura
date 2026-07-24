import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SidebarNav from "../../../components/UI/SidebarNav";

// ── Helpers ──────────────────────────────────────────────────────────────────
function renderSidebar(props: Partial<Parameters<typeof SidebarNav>[0]> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    user: { name: "Juan Pérez", email: "juan@ivoo.com" },
    onLogout: vi.fn(),
    canAccess: vi.fn(() => true),
  };

  return render(
    <MemoryRouter>
      <SidebarNav {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("SidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the IVOO brand", () => {
    renderSidebar();
    expect(screen.getByText("IVOO")).toBeInTheDocument();
    expect(screen.getByText("Gestión")).toBeInTheDocument();
  });

  it("renders user info with initials", () => {
    renderSidebar({ user: { name: "Juan Pérez", email: "juan@ivoo.com" } });
    expect(screen.getByText("JP")).toBeInTheDocument(); // initials
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("juan@ivoo.com")).toBeInTheDocument();
  });

  it("shows '?' for initials when user has no name", () => {
    renderSidebar({ user: { name: "", email: "" } });
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders navigation links based on canAccess", () => {
    const canAccess = vi.fn((path: string) => path === "/presidencia" || path === "/infraestructura");

    renderSidebar({ canAccess });

    expect(screen.getByText("Presidencia")).toBeInTheDocument();
    expect(screen.getByText("Infra / Mant")).toBeInTheDocument();
    expect(screen.queryByText("Cierre Obra")).not.toBeInTheDocument();
    expect(screen.queryByText("Procura")).not.toBeInTheDocument();
    expect(screen.queryByText("Analistas")).not.toBeInTheDocument();
    expect(screen.queryByText("Finanzas")).not.toBeInTheDocument();
    expect(screen.queryByText("Proveedores")).not.toBeInTheDocument();
  });

  it("renders all navigation links when canAccess returns true for all", () => {
    renderSidebar();

    expect(screen.getByText("Presidencia")).toBeInTheDocument();
    expect(screen.getByText("Infra / Mant")).toBeInTheDocument();
    expect(screen.getByText("Cierre Obra")).toBeInTheDocument();
    expect(screen.getByText("Procura")).toBeInTheDocument();
    expect(screen.getByText("Analistas")).toBeInTheDocument();
    expect(screen.getByText("Finanzas")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
  });

  it("renders configuration button when canAccess('/usuarios') is true", () => {
    renderSidebar({ canAccess: vi.fn((path) => path === "/usuarios" || path === "/presidencia") });

    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByText("Presidencia")).toBeInTheDocument();
  });

  it("does not render configuration section when canAccess('/usuarios') is false", () => {
    const canAccess = vi.fn(() => false);

    renderSidebar({ canAccess });

    expect(screen.queryByText("Configuración")).not.toBeInTheDocument();
  });

  it("toggles configuration dropdown when button is clicked", () => {
    renderSidebar();

    const configBtn = screen.getByText("Configuración");
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument(); // sub-items hidden

    fireEvent.click(configBtn);
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    // "Proveedores" appears both as main nav link and config sub-item
    expect(screen.getAllByText("Proveedores").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.getByText("Modelos de IA")).toBeInTheDocument();

    fireEvent.click(configBtn);
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("renders logout button and calls onLogout on click", () => {
    const onLogout = vi.fn();
    renderSidebar({ onLogout });

    const logoutBtn = screen.getByText("Cerrar Sesión");
    expect(logoutBtn).toBeInTheDocument();

    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked on mobile", () => {
    const onClose = vi.fn();
    renderSidebar({ isOpen: true, onClose });

    // The backdrop is only visible when isOpen is true (has pointer-events-auto class)
    const backdrop = document.querySelector(".fixed.inset-0");
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledOnce();
    }
  });

  it("calls onClose when close button is clicked on mobile", () => {
    const onClose = vi.fn();
    renderSidebar({ isOpen: true, onClose });

    const closeBtn = screen.getByLabelText("Cerrar menú lateral");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("sidebar is hidden when isOpen is false (on mobile)", () => {
    const { container } = renderSidebar({ isOpen: false });

    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("-translate-x-full");
  });

  it("sidebar is visible when isOpen is true (on mobile)", () => {
    const { container } = renderSidebar({ isOpen: true });

    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("translate-x-0");
  });

  it("has aria-label on nav element", () => {
    renderSidebar();
    expect(screen.getByLabelText("Menú principal")).toBeInTheDocument();
  });

  it("logout button has role='menuitem'", () => {
    renderSidebar();
    expect(screen.getByRole("menuitem")).toHaveTextContent("Cerrar Sesión");
  });

  it("configuration dropdown button has aria-expanded", () => {
    renderSidebar();

    const configBtn = screen.getByText("Configuración").closest("button")!;
    expect(configBtn.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(configBtn);
    expect(configBtn.getAttribute("aria-expanded")).toBe("true");
  });

  it("NavLinks have correct 'to' paths", () => {
    renderSidebar();

    expect(screen.getByText("Presidencia").closest("a")).toHaveAttribute("href", "/presidencia");
    expect(screen.getByText("Infra / Mant").closest("a")).toHaveAttribute("href", "/infraestructura");
    expect(screen.getByText("Cierre Obra").closest("a")).toHaveAttribute("href", "/cierre-obra");
    expect(screen.getByText("Procura").closest("a")).toHaveAttribute("href", "/procura");
    expect(screen.getByText("Analistas").closest("a")).toHaveAttribute("href", "/analistas");
    expect(screen.getByText("Finanzas").closest("a")).toHaveAttribute("href", "/finanzas");
    expect(screen.getByText("Proveedores").closest("a")).toHaveAttribute("href", "/catalogos");

    // Open config to check sub-items
    fireEvent.click(screen.getByText("Configuración"));
    expect(screen.getByText("Usuarios").closest("a")).toHaveAttribute("href", "/usuarios");
    // The config "Proveedores" (second occurrence) goes to /config-proveedores
    const proveedoresLinks = screen.getAllByText("Proveedores");
    const configProveedoresLink = proveedoresLinks[1].closest("a");
    expect(configProveedoresLink).toHaveAttribute("href", "/config-proveedores");
    expect(screen.getByText("Material").closest("a")).toHaveAttribute("href", "/config-materiales");
    expect(screen.getByText("Modelos de IA").closest("a")).toHaveAttribute("href", "/config-ia");
  });

  it("closes sidebar when a NavLink is clicked", () => {
    const onClose = vi.fn();
    renderSidebar({ onClose });

    fireEvent.click(screen.getByText("Presidencia"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
