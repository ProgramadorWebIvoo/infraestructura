import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("muestra el estado vacío de 'Mis obras' sin obras", async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    renderPanel();
    expect(screen.getByText("Mis obras")).toBeInTheDocument();
    expect(await screen.findByText("No tiene obras asignadas por el momento.")).toBeInTheDocument();
  });

  it("lista primero las obras pendientes de verificación", async () => {
    vi.mocked(apiFetch).mockResolvedValue([dto("1", false), dto("2", true)]);
    renderPanel();
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Verificar obra|Ver informe/ })).toHaveLength(2));
    const titles = screen.getAllByText(/^Obra \d$/).map((n) => n.textContent);
    expect(titles).toEqual(["Obra 2", "Obra 1"]);
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
