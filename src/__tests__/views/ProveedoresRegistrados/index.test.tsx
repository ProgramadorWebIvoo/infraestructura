/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para ProveedoresRegistrados — verifica que los modales
 * de "evaluación" (rating) e "invitación" (link de propuesta) sean
 * mutuamente excluyentes. Bug previo: dos useState independientes permitían
 * que ambos quedaran abiertos a la vez (mismo z-index), lo que además
 * bloqueaba clicks sobre el selector de obra del modal de invitación.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProveedoresRegistrados from "@/views/ProveedoresRegistrados";
import { ToastProvider } from "@/components/UI/Toast";
import type { Contractor, Project } from "@/types";
import { ProjectStatus } from "@/types";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, layout, ...rest } = props;
      return <tr {...rest}>{children}</tr>;
    },
  },
}));

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

vi.mock("@/hooks/useProveedores", () => ({
  useProveedores: () => ({
    proposals: [],
    isLoadingProposals: false,
    handleInviteSupplier: vi.fn().mockResolvedValue({ token: "tok", projectTitle: "Obra 1" }),
  }),
}));

const contractors: Contractor[] = [
  { code: "P-001", name: "Constructora Acme", specialty: "Electricidad", rating: 4.2, contact: "acme@test.com" },
];

const projects: Project[] = [
  {
    id: "OBRA-1",
    title: "Obra 1",
    type: "INFRAESTRUCTURA",
    description: "",
    location: "",
    createdDate: "2026-01-01",
    status: ProjectStatus.EN_EJECUCION,
    materials: [],
    estimatedTotal: 0,
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProveedoresRegistrados — modales mutuamente excluyentes", () => {
  it("abrir invitar mientras rating está abierto cierra el de rating (no quedan los dos abiertos)", () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <ProveedoresRegistrados
            contractors={contractors}
            projects={projects}
            authToken="tok"
            onUpdateContractorRating={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Actualizar evaluación"));
    expect(screen.getByText("Evaluacion de proveedor")).toBeInTheDocument();
    expect(screen.queryByText("Propuesta de materiales")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Generar enlace de propuesta de materiales"));

    // Solo el modal de invitación debe seguir montado; el de rating se cierra.
    expect(screen.queryByText("Evaluacion de proveedor")).not.toBeInTheDocument();
    expect(screen.getByText("Propuesta de materiales")).toBeInTheDocument();
  });

  it("el select de obra es clickeable dentro del modal de invitación", () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <ProveedoresRegistrados
            contractors={contractors}
            projects={projects}
            authToken="tok"
            onUpdateContractorRating={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Actualizar evaluación"));
    fireEvent.click(screen.getByLabelText("Generar enlace de propuesta de materiales"));

    const projectOption = screen.getByText("Obra 1");
    fireEvent.click(projectOption);

    const generateButton = screen.getByRole("button", { name: /Generar enlace unico/i });
    expect(generateButton).not.toBeDisabled();
  });
});
