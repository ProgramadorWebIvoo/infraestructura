import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SidebarNav from "@/components/UI/SidebarNav";
import { __resetPrefetchStateForTests } from "@/hooks/usePrefetchOnIntent";

vi.mock("../../../components/UI/NotificationsProvider", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

// Mock del registro real de pre-fetch: los NavLink de este sidebar disparan
// usePrefetchOnIntent en hover/focus (ver SidebarNav.tsx) — acá se verifica
// que el enganche real (evento DOM -> handler -> loadChunk) funciona, sin
// importar de verdad los chunks pesados de cada vista.
const { loadChunkPresidencia } = vi.hoisted(() => ({
  loadChunkPresidencia: vi.fn(() => Promise.resolve({ default: () => null })),
}));
vi.mock("@/routes/prefetchRegistry", () => ({
  ROUTE_PREFETCH: {
    "/presidencia": { loadChunk: loadChunkPresidencia },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function renderSidebar(props: Partial<Parameters<typeof SidebarNav>[0]> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    user: { name: "Juan Pérez", email: "juan@ivoo.com" },
    activeRole: "ANALISTA",
    onLogout: vi.fn(),
    canAccess: vi.fn(() => true),
    authToken: "authenticated",
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
  };

  // usePrefetchOnIntent (hover/focus prefetch de datos, ver
  // src/hooks/usePrefetchOnIntent.ts) necesita un QueryClient ancestro —
  // una instancia nueva por render, sin retry, para no reintentar en tests.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SidebarNav {...defaultProps} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("SidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPrefetchStateForTests();
    // jsdom reporta document.hidden = true por defecto (no refleja el
    // comportamiento real de un navegador, donde una pestaña cargada y
    // visible es hidden=false) — sin esto, el guard de "pestaña en
    // background" de usePrefetchOnIntent bloquearía todo prefetch en tests.
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("precarga el chunk de la ruta al pasar el mouse sobre su link (debounced)", async () => {
    vi.useFakeTimers();
    renderSidebar();

    const presidenciaLink = screen.getByText("Presidencia").closest("a")!;
    fireEvent.mouseEnter(presidenciaLink);
    await vi.advanceTimersByTimeAsync(200);

    expect(loadChunkPresidencia).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("un hover fugaz (mouseLeave antes del debounce) no precarga nada", async () => {
    vi.useFakeTimers();
    renderSidebar();

    const presidenciaLink = screen.getByText("Presidencia").closest("a")!;
    fireEvent.mouseEnter(presidenciaLink);
    fireEvent.mouseLeave(presidenciaLink);
    await vi.advanceTimersByTimeAsync(200);

    expect(loadChunkPresidencia).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("renders the IVOO brand (company logo + Gestión label)", () => {
    renderSidebar();
    expect(screen.getByAltText("IVOO")).toBeInTheDocument();
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
    expect(screen.queryByText("Auditoría")).not.toBeInTheDocument();
    expect(screen.queryByText("Procura")).not.toBeInTheDocument();
    expect(screen.queryByText("Analistas")).not.toBeInTheDocument();
    expect(screen.queryByText("Finanzas")).not.toBeInTheDocument();
    expect(screen.queryByText("Proveedores")).not.toBeInTheDocument();
  });

  it("renders all navigation links when canAccess returns true for all", () => {
    renderSidebar();

    expect(screen.getByText("Presidencia")).toBeInTheDocument();
    expect(screen.getByText("Infra / Mant")).toBeInTheDocument();
    expect(screen.getByText("Auditoría")).toBeInTheDocument();
    expect(screen.getByText("Procura")).toBeInTheDocument();
    expect(screen.getByText("Analistas")).toBeInTheDocument();
    expect(screen.getByText("Finanzas")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
  });

  it("renders configuration link when canAccess('/usuarios') is true", () => {
    renderSidebar({ canAccess: vi.fn((path) => path === "/usuarios" || path === "/presidencia") });

    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByText("Presidencia")).toBeInTheDocument();
  });

  it("does not render configuration link when the user has no access to any of its tabs", () => {
    const canAccess = vi.fn(() => false);

    renderSidebar({ canAccess });

    expect(screen.queryByText("Configuración")).not.toBeInTheDocument();
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

  it("NavLinks have correct 'to' paths", () => {
    renderSidebar();

    expect(screen.getByText("Presidencia").closest("a")).toHaveAttribute("href", "/presidencia");
    expect(screen.getByText("Infra / Mant").closest("a")).toHaveAttribute("href", "/infraestructura");
    expect(screen.getByText("Auditoría").closest("a")).toHaveAttribute("href", "/auditoria");
    expect(screen.getByText("Procura").closest("a")).toHaveAttribute("href", "/procura");
    expect(screen.getByText("Analistas").closest("a")).toHaveAttribute("href", "/analistas");
    expect(screen.getByText("Finanzas").closest("a")).toHaveAttribute("href", "/finanzas");
    expect(screen.getByText("Proveedores").closest("a")).toHaveAttribute("href", "/catalogos");
    expect(screen.getByText("Configuración").closest("a")).toHaveAttribute("href", "/config-app");
  });

  it("closes sidebar when a NavLink is clicked", () => {
    const onClose = vi.fn();
    renderSidebar({ onClose });

    fireEvent.click(screen.getByText("Presidencia"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ── Collapsed state ─────────────────────────────────────────────────────────
  it("calls onToggleCollapse when collapse button is clicked", () => {
    const onToggleCollapse = vi.fn();
    renderSidebar({ isCollapsed: false, onToggleCollapse });

    const toggle = screen.getByLabelText("Minimizar barra de navegación");
    fireEvent.click(toggle);
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it("mobile drawer (isOpen=true) always renders expanded content even when isCollapsed=true", () => {
    // Bug real reportado en QA: isCollapsed es una preferencia de desktop
    // persistida en localStorage; el drawer mobile heredaba ese valor y se
    // abría viéndose "colapsado" (rail angosto) en vez de a ancho completo.
    const { container } = renderSidebar({ isCollapsed: true, isOpen: true });

    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("w-64");
    expect(aside?.className).not.toMatch(/(?<!lg:)w-16/);

    // El logo completo (no el tile colapsado) y el texto de marca deben verse.
    expect(screen.getByAltText("IVOO")).toBeInTheDocument();
    expect(screen.getByText("Gestión")).toBeInTheDocument();

    const presidencia = screen.getByText("Presidencia").closest("a")!;
    expect(presidencia.className).toContain("px-3");
    expect(presidencia.className).toContain("gap-3");
  });

  it("desktop collapsed rail (isOpen=false) still renders the narrow layout", () => {
    const { container } = renderSidebar({ isCollapsed: true, isOpen: false });

    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("lg:w-16");
    expect(screen.queryByAltText("IVOO")).not.toBeInTheDocument();
  });

  it("SidebarNav renders a single NotificationBell (the AuthenticatedLayout integration test covers no duplicate with MobileTopBar)", () => {
    renderSidebar({ isCollapsed: false, isOpen: true });

    expect(screen.getAllByLabelText(/Notificaciones/).length).toBe(1);
  });

  it("collapse button exposes the correct action for the current state", () => {
    const { unmount } = renderSidebar({ isCollapsed: false });
    expect(screen.getByLabelText("Minimizar barra de navegación")).toBeInTheDocument();
    unmount();

    renderSidebar({ isCollapsed: true, isOpen: false });
    expect(screen.getByLabelText("Expandir barra de navegación")).toBeInTheDocument();
  });

  it("collapsed sidebar narrows to w-16 and centers icons (no px/gap offset)", () => {
    const { container } = renderSidebar({ isCollapsed: true, isOpen: false });

    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("w-16");

    const presidencia = screen.getByText("Presidencia").closest("a")!;
    expect(presidencia.className).toContain("justify-center");
    expect(presidencia.className).toContain("px-0");
    expect(presidencia.className).toContain("gap-0");
    expect(presidencia.className).not.toContain("px-3");
    expect(presidencia.className).not.toContain("gap-3");
  });

  it("expanded sidebar uses full width layout with text visible", () => {
    const { container } = renderSidebar({ isCollapsed: false });

    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("w-64");

    const presidencia = screen.getByText("Presidencia").closest("a")!;
    expect(presidencia.className).toContain("px-3");
    expect(presidencia.className).toContain("gap-3");
  });

  it("collapsed sidebar hides text labels and brand wordmark", () => {
    renderSidebar({ isCollapsed: true, isOpen: false });

    const presidencia = screen.getByText("Presidencia");
    expect(presidencia.className).toContain("max-w-0");
    expect(presidencia.className).toContain("opacity-0");
    expect(screen.queryByText("Gestión")).not.toBeInTheDocument();
    expect(screen.queryByText("Construyendo con propósito")).not.toBeInTheDocument();
  });

  it("expanded sidebar shows animated labels at full width", () => {
    renderSidebar({ isCollapsed: false });

    const presidencia = screen.getByText("Presidencia");
    expect(presidencia.className).toContain("max-w-40");
    expect(presidencia.className).toContain("opacity-100");
  });

  it("collapsed sidebar centers config link and hides its label", () => {
    renderSidebar({ isCollapsed: true, isOpen: false });

    const configLink = screen.getByText("Configuración").closest("a")!;
    expect(configLink.className).toContain("justify-center");
    expect(configLink.className).toContain("px-0");
    expect(configLink.className).not.toContain("px-3");

    const label = screen.getByText("Configuración");
    expect(label.className).toContain("max-w-0");
    expect(label.className).toContain("opacity-0");
  });

  it("collapsed sidebar centers user avatar and logout icon", () => {
    renderSidebar({ isCollapsed: true, isOpen: false });

    const logoutBtn = screen.getByText("Cerrar Sesión").closest("button")!;
    expect(logoutBtn.className).toContain("justify-center");
    expect(logoutBtn.className).toContain("px-0");

    const userRow = screen.getByText("JP").parentElement!;
    expect(userRow.className).toContain("justify-center");
    expect(userRow.className).toContain("px-0");
  });
});
