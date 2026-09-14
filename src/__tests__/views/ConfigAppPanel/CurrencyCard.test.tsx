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
    onUpdate: vi.fn(),
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
        onUpdate={overrides.onUpdate ?? handlers.onUpdate}
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

  it("renderiza una moneda con su badge de Activa", () => {
    renderCard([makeCurrency()]);
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("Dólar")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("renderiza una moneda inactiva sin el badge de base", () => {
    renderCard([makeCurrency({ id: 2, code: "EUR", name: "Euro", is_base: false, is_active: false })]);
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });

  it("ya no ofrece agregar monedas personalizadas", () => {
    renderCard([makeCurrency()]);
    expect(screen.queryByRole("button", { name: "Agregar moneda" })).not.toBeInTheDocument();
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

  // ── Activar/desactivar, eliminar ──────────────────────────────────────────

  it("desactiva una moneda activa", async () => {
    handlers.onUpdate.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_active: true })]);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar EUR" }));

    await waitFor(() => expect(handlers.onUpdate).toHaveBeenCalledWith(2, { is_active: false }));
  });

  it("activa una moneda inactiva", async () => {
    handlers.onUpdate.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_active: false })]);

    fireEvent.click(screen.getByRole("button", { name: "Activar EUR" }));

    await waitFor(() => expect(handlers.onUpdate).toHaveBeenCalledWith(2, { is_active: true }));
  });

  it("elimina una moneda personalizada", async () => {
    handlers.onDelete.mockResolvedValueOnce(undefined);
    renderCard([makeCurrency({ id: 2, code: "EUR", is_active: true, is_official: false })]);

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
