import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks para hooks ─────────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

const mockUseRoleAccess = vi.fn();
vi.mock("@/hooks/useRouting", () => ({
  useRoleAccess: (...args: unknown[]) => mockUseRoleAccess(...args),
}));

const mockUseProjects = vi.fn();
vi.mock("@/hooks/useProjects", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

const mockUseContractors = vi.fn();
vi.mock("@/hooks/useContractors", () => ({
  useContractors: (...args: unknown[]) => mockUseContractors(...args),
}));

const mockUseCatalog = vi.fn();
vi.mock("@/hooks/useCatalog", () => ({
  useCatalog: (...args: unknown[]) => mockUseCatalog(...args),
}));

// Mocks de vistas lazy
vi.mock("@/views/PresidenciaDashboard", () => ({
  default: () => <div data-testid="view-presidencia">Presidencia Dashboard</div>,
}));
vi.mock("@/views/InfraestructuraMantenimientoPanel", () => ({
  default: () => <div data-testid="view-infraestructura">Infraestructura Panel</div>,
}));
vi.mock("@/views/CierreObraPanel", () => ({
  default: () => <div data-testid="view-cierre">Cierre Obra Panel</div>,
}));
vi.mock("@/views/ProcuraPanel", () => ({
  default: () => <div data-testid="view-procura">Procura Panel</div>,
}));
vi.mock("@/views/AnalistasPanel", () => ({
  default: () => <div data-testid="view-analistas">Analistas Panel</div>,
}));
vi.mock("@/views/FinanzasPanel", () => ({
  default: () => <div data-testid="view-finanzas">Finanzas Panel</div>,
}));
vi.mock("@/views/MaterialesProveedores", () => ({
  default: (props: { contractorsCount: number }) => (
    <div data-testid="view-materiales-proveedores">Materiales Proveedores ({props.contractorsCount})</div>
  ),
}));
vi.mock("@/views/PropuestaMaterialesPublica", () => ({
  default: () => <div data-testid="view-propuesta-publica">Propuesta Pública</div>,
}));
vi.mock("@/views/LoginScreen", () => ({
  default: ({ onLogin }: { onLogin: () => void }) => (
    <div data-testid="view-login">
      Login Screen
      <button onClick={() => onLogin()}>Login</button>
    </div>
  ),
}));
vi.mock("@/views/ProveedoresRegistrados", () => ({
  default: () => <div data-testid="view-proveedores-registrados">Proveedores Registrados</div>,
}));
vi.mock("@/views/ProveedoresConfigPanel", () => ({
  default: () => <div data-testid="view-config-proveedores">Config Proveedores</div>,
}));
vi.mock("@/views/MaterialConfigPanel", () => ({
  default: () => <div data-testid="view-config-materiales">Config Materiales</div>,
}));
vi.mock("@/views/AIConfigPanel", () => ({
  default: () => <div data-testid="view-config-ia">Config IA</div>,
}));
vi.mock("@/views/UsuariosPanel", () => ({
  default: () => <div data-testid="view-usuarios">Usuarios Panel</div>,
}));

// Mock motion
vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// Mock react-dom portal
vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

// Mock Toast internals para evitar dependencia con el contexto real
vi.mock("@/components/UI/Toast", async () => {
  const actual = await vi.importActual<typeof import("@/components/UI/Toast")>("@/components/UI/Toast");
  return {
    ...actual,
    useToast: () => ({ showToast: vi.fn() }),
  };
});

import App from "../App";

// ── Helper ───────────────────────────────────────────────────────────────────
/** Flush microtasks so lazy imports resolve and Suspense boundaries settle */
async function flushAll() {
  for (let i = 0; i < 10; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

// ── Default mock implementations ─────────────────────────────────────────────
const defaultUseAuth = () => ({
  authToken: "valid-token",
  authUser: { name: "Admin", email: "admin@ivoo.com", role: "SUPERADMIN" },
  isValidatingSession: false,
  handleLogin: vi.fn(),
  handleLogout: vi.fn(),
});

const defaultUseRoleAccess = () => ({
  activeRole: "SUPERADMIN",
  canAccess: vi.fn(() => true),
  firstAllowedRoute: vi.fn(() => "/presidencia"),
});

const defaultUseProjects = () => ({
  projects: [],
  auditLogs: [],
  isLoadingApi: false,
  inspectedProject: null,
  setInspectedProject: vi.fn(),
  handleAddProject: vi.fn(),
  handleReviewProject: vi.fn(),
  handleApproveInvestment: vi.fn(),
  handleAddProposal: vi.fn(),
  handleRemoveProposal: vi.fn(),
  handleImportSupplierProposals: vi.fn(),
  handleSubmitComparative: vi.fn(),
  handleSelectContractor: vi.fn(),
  handleRejectProposals: vi.fn(),
  handlePayAdvance: vi.fn(),
  handleVerifyCompletion: vi.fn(),
  handlePayFinal: vi.fn(),
  resetData: vi.fn(),
});

const defaultUseContractors = () => ({
  contractors: [],
  setContractors: vi.fn(),
  handleAddContractor: vi.fn(),
  handleUpdateContractorRating: vi.fn(),
  loadContractors: vi.fn(),
  resetContractors: vi.fn(),
});

const defaultUseCatalog = () => ({
  materialsCatalog: [],
  setMaterialsCatalog: vi.fn(),
  handleAddCatalogItem: vi.fn(),
  resetCatalog: vi.fn(),
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockImplementation(defaultUseAuth);
    mockUseRoleAccess.mockImplementation(defaultUseRoleAccess);
    mockUseProjects.mockImplementation(defaultUseProjects);
    mockUseContractors.mockImplementation(defaultUseContractors);
    mockUseCatalog.mockImplementation(defaultUseCatalog);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── App root ────────────────────────────────────────────────────────────────
  it("renders without crashing", async () => {
    render(<App />);
    await flushAll();
    expect(await screen.findByTestId("view-presidencia")).toBeInTheDocument();
  });

  // ── Public routes (use MemoryRouter via router prop) ──────────────────────
  it("renders MaterialesProveedores on public route /registro-proveedores", async () => {
    render(
      <App
        router={MemoryRouter}
        initialEntries={["/registro-proveedores"]}
      />,
    );

    await flushAll();
    expect(await screen.findByTestId("view-materiales-proveedores")).toBeInTheDocument();
    expect(screen.queryByTestId("view-login")).not.toBeInTheDocument();
  });

  it("renders PropuestaMaterialesPublica on /propuesta-materiales/:token", async () => {
    render(
      <App
        router={MemoryRouter}
        initialEntries={["/propuesta-materiales/abc123"]}
      />,
    );

    await flushAll();
    expect(await screen.findByTestId("view-propuesta-publica")).toBeInTheDocument();
  });

  // ── Session validation ─────────────────────────────────────────────────────
  it("shows SessionValidationScreen when isValidatingSession is true", () => {
    mockUseAuth.mockImplementation(() => ({
      ...defaultUseAuth(),
      authToken: "",
      isValidatingSession: true,
    }));

    render(<App />);

    expect(screen.getByText("IVOO")).toBeInTheDocument();
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  // ── Unauthenticated ────────────────────────────────────────────────────────
  it("shows LoginScreen when no authToken", async () => {
    mockUseAuth.mockImplementation(() => ({
      ...defaultUseAuth(),
      authToken: "",
      isValidatingSession: false,
    }));

    render(<App />);

    await flushAll();
    expect(await screen.findByTestId("view-login")).toBeInTheDocument();
  });

  // ── No role assigned ───────────────────────────────────────────────────────
  it("shows access denied when authUser has no role", () => {
    mockUseAuth.mockImplementation(() => ({
      ...defaultUseAuth(),
      authUser: { name: "No Role", email: "norole@ivoo.com", role: null },
    }));

    render(<App />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.getByText(/Tu cuenta no tiene un rol asignado/)).toBeInTheDocument();
  });

  // ── Authenticated layout ───────────────────────────────────────────────────
  it("renders AuthenticatedLayout with PresidenciaDashboard by default", async () => {
    render(<App />);

    await flushAll();
    expect(await screen.findByTestId("view-presidencia")).toBeInTheDocument();
    expect(screen.getAllByText("IVOO").length).toBeGreaterThanOrEqual(1);
  });

  it("passes handleLoginWithToast to LoginScreen", async () => {
    const handleLogin = vi.fn();
    mockUseAuth.mockImplementation(() => ({
      ...defaultUseAuth(),
      authToken: "",
      isValidatingSession: false,
      handleLogin,
    }));

    render(<App />);

    await flushAll();
    const loginBtn = await screen.findByText("Login");
    act(() => loginBtn.click());
    expect(handleLogin).toHaveBeenCalled();
  });

  it("renders different views based on route", async () => {
    render(
      <App
        router={MemoryRouter}
        initialEntries={["/infraestructura"]}
      />,
    );

    await flushAll();
    expect(await screen.findByTestId("view-infraestructura")).toBeInTheDocument();
  });

  it("renders finanzas view", async () => {
    render(
      <App
        router={MemoryRouter}
        initialEntries={["/finanzas"]}
      />,
    );

    await flushAll();
    expect(await screen.findByTestId("view-finanzas")).toBeInTheDocument();
  });

  it("renders 404 catch-all route that redirects to firstAllowedRoute", async () => {
    mockUseRoleAccess.mockImplementation(() => ({
      ...defaultUseRoleAccess(),
      firstAllowedRoute: vi.fn(() => "/presidencia"),
    }));

    render(
      <App
        router={MemoryRouter}
        initialEntries={["/nonexistent"]}
      />,
    );

    await flushAll();
    expect(await screen.findByTestId("view-presidencia")).toBeInTheDocument();
  });

  // ── Role-based access ──────────────────────────────────────────────────────
  it("redirects to fallback route when canAccess is false", async () => {
    mockUseRoleAccess.mockImplementation(() => ({
      activeRole: "ANALISTA",
      canAccess: vi.fn((path) => path === "/analistas" || path === "/presidencia" || path === "/infraestructura"),
      firstAllowedRoute: vi.fn(() => "/analistas"),
    }));

    render(
      <App
        router={MemoryRouter}
        initialEntries={["/finanzas"]}
      />,
    );

    await flushAll();
    expect(await screen.findByTestId("view-analistas")).toBeInTheDocument();
  });
});
