import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransferDock, { transferPercent, transferStatusText } from "@/components/UI/TransferDock";
import { useTransferStore, type Transfer } from "@/stores/transferStore";

const MB = 1024 * 1024;

const transfer = (overrides: Partial<Transfer> = {}): Transfer => ({
  id: 1, label: "Subiendo archivos", phase: "uploading", loaded: 0, retryAttempt: 0, startedAt: 0, cancel: vi.fn(), ...overrides,
});

describe("transferStatusText / transferPercent", () => {
  it("calcula el porcentaje y lo limita a 100; sin total es desconocido", () => {
    expect(transferPercent({ loaded: 1 * MB, total: 4 * MB })).toBe(25);
    expect(transferPercent({ loaded: 5 * MB, total: 4 * MB })).toBe(100);
    expect(transferPercent({ loaded: 1, total: undefined })).toBeNull();
  });

  it("describe cada fase con lenguaje de usuario", () => {
    expect(transferStatusText(transfer({ phase: "preparing" }))).toBe("Preparando archivos…");
    expect(transferStatusText(transfer({ phase: "uploading", loaded: 1 * MB, total: 4 * MB }))).toBe("Enviando · 25% (1.0 MB de 4.0 MB)");
    expect(transferStatusText(transfer({ phase: "uploading", loaded: 0 }))).toBe("Enviando…");
    expect(transferStatusText(transfer({ phase: "processing", loaded: 4 * MB, total: 4 * MB }))).toContain("verificando");
  });

  it("avisa el reintento automático", () => {
    expect(transferStatusText(transfer({ retryAttempt: 1, loaded: 0, total: 4 * MB }))).toContain("Reintentando el envío (intento 2)");
  });
});

describe("TransferDock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTransferStore.setState({ transfers: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no muestra nada sin subidas", () => {
    const { container } = render(<TransferDock />);
    expect(container).toBeEmptyDOMElement();
  });

  it("no muestra una subida que termina enseguida (evita el parpadeo)", () => {
    render(<TransferDock />);

    act(() => { useTransferStore.getState().start("Rápida", vi.fn()); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText("Rápida")).not.toBeInTheDocument();

    const id = useTransferStore.getState().transfers[0].id;
    act(() => { useTransferStore.getState().finish(id); vi.advanceTimersByTime(1000); });
    expect(screen.queryByText("Rápida")).not.toBeInTheDocument();
  });

  it("muestra la subida lenta con su progreso y la quita al terminar", () => {
    render(<TransferDock />);
    let id = 0;

    act(() => { id = useTransferStore.getState().start("Enviando petición con adjuntos", vi.fn()); });
    act(() => { useTransferStore.getState().update(id, { phase: "uploading", loaded: 1 * MB, total: 4 * MB }); });
    act(() => { vi.advanceTimersByTime(600); });

    expect(screen.getByText("Enviando petición con adjuntos")).toBeInTheDocument();
    expect(screen.getByTestId("transfer-status")).toHaveTextContent("Enviando · 25%");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");

    act(() => { useTransferStore.getState().finish(id); });
    expect(screen.queryByText("Enviando petición con adjuntos")).not.toBeInTheDocument();
  });

  it("Cancelar llama al cancel de la subida", () => {
    vi.useRealTimers();
    const cancel = vi.fn();
    useTransferStore.setState({ transfers: [transfer({ cancel, startedAt: Date.now() - 5_000 })] });
    render(<TransferDock />);

    return userEvent.click(screen.getByRole("button", { name: /cancelar/i })).then(() => {
      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });

  it("no se puede cancelar mientras el servidor procesa", () => {
    vi.useRealTimers();
    useTransferStore.setState({ transfers: [transfer({ phase: "processing", loaded: 4 * MB, total: 4 * MB, startedAt: Date.now() - 5_000 })] });
    render(<TransferDock />);

    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  });
});
