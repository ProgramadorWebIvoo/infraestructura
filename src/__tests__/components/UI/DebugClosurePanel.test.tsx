import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DebugClosurePanel from "@/components/UI/DebugPanel/DebugClosurePanel";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));
const showToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast }) }));

const fixture = { projectId: "PRJ-001", title: "[DEBUG] Obra", status: "EN_EJECUCION", publicUrl: "http://x/cierre-publico/abc" };

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DebugClosurePanel />
    </QueryClientProvider>,
  );
}

describe("DebugClosurePanel", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    showToast.mockReset();
  });

  it("lista obras de prueba con enlace del contratista y avances posteriores", async () => {
    apiFetch.mockResolvedValueOnce([fixture]);
    renderPanel();

    expect(await screen.findByText(/PRJ-001/)).toBeInTheDocument();
    expect(screen.getByText("Abrir enlace del contratista").closest("a")).toHaveAttribute("href", fixture.publicUrl);
    expect(screen.getByText("Avanzar a Listo para pago final")).toBeInTheDocument();
    expect(screen.queryByText("Avanzar a En ejecución")).not.toBeInTheDocument();
  });

  it("crea una obra de prueba en el estado elegido y refresca la lista", async () => {
    apiFetch.mockResolvedValueOnce([]).mockResolvedValueOnce({}).mockResolvedValueOnce([fixture]);
    renderPanel();

    fireEvent.click(await screen.findByText(/Crear obra de prueba en «Pendiente de Auditoría»/));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith("/debug/closure-fixtures", { method: "POST", body: JSON.stringify({ targetStatus: "VERIFICANDO_FINALIZACION" }) }),
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining("creada"), "success"));
  });
});
