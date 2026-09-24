import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CierrePublico from "@/views/CierrePublico";
import { validateClosureItem } from "@/components/ClosureReport/types";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getApiBaseUrl: () => "http://api.test",
}));
vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const baseItem = { id: 1, name: "Tomacorriente", unit: "und", contractedQuantity: 12, executedQuantity: 12, unitPriceUsd: null, note: null };
const photo = { id: 9, itemId: null, uploadedByType: "CONTRATISTA", originalName: "obra.jpg", path: "public/closures/tok/photos/9" };

function response(overrides: Record<string, unknown> = {}, editable = true) {
  return {
    id: "tok", projectId: "P1", status: "ABIERTO", revision: 1, contractorNotes: null, submittedAt: null, rejectionReason: null, rejectedByRole: null, items: [baseItem], photos: [photo],
    project: { id: "P1", title: "Tienda Naguanagua", location: "Carabobo" },
    editable,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/cierre-publico/tok"]}>
      <Routes>
        <Route path="/cierre-publico/:token" element={<CierrePublico />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("validateClosureItem", () => {
  it("rechaza excedentes y exige nota en disminuciones", () => {
    expect(validateClosureItem({ ...baseItem, executedQuantity: 13 })).toMatch(/superar/);
    expect(validateClosureItem({ ...baseItem, executedQuantity: 8 })).toMatch(/Justifique/);
    expect(validateClosureItem({ ...baseItem, executedQuantity: 8, note: "Menos puntos" })).toBeNull();
    expect(validateClosureItem(baseItem)).toBeNull();
  });
});

describe("CierrePublico", () => {
  beforeEach(() => apiFetch.mockReset());

  it("envía el informe cuando hay foto y partidas válidas", async () => {
    apiFetch.mockResolvedValueOnce(response()).mockResolvedValueOnce({});
    renderPage();

    const button = await screen.findByRole("button", { name: /enviar informe/i });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    await waitFor(() => expect(screen.getByText("Informe enviado")).toBeInTheDocument());
    const [url, options] = apiFetch.mock.calls[1];
    expect(url).toBe("/public/closures/tok/submit");
    expect(JSON.parse(options.body).items).toEqual([{ id: 1, executedQuantity: 12, note: null }]);
  });

  it("deshabilita el envío sin fotos", async () => {
    apiFetch.mockResolvedValueOnce(response({ photos: [] }));
    renderPage();

    expect(await screen.findByRole("button", { name: /enviar informe/i })).toBeDisabled();
  });

  it("muestra solo lectura cuando el informe no es editable", async () => {
    apiFetch.mockResolvedValueOnce(response({ status: "ENVIADO" }, false));
    renderPage();

    expect(await screen.findByText(/está en revisión/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enviar informe/i })).not.toBeInTheDocument();
  });

  it("muestra el motivo de rechazo", async () => {
    apiFetch.mockResolvedValueOnce(response({ status: "RECHAZADO", rejectionReason: "Faltan fotos" }));
    renderPage();

    expect(await screen.findByText("Faltan fotos")).toBeInTheDocument();
  });
});
