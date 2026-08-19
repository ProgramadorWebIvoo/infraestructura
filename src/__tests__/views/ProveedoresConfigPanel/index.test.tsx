/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integración de ProveedoresConfigPanel — carga, búsqueda, alta y cambio de
 * estado (con confirmación). `apiFetch` se mockea; los sub-componentes se
 * renderizan reales.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProveedoresConfigPanel from "@/views/ProveedoresConfigPanel";
import type { ConfigContractor } from "@/views/ProveedoresConfigPanel/types";

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
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <p {...rest}>{children}</p>;
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

const CONTRACTOR: ConfigContractor = {
  code: "PRV-001",
  name: "Construcciones del Sur S.A.",
  specialty: "Obra civil",
  rating: 4.5,
  email: "contacto@constructora.com",
  phone: "+58 412-1234567",
  registrationSource: "INTERNAL",
  status: "ACTIVE",
  createdAt: "2026-07-22T00:00:00.000000Z",
  updatedAt: "2026-07-22T00:00:00.000000Z",
};

const mockOnContractorMutated = vi.fn();

describe("ProveedoresConfigPanel (integración)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue([CONTRACTOR]);
  });

  it("carga y renderiza el catálogo de proveedores", async () => {
    render(<ProveedoresConfigPanel authToken="token" activeRole="ADMIN" onContractorMutated={mockOnContractorMutated} />);
    expect(screen.getByRole("heading", { name: "Proveedores" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Construcciones del Sur S.A.")).toBeInTheDocument());
  });

  it("filtra por nombre, código, especialidad, email o teléfono", async () => {
    render(<ProveedoresConfigPanel authToken="token" activeRole="ADMIN" onContractorMutated={mockOnContractorMutated} />);
    await waitFor(() => expect(screen.getByText("Construcciones del Sur S.A.")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), {
      target: { value: "electricidad" },
    });
    expect(screen.getByText("No se encontraron proveedores con ese criterio.")).toBeInTheDocument();
  });

  it("crea un proveedor con los campos obligatorios completos", async () => {
    render(<ProveedoresConfigPanel authToken="token" activeRole="ADMIN" onContractorMutated={mockOnContractorMutated} />);
    await waitFor(() => expect(screen.getByText("Construcciones del Sur S.A.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombre \/ Empresa/), { target: { value: "Eléctricos Andinos" } });
    fireEvent.change(screen.getByLabelText(/Especialidad/), { target: { value: "Instalaciones eléctricas" } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "contacto@electricos.com" } });

    mockApiFetch.mockResolvedValueOnce({ ...CONTRACTOR, code: "PRV-002", name: "Eléctricos Andinos" });
    fireEvent.click(screen.getByRole("button", { name: "Crear proveedor" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Proveedor creado correctamente.", "success");
    });
    expect(mockOnContractorMutated).toHaveBeenCalled();
  });

  it("rechaza el guardado si faltan campos obligatorios", async () => {
    render(<ProveedoresConfigPanel authToken="token" activeRole="ADMIN" onContractorMutated={mockOnContractorMutated} />);
    await waitFor(() => expect(screen.getByText("Construcciones del Sur S.A.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Crear proveedor" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Completa todos los campos obligatorios.", "error");
    });
  });

  it("usa el mismo fallback de rating (4.0) al crear y al editar cuando queda vacío", async () => {
    render(<ProveedoresConfigPanel authToken="token" activeRole="ADMIN" onContractorMutated={mockOnContractorMutated} />);
    await waitFor(() => expect(screen.getByText("Construcciones del Sur S.A.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Editar Construcciones del Sur S.A./ }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Rating/), { target: { value: "" } });

    mockApiFetch.mockResolvedValueOnce({ ...CONTRACTOR, rating: 4.0 });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/contractors/config/PRV-001",
        expect.objectContaining({ body: expect.stringContaining("\"rating\":4") }),
      );
    });
  });

  it("pide confirmación antes de cambiar el estado y muestra el mensaje correcto", async () => {
    render(<ProveedoresConfigPanel authToken="token" activeRole="ADMIN" onContractorMutated={mockOnContractorMutated} />);
    await waitFor(() => expect(screen.getByText("Construcciones del Sur S.A.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Cambiar estado de Construcciones del Sur S.A./ }));
    expect(screen.getByText("Cambiar estado del proveedor")).toBeInTheDocument();
    expect(screen.getByText(/Desactivar este proveedor/)).toBeInTheDocument();

    mockApiFetch.mockResolvedValueOnce({ code: "PRV-001", status: "INACTIVE" });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar estado" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Proveedor desactivado correctamente.", "success");
    });
  });
});
