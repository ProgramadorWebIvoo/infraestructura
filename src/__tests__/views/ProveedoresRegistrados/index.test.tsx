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

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();

  // motion/react expone `motion` como un Proxy dinámico (motion.div, motion.span,
  // etc. se resuelven al vuelo) — spread-earlo (`{...actual.motion}`) no copia
  // esas propiedades. Se envuelve en otro Proxy que intercepta solo los pocos
  // tags usados en este árbol de componentes (para stripear props de animación
  // que JSDOM no entiende) y delega el resto (incluido `span`, usado por
  // KpiPill con un MotionValue real) al Proxy original.
  const overrides: Record<string, (props: React.PropsWithChildren<Record<string, unknown>>) => React.ReactElement> = {
    div: ({ children, ...props }) => {
      const { initial, animate, exit, variants, transition, layoutId, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    tbody: ({ children, ...props }) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }) => {
      const { initial, animate, exit, variants, transition, layout, ...rest } = props;
      return <tr {...rest}>{children}</tr>;
    },
    button: ({ children, ...props }) => {
      const { initial, animate, exit, variants, transition, whileHover, whileTap, layoutId, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  };

  return {
    ...actual,
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(actual.motion, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && prop in overrides) {
          return overrides[prop];
        }
        return Reflect.get(target, prop, receiver);
      },
    }),
  };
});

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
  { code: "P-001", name: "Constructora Acme", specialty: "Electricidad", rating: 4.2, email: "acme@test.com" },
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

    fireEvent.click(screen.getByLabelText("Actualizar evaluación de Constructora Acme"));
    expect(screen.getByText("Evaluación de proveedor")).toBeInTheDocument();
    expect(screen.queryByText("Propuesta de materiales")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Generar enlace de propuesta para Constructora Acme"));

    // Solo el modal de invitación debe seguir montado; el de rating se cierra.
    expect(screen.queryByText("Evaluación de proveedor")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByLabelText("Actualizar evaluación de Constructora Acme"));
    fireEvent.click(screen.getByLabelText("Generar enlace de propuesta para Constructora Acme"));

    const projectOption = screen.getByText("Obra 1");
    fireEvent.click(projectOption);

    const generateButton = screen.getByRole("button", { name: /Generar enlace único/i });
    expect(generateButton).not.toBeDisabled();
  });
});
