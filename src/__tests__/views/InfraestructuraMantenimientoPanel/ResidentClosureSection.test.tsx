import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResidentClosureSection, { isReadOnlyForResident } from "@/views/InfraestructuraMantenimientoPanel/components/ResidentClosureSection";
import { ToastProvider } from "@/components/UI/Toast";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getApiBaseUrl: () => "http://api.test",
}));

const report = {
  id: "tok", projectId: "P1", status: "ENVIADO", revision: 1, contractorNotes: "Listo", submittedAt: null, rejectionReason: null, rejectedByRole: null,
  items: [{ id: 1, name: "Tomacorriente", unit: "und", contractedQuantity: 12, executedQuantity: 8, unitPriceUsd: 50, note: "Menos puntos" }],
  photos: [{ id: 1, itemId: null, uploadedByType: "CONTRATISTA", originalName: "a.jpg", path: "projects/P1/closure-report/photos/1" }],
};

const project = (overrides: Partial<Project> = {}) =>
  ({ id: "P1", title: "Tienda Naguanagua", location: "Carabobo", status: ProjectStatus.INFORME_ENVIADO, ...overrides }) as Project;

function makeActions() {
  return {
    handleResidentApproval: vi.fn().mockResolvedValue(undefined),
    handleRejectClosure: vi.fn().mockResolvedValue(undefined),
    handleAuditApproval: vi.fn(),
    handleRequestFiniquito: vi.fn(),
    handleReturnFiniquito: vi.fn(),
    handleUploadResidentPhoto: vi.fn().mockResolvedValue(undefined),
    handleResendClosureLink: vi.fn().mockResolvedValue({ mailSent: true }),
    handleAssignResident: vi.fn(),
  };
}

function renderSection(projects: Project[], actions = makeActions(), user = { id: 5, role: "INFRAESTRUCTURA" }) {
  render(
    <ToastProvider>
      <ResidentClosureSection projects={projects} authToken="t" actions={actions} currentUser={user} />
    </ToastProvider>,
  );
  return actions;
}

describe("isReadOnlyForResident", () => {
  it("solo es lectura para INFRAESTRUCTURA con otro residente asignado", () => {
    expect(isReadOnlyForResident(project({ residentUserId: 9 }), { id: 5, role: "INFRAESTRUCTURA" })).toBe(true);
    expect(isReadOnlyForResident(project({ residentUserId: 5 }), { id: 5, role: "INFRAESTRUCTURA" })).toBe(false);
    expect(isReadOnlyForResident(project({ residentUserId: null }), { id: 5, role: "INFRAESTRUCTURA" })).toBe(false);
    expect(isReadOnlyForResident(project({ residentUserId: 9 }), { id: 1, role: "ADMIN" })).toBe(false);
  });
});

describe("ResidentClosureSection", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockImplementation(async (url: string) => (url === "/residents" ? [{ id: 5, name: "Ana" }] : report));
  });

  it("exige foto de verificación antes de dar el visto bueno", async () => {
    renderSection([project()]);

    await userEvent.click(screen.getByRole("button", { name: /revisar informe/i }));
    expect(await screen.findByText("Tomacorriente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dar visto bueno/i })).toBeDisabled();
    expect(screen.getByText(/al menos una foto de verificación/i)).toBeInTheDocument();
  });

  const withResidentPhoto = { ...report, photos: [...report.photos, { id: 2, itemId: null, uploadedByType: "RESIDENTE", originalName: "b.jpg", path: "projects/P1/closure-report/photos/2" }] };

  it("habilita el visto bueno con foto del residente y lo registra", async () => {
    apiFetch.mockImplementation(async (url: string) => (url === "/residents" ? [] : withResidentPhoto));
    const actions = renderSection([project()]);

    await userEvent.click(screen.getByRole("button", { name: /revisar informe/i }));
    const approve = await screen.findByRole("button", { name: /dar visto bueno/i });
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);

    await waitFor(() =>
      expect(actions.handleResidentApproval).toHaveBeenCalledWith("P1", undefined, [{ id: 1, residentQuantity: 8, note: undefined }]),
    );
  });

  it("prellena lo verificado con lo declarado y exige nota si el residente difiere", async () => {
    apiFetch.mockImplementation(async (url: string) => (url === "/residents" ? [] : withResidentPhoto));
    const actions = renderSection([project()]);

    await userEvent.click(screen.getByRole("button", { name: /revisar informe/i }));
    const qty = await screen.findByLabelText(/verificado en obra/i);
    expect(qty).toHaveValue(8);
    expect(screen.getByText(/sin diferencias respecto a lo declarado/i)).toBeInTheDocument();

    await userEvent.clear(qty);
    await userEvent.type(qty, "6");
    expect(await screen.findByText(/1 partida con diferencia/i)).toBeInTheDocument();
    const approve = screen.getByRole("button", { name: /dar visto bueno/i });
    await waitFor(() => expect(approve).toBeDisabled());

    await userEvent.type(screen.getByLabelText(/justifique la diferencia/i), "Solo 6 instalados");
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);
    await waitFor(() =>
      expect(actions.handleResidentApproval).toHaveBeenCalledWith("P1", undefined, [{ id: 1, residentQuantity: 6, note: "Solo 6 instalados" }]),
    );
  });

  it("no permite guardar sin cantidad verificada", async () => {
    apiFetch.mockImplementation(async (url: string) => (url === "/residents" ? [] : withResidentPhoto));
    renderSection([project()]);

    await userEvent.click(screen.getByRole("button", { name: /revisar informe/i }));
    await userEvent.clear(await screen.findByLabelText(/verificado en obra/i));
    await waitFor(() => expect(screen.getByRole("button", { name: /dar visto bueno/i })).toBeDisabled());
    expect(screen.getByText(/registre la cantidad verificada/i)).toBeInTheDocument();
  });

  it("rechazar exige motivo", async () => {
    const actions = renderSection([project()]);

    await userEvent.click(screen.getByRole("button", { name: /revisar informe/i }));
    await userEvent.click(await screen.findByRole("button", { name: /rechazar y devolver al contratista/i }));
    const confirm = screen.getByRole("button", { name: /rechazar y devolver al contratista/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/motivo del rechazo/i), "Faltan puntos");
    await userEvent.click(confirm);
    await waitFor(() => expect(actions.handleRejectClosure).toHaveBeenCalledWith("P1", "Faltan puntos"));
  });

  it("muestra solo lectura si hay otro residente asignado", async () => {
    renderSection([project({ residentUserId: 9, residentName: "Ana" })]);

    await userEvent.click(screen.getByRole("button", { name: /ver informe/i }));
    await screen.findByText("Tomacorriente");
    expect(screen.queryByRole("button", { name: /dar visto bueno/i })).not.toBeInTheDocument();
  });

  it("reenvía el enlace en obras en ejecución", async () => {
    const actions = renderSection([project({ status: ProjectStatus.EN_EJECUCION })]);

    await userEvent.click(screen.getByRole("button", { name: /reenviar enlace/i }));
    await waitFor(() => expect(actions.handleResendClosureLink).toHaveBeenCalledWith("P1"));
  });
});
