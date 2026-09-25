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

  it("prellena la cantidad final con la medición del residente y muestra las cuatro cifras y las notas", async () => {
    setup();

    const finalCable = await screen.findByLabelText(/cantidad final/i, { selector: "#closure-qty-1" });
    expect(finalCable).toHaveValue(90);
    expect(screen.getByText(/Faltan 10 m/)).toBeInTheDocument();
    expect(screen.getByText(/sin diferencias respecto a la medición del residente/i)).toBeInTheDocument();
  });

  it("muestra el finiquito estimado y lo recalcula con la cantidad final", async () => {
    setup();

    // 10000 − 3000 − (100−90)×2 = 6980
    expect(await screen.findByText("$6,980.00")).toBeInTheDocument();

    const finalCable = screen.getByLabelText(/cantidad final/i, { selector: "#closure-qty-1" });
    await userEvent.clear(finalCable);
    await userEvent.type(finalCable, "95");
    // 10000 − 3000 − (100−95)×2 = 6990
    expect(await screen.findByText("$6,990.00")).toBeInTheDocument();
  });

  it("exige nota cuando la final difiere de la del residente y envía las mediciones", async () => {
    const actions = setup();

    const finalCable = await screen.findByLabelText(/cantidad final/i, { selector: "#closure-qty-1" });
    const approve = screen.getByRole("button", { name: /verificar y enviar a procura/i });
    await waitFor(() => expect(approve).toBeEnabled());

    await userEvent.clear(finalCable);
    await userEvent.type(finalCable, "95");
    await waitFor(() => expect(approve).toBeDisabled());
    expect(screen.getByText(/1 partida con diferencia/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/justifique la diferencia con la medición del residente/i), "Se comprobó 95 m");
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);

    await waitFor(() =>
      expect(actions.handleAuditApproval).toHaveBeenCalledWith("P1", undefined, [
        { id: 1, auditQuantity: 95, note: "Se comprobó 95 m" },
        { id: 2, auditQuantity: 12, note: undefined },
      ]),
    );
  });

  it("no permite superar lo contratado", async () => {
    setup();

    const finalCable = await screen.findByLabelText(/cantidad final/i, { selector: "#closure-qty-1" });
    await userEvent.clear(finalCable);
    await userEvent.type(finalCable, "120");

    // El input limita al máximo contratado: nunca se envía más de 100.
    await waitFor(() => expect(Number((finalCable as HTMLInputElement).value)).toBeLessThanOrEqual(100));
  });

  it("rechazar exige motivo y no depende de las mediciones", async () => {
    const actions = setup();

    await userEvent.click(await screen.findByRole("button", { name: /rechazar y devolver al contratista/i }));
    const confirm = screen.getByRole("button", { name: /rechazar y devolver al contratista/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/motivo del rechazo/i), "No coincide");
    await userEvent.click(confirm);
    await waitFor(() => expect(actions.handleRejectClosure).toHaveBeenCalledWith("P1", "No coincide"));
  });
});
