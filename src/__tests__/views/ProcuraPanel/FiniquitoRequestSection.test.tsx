import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FiniquitoRequestSection from "@/views/ProcuraPanel/components/FiniquitoRequestSection";
import { ToastProvider } from "@/components/UI/Toast";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getApiBaseUrl: () => "http://api.test",
}));

const report = {
  id: "tok", projectId: "P1", status: "APROBADO_AUDITORIA", revision: 1, contractorNotes: null, submittedAt: null, rejectionReason: null, rejectedByRole: null,
  items: [{ id: 1, name: "Cable", unit: "m", contractedQuantity: 100, executedQuantity: 100, unitPriceUsd: 2, note: null }],
  photos: [], finiquitoAmount: 6800,
};

const project = (overrides: Partial<Project> = {}) =>
  ({ id: "P1", title: "Tienda Naguanagua", location: "Carabobo", selectedContractorCode: "C-1", status: ProjectStatus.PENDIENTE_SOLICITUD_FINIQUITO, finiquitoAmount: 6800, ...overrides }) as Project;

function setup(projects: Project[]) {
  const actions = {
    handleResidentApproval: vi.fn(), handleRejectClosure: vi.fn(), handleAuditApproval: vi.fn(),
    handleRequestFiniquito: vi.fn().mockResolvedValue(undefined),
    handleReturnFiniquito: vi.fn().mockResolvedValue(undefined),
    handleUploadResidentPhoto: vi.fn(), handleResendClosureLink: vi.fn(), handleAssignResident: vi.fn(),
  };
  render(
    <ToastProvider>
      <FiniquitoRequestSection projects={projects} authToken="t" actions={actions} />
    </ToastProvider>,
  );
  return actions;
}

describe("FiniquitoRequestSection", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue(report);
  });

  it("solo lista obras pendientes de solicitud de finiquito y muestra el monto", () => {
    setup([project(), project({ id: "P2", title: "Otra", status: ProjectStatus.EN_EJECUCION })]);

    expect(screen.getByText("Tienda Naguanagua")).toBeInTheDocument();
    expect(screen.queryByText("Otra")).not.toBeInTheDocument();
    expect(screen.getByText(/6[.,]?800/)).toBeInTheDocument();
  });

  it("solicita el pago del finiquito", async () => {
    const actions = setup([project()]);

    await userEvent.click(screen.getByRole("button", { name: /revisar y solicitar pago/i }));
    const request = await screen.findByRole("button", { name: /solicitar pago a finanzas/i });
    await waitFor(() => expect(request).toBeEnabled());
    await userEvent.click(request);

    await waitFor(() => expect(actions.handleRequestFiniquito).toHaveBeenCalledWith("P1", undefined));
  });

  it("devuelve a Auditoría con motivo obligatorio", async () => {
    const actions = setup([project()]);

    await userEvent.click(screen.getByRole("button", { name: /revisar y solicitar pago/i }));
    await userEvent.click(await screen.findByRole("button", { name: /devolver a auditoría/i }));
    const confirm = screen.getByRole("button", { name: /devolver a auditoría/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/motivo del rechazo/i), "Revisar cantidades");
    await userEvent.click(confirm);
    await waitFor(() => expect(actions.handleReturnFiniquito).toHaveBeenCalledWith("P1", "Revisar cantidades"));
  });
});
