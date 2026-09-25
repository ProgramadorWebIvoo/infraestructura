import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClosureReviewModal from "@/components/ClosureReport/ClosureReviewModal";
import { ToastProvider } from "@/components/UI/Toast";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getApiBaseUrl: () => "http://api.test",
}));

const report = {
  id: "tok", projectId: "P1", status: "APROBADO_RESIDENTE", revision: 1, contractorNotes: "Listo", submittedAt: null,
  rejectionReason: null, rejectedByRole: null, residentNotes: "Medido en sitio",
  items: [
    { id: 1, name: "Cable", unit: "m", contractedQuantity: 100, executedQuantity: 100, residentQuantity: 90, residentNote: "Faltan 10 m", unitPriceUsd: 2, note: null },
    { id: 2, name: "Tomacorriente", unit: "und", contractedQuantity: 12, executedQuantity: 12, residentQuantity: 12, residentNote: null, unitPriceUsd: 50, note: null },
  ],
  photos: [
    { id: 1, itemId: null, uploadedByType: "CONTRATISTA", originalName: "a.jpg", path: "projects/P1/closure-report/photos/1" },
    { id: 2, itemId: null, uploadedByType: "RESIDENTE", originalName: "b.jpg", path: "projects/P1/closure-report/photos/2" },
  ],
};

const project = {
  id: "P1", title: "Tienda Naguanagua", location: "Carabobo", status: ProjectStatus.VERIFICANDO_FINALIZACION,
  selectedProposalId: "PROP-1", advancePaidAmount: 3000,
  proposals: [{ id: "PROP-1", totalCost: 10000 }],
} as unknown as Project;

function setup() {
  const actions = {
    handleAuditApproval: vi.fn().mockResolvedValue(undefined),
    handleRejectClosure: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <ToastProvider>
      <ClosureReviewModal project={project} mode="audit" authToken="t" actions={actions as never} onClose={vi.fn()} />
    </ToastProvider>,
  );
  return actions;
}

describe("ClosureReviewModal — Auditoría", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue(report);
  });

  it("muestra la medición del residente y sus notas sin campos editables", async () => {
    setup();

    expect(await screen.findByText(/Faltan 10 m/)).toBeInTheDocument();
    expect(screen.getByTestId("closure-item-1")).toHaveTextContent("90");
    expect(document.querySelector("#closure-qty-1")).toBeNull();
  });

  it("muestra el finiquito estimado con la medición del residente", async () => {
    setup();

    // 10000 − 3000 − (100−90)×2 = 6980
    expect(await screen.findByText("$6,980.00")).toBeInTheDocument();
  });

  it("aprueba sin enviar cantidades", async () => {
    const actions = setup();

    const approve = await screen.findByRole("button", { name: /verificar y enviar a procura/i });
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);

    await waitFor(() => expect(actions.handleAuditApproval).toHaveBeenCalledWith("P1", undefined));
  });

  it("rechazar exige motivo y por defecto devuelve al contratista", async () => {
    const actions = setup();

    await userEvent.click(await screen.findByRole("button", { name: /rechazar…/i }));
    const confirm = screen.getByRole("button", { name: /rechazar: devolver al contratista/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/motivo del rechazo/i), "No coincide");
    await userEvent.click(confirm);
    await waitFor(() => expect(actions.handleRejectClosure).toHaveBeenCalledWith("P1", "No coincide", "CONTRATISTA"));
  });

  it("permite elegir al residente como destino del rechazo", async () => {
    const actions = setup();

    await userEvent.click(await screen.findByRole("button", { name: /rechazar…/i }));
    await userEvent.click(screen.getByLabelText(/devolver al residente/i));
    await userEvent.type(screen.getByLabelText(/motivo del rechazo/i), "Medición dudosa");
    await userEvent.click(screen.getByRole("button", { name: /rechazar: devolver al residente/i }));
    await waitFor(() => expect(actions.handleRejectClosure).toHaveBeenCalledWith("P1", "Medición dudosa", "RESIDENTE"));
  });
});
