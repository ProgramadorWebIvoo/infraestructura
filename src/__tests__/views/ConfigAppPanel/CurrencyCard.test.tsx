import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CurrencyCard from "@/views/ConfigAppPanel/components/CurrencyCard";
import type { CurrencyRecord } from "@/hooks/useCurrencies";

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

function makeCurrency(overrides: Partial<CurrencyRecord> = {}): CurrencyRecord {
  return {
    id: 1,
    code: "USD",
    name: "Dólar",
    symbol: "$",
    is_base: true,
    is_active: true,
    is_official: false,
    created_at: "2026-08-12T00:00:00.000000Z",
    updated_at: "2026-08-12T00:00:00.000000Z",
    ...overrides,
  };
}

describe("CurrencyCard", () => {
  const handlers = {
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    onSetBase: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderCard(currencies: CurrencyRecord[], overrides: Partial<typeof handlers> = {}, isLoading = false) {
    return render(
      <CurrencyCard
        currencies={currencies}
        isLoading={isLoading}
        onAdd={overrides.onAdd ?? handlers.onAdd}
        onUpdate={overrides.onUpdate ?? handlers.onUpdate}
        onSetBase={overrides.onSetBase ?? handlers.onSetBase}
        onDelete={overrides.onDelete ?? handlers.onDelete}
      />,
    );
  }

  it("muestra un skeleton mientras isLoading es true", () => {
    renderCard([], {}, true);
    expect(document.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("renderiza el catálogo vacío sin errores", () => {
    renderCard([]);
    expect(screen.getByText("Moneda")).toBeInTheDocument();
    expect(screen.queryByText("USD")).not.toBeInTheDocument();
    expect(screen.getByText("Sin monedas personalizadas agregadas todavía.")).toBeInTheDocument();
  });

  it("renderiza una moneda con su badge de Base y Activa", () => {
    renderCard([makeCurrency()]);
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("Dólar")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("renderiza una moneda no-base e inactiva sin el badge Base", () => {
    renderCard([makeCurrency({ id: 2, code: "EUR", name: "Euro", is_base: false, is_active: false })]);
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.queryByText("Base")).not.toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });

  // ── Formulario "Agregar moneda" ──────────────────────────────────────────

  it("abre el formulario al hacer click en Agregar moneda y marca los 3 campos como obligatorios", () => {
    renderCard([makeCurrency()]);
    fireEvent.click(screen.getByRole("button", { name: "Agregar moneda" }));

    expect(screen.getByPlaceholderText("EUR")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Euro")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("€")).toBeInTheDocument();
    // RequiredMark renderiza una alerta por campo obligatorio mientras está vacío.
    expect(screen.getAllByLabelText("Campo obligatorio pendiente")).toHaveLength(3);
  });

  it("no llama onAdd y muestra un toast si se intenta guardar con campos vacíos", async () => {
    renderCard([makeCurrency()]);
    fireEvent.click(screen.getByRole("button", { name: "Agregar moneda" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("Completa código, nombre y símbolo.", "error"));
    expect(handlers.onAdd).not.toHaveBeenCalled();
  });

  it("agrega una moneda con código, nombre y símbolo completos", async () => {
    handlers.onAdd.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency()]);
    fireEvent.click(screen.getByRole("button", { name: "Agregar moneda" }));

    fireEvent.change(screen.getByPlaceholderText("EUR"), { target: { value: "eur" } });
    fireEvent.change(screen.getByPlaceholderText("Euro"), { target: { value: "Euro" } });
    fireEvent.change(screen.getByPlaceholderText("€"), { target: { value: "€" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(handlers.onAdd).toHaveBeenCalledWith({ code: "EUR", name: "Euro", symbol: "€" }),
    );
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("Moneda agregada.", "success"));
  });

  it("el código se fuerza a mayúsculas y se recorta a 3 caracteres", () => {
    renderCard([makeCurrency()]);
    fireEvent.click(screen.getByRole("button", { name: "Agregar moneda" }));

    const codeInput = screen.getByPlaceholderText("EUR") as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: "usdx" } });

    expect(codeInput.value).toBe("USD");
  });

  it("muestra un toast de error si onAdd falla", async () => {
    handlers.onAdd.mockRejectedValueOnce(new Error("fallo de red"));
    renderCard([makeCurrency()]);
    fireEvent.click(screen.getByRole("button", { name: "Agregar moneda" }));

    fireEvent.change(screen.getByPlaceholderText("EUR"), { target: { value: "eur" } });
    fireEvent.change(screen.getByPlaceholderText("Euro"), { target: { value: "Euro" } });
    fireEvent.change(screen.getByPlaceholderText("€"), { target: { value: "€" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("fallo de red", "error"));
  });

  it("cancela el formulario y lo oculta", async () => {
    renderCard([makeCurrency()]);
    fireEvent.click(screen.getByRole("button", { name: "Agregar moneda" }));
    expect(screen.getByPlaceholderText("EUR")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByPlaceholderText("EUR")).not.toBeInTheDocument());
  });

  // ── Edición inline ────────────────────────────────────────────────────────

  it("entra en modo edición al hacer click en Editar y precarga nombre/símbolo actuales", () => {
    renderCard([makeCurrency({ is_base: false })]);
    fireEvent.click(screen.getByRole("button", { name: "Editar USD" }));

    const nameInput = screen.getByDisplayValue("Dólar");
    const symbolInput = screen.getByDisplayValue("$");
    expect(nameInput).toBeInTheDocument();
    expect(symbolInput).toBeInTheDocument();
  });

  it("guarda la edición con nombre y símbolo modificados", async () => {
    handlers.onUpdate.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ is_base: false })]);
    fireEvent.click(screen.getByRole("button", { name: "Editar USD" }));

    fireEvent.change(screen.getByDisplayValue("Dólar"), { target: { value: "Dólar Americano" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar USD" }));

    await waitFor(() =>
      expect(handlers.onUpdate).toHaveBeenCalledWith(1, { name: "Dólar Americano", symbol: "$" }),
    );
  });

  it("muestra un toast de error si se guarda la edición con nombre vacío", async () => {
    renderCard([makeCurrency({ is_base: false })]);
    fireEvent.click(screen.getByRole("button", { name: "Editar USD" }));

    fireEvent.change(screen.getByDisplayValue("Dólar"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar USD" }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith("Nombre y símbolo no pueden quedar vacíos.", "error"),
    );
    expect(handlers.onUpdate).not.toHaveBeenCalled();
  });

  it("cancela la edición sin llamar onUpdate", () => {
    renderCard([makeCurrency({ is_base: false })]);
    fireEvent.click(screen.getByRole("button", { name: "Editar USD" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar edición" }));

    expect(screen.queryByDisplayValue("Dólar")).not.toBeInTheDocument();
    expect(handlers.onUpdate).not.toHaveBeenCalled();
  });

  // ── Activar/desactivar, fijar como base, eliminar ────────────────────────

  it("fija una moneda no-base y activa como base", async () => {
    handlers.onSetBase.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_base: false, is_active: true })]);

    fireEvent.click(screen.getByRole("button", { name: "Fijar EUR como base" }));

    await waitFor(() => expect(handlers.onSetBase).toHaveBeenCalledWith(2));
  });

  it("no muestra el botón de fijar-como-base para una moneda inactiva", () => {
    renderCard([makeCurrency({ id: 2, code: "EUR", is_base: false, is_active: false })]);
    expect(screen.queryByRole("button", { name: "Fijar EUR como base" })).not.toBeInTheDocument();
  });

  it("no muestra ninguna acción de gestión para la moneda base (salvo Editar)", () => {
    renderCard([makeCurrency({ is_base: true })]);
    expect(screen.queryByRole("button", { name: "Desactivar USD" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar USD" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar USD" })).toBeInTheDocument();
  });

  it("desactiva una moneda activa no-base", async () => {
    handlers.onUpdate.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_base: false, is_active: true })]);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar EUR" }));

    await waitFor(() => expect(handlers.onUpdate).toHaveBeenCalledWith(2, { is_active: false }));
  });

  it("activa una moneda inactiva no-base", async () => {
    handlers.onUpdate.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_base: false, is_active: false })]);

    fireEvent.click(screen.getByRole("button", { name: "Activar EUR" }));

    await waitFor(() => expect(handlers.onUpdate).toHaveBeenCalledWith(2, { is_active: true }));
  });

  it("elimina una moneda no-base", async () => {
    handlers.onDelete.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_base: false, is_active: true })]);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar EUR" }));

    await waitFor(() => expect(handlers.onDelete).toHaveBeenCalledWith(2));
  });

  it("muestra un toast de error genérico si una acción de fila falla", async () => {
    handlers.onDelete.mockRejectedValueOnce(new Error("no se pudo eliminar"));
    renderCard([makeCurrency({ id: 2, code: "EUR", is_base: false, is_active: true })]);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar EUR" }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("no se pudo eliminar", "error"));
  });

  // ── Monedas oficiales BCV (is_official) ──────────────────────────────────

  it("agrupa una moneda oficial bajo 'Monedas oficiales BCV' con badge BCV, sin Editar ni Eliminar", () => {
    renderCard([makeCurrency({ id: 2, code: "EUR", name: "Euro", is_base: false, is_active: true, is_official: true })]);

    expect(screen.getByText("Monedas oficiales BCV")).toBeInTheDocument();
    expect(screen.getByText("BCV")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar EUR" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar EUR" })).not.toBeInTheDocument();
  });

  it("permite activar/desactivar una moneda oficial no-base", async () => {
    handlers.onUpdate.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_base: false, is_active: true, is_official: true })]);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar EUR" }));

    await waitFor(() => expect(handlers.onUpdate).toHaveBeenCalledWith(2, { is_active: false }));
  });

  it("no agrupa monedas custom bajo 'Monedas oficiales BCV'", () => {
    renderCard([makeCurrency({ id: 2, code: "GBP", name: "Libra", is_base: false, is_active: true, is_official: false })]);

    expect(screen.queryByText("Monedas oficiales BCV")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar GBP" })).toBeInTheDocument();
  });
});
