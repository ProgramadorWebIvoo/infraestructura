/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integración de MaterialConfigPanel — carga, búsqueda, alta y cambio de
 * estado (con confirmación). `apiFetch` se mockea; los sub-componentes se
 * renderizan reales.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MaterialConfigPanel from "@/views/MaterialConfigPanel";
import type { ConfigMaterial } from "@/views/MaterialConfigPanel/types";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants;
      delete rest.transition; delete rest.whileHover; delete rest.whileTap;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <span {...rest}>{children}</span>;
    },
    ul: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <ul {...rest}>{children}</ul>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants;
      delete rest.transition; delete rest.whileHover; delete rest.whileTap;
      return <button {...rest}>{children}</button>;
    },
    tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants;
      delete rest.transition; delete rest.layout;
      return <tr {...rest}>{children}</tr>;
    },
  },
}));

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/hooks/useConfigAuditLogs", () => ({
  useConfigAuditLogs: () => ({
    logs: [],
    isLoading: false,
    hasLoaded: true,
    page: 1,
    lastPage: 1,
    total: 0,
    goToPage: vi.fn(),
    prependLocal: vi.fn(),
  }),
}));

const MATERIAL: ConfigMaterial = {
  id: 1,
  name: "Cemento Portland",
  unit: "Saco",
  estimatedUnitPrice: 12.5,
  isActive: true,
  createdAt: "2026-07-22T00:00:00.000000Z",
  updatedAt: "2026-07-22T00:00:00.000000Z",
};

describe("MaterialConfigPanel (integración)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue([MATERIAL]);
  });

  it("carga y renderiza el catálogo de materiales", async () => {
    render(<MaterialConfigPanel authToken="token" activeRole="ADMIN" />);
    expect(screen.getByRole("heading", { name: "Materiales" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Cemento Portland")).toBeInTheDocument());
  });

  it("filtra por nombre o unidad", async () => {
    render(<MaterialConfigPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Cemento Portland")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o unidad..."), {
      target: { value: "acero" },
    });
    expect(screen.getByText("No se encontraron materiales con ese criterio.")).toBeInTheDocument();
  });

  it("crea un material con nombre y unidad válidos", async () => {
    render(<MaterialConfigPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Cemento Portland")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo material" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Arena fina" } });
    fireEvent.change(screen.getByLabelText(/Unidad/), { target: { value: "m3" } });
    fireEvent.change(screen.getByLabelText(/Precio unitario/), { target: { value: "5.5" } });

    mockApiFetch.mockResolvedValueOnce({ ...MATERIAL, id: 2, name: "Arena fina", unit: "m3" });
    fireEvent.click(screen.getByRole("button", { name: "Crear material" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Material creado correctamente.", "success");
    });
  });

  it("rechaza el guardado si faltan campos obligatorios", async () => {
    render(<MaterialConfigPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Cemento Portland")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo material" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Crear material" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Completa todos los campos obligatorios.", "error");
    });
  });

  it("rechaza el guardado si el precio unitario es 0", async () => {
    render(<MaterialConfigPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Cemento Portland")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo material" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Arena fina" } });
    fireEvent.change(screen.getByLabelText(/Unidad/), { target: { value: "m3" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear material" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("El precio unitario estimado debe ser mayor a 0.", "error");
    });
    expect(mockApiFetch).not.toHaveBeenCalledWith("/materials/config", expect.objectContaining({ method: "POST" }));
  });

  it("pide confirmación antes de cambiar el estado", async () => {
    render(<MaterialConfigPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Cemento Portland")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Desactivar Cemento Portland/ }));
    expect(screen.getByText("Cambiar estado del material")).toBeInTheDocument();

    mockApiFetch.mockResolvedValueOnce({ id: 1, isActive: false });
    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Material desactivado correctamente.", "success");
    });
  });
});
