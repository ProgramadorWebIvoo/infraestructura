import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/UI/Toast";
import { apiFetch } from "@/services/api";
import ResidentePanel from "@/views/ResidentePanel";
import { getRoleHomeConfig } from "@/views/HomePanel/roleHomeConfig";
import { ROUTES } from "@/routes";
import { roleLabel } from "@/constants/roles";

vi.mock("@/services/api", async (orig) => ({ ...(await orig<typeof import("@/services/api")>()), apiFetch: vi.fn() }));

const dto = (id: string, pendingAction: boolean) => ({
  id, title: `Obra ${id}`, location: "Caracas", description: null, status: "INFORME_ENVIADO", pendingAction, closure: null,
});
const renderPanel = () => render(<ToastProvider><ResidentePanel authToken="t" /></ToastProvider>);

describe("rol RESIDENTE", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  // El Select del filtro mide en requestAnimationFrame; se espera un frame antes de desmontar.
  afterEach(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

  it("muestra el estado vacío de 'Mis obras' sin obras", async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    renderPanel();
    expect(screen.getByText("Mis obras")).toBeInTheDocument();
    expect(await screen.findByText("No tiene obras asignadas por el momento.")).toBeInTheDocument();
  });

  it("lista primero las obras pendientes de verificación", async () => {
    vi.mocked(apiFetch).mockResolvedValue([dto("1", false), dto("2", true)]);
    renderPanel();
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Cargar mi informe|Ver mi informe/ })).toHaveLength(2), { timeout: 5000 });
    const titles = screen.getAllByText(/^Obra \d$/).map((n) => n.textContent);
    expect(titles).toEqual(["Obra 2", "Obra 1"]);
  });

  it("con muchas obras pagina la tabla y la búsqueda filtra", async () => {
    vi.mocked(apiFetch).mockResolvedValue(Array.from({ length: 25 }, (_, i) => dto(`PRJ-${String(i + 1).padStart(3, "0")}`, i % 2 === 0)));
    renderPanel();
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Cargar mi informe|Ver mi informe/ }).length).toBeGreaterThan(0), { timeout: 5000 });
    expect(screen.getAllByRole("button", { name: /Cargar mi informe|Ver mi informe/ })).toHaveLength(10);

    fireEvent.change(screen.getByLabelText("Buscar en mis obras"), { target: { value: "PRJ-025" } });
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Cargar mi informe|Ver mi informe/ })).toHaveLength(1), { timeout: 5000 });
  });

  it("su home solo enlaza a /residente y no muestra KPIs financieros", () => {
    const config = getRoleHomeConfig("RESIDENTE");
    expect(config.modules.map((m) => m.route)).toEqual([ROUTES.RESIDENTE]);
    expect(config.kpis).toEqual([]);
  });

  it("tiene etiqueta legible", () => {
    expect(roleLabel("RESIDENTE")).toBe("Residente");
  });
});
