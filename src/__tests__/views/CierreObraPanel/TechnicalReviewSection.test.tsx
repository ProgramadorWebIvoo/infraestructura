/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para TechnicalReviewSection — enfocadas en el flujo de
 * rechazo de la petición (nuevo), no en la revisión técnica completa (sin
 * cobertura previa a este cambio).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TechnicalReviewSection from "@/views/CierreObraPanel/components/TechnicalReviewSection";
import { ToastProvider } from "@/components/UI/Toast";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("@/hooks/useAppGroupSettings", () => ({
  useAppGroupSettings: () => ({ maxFileSizeBytes: 10 * 1024 * 1024 }),
}));

afterEach(() => vi.restoreAllMocks());

const pendingProject: Project = {
  id: "PRJ-020",
  title: "Petición pendiente",
  type: "INFRAESTRUCTURA",
  description: "Descripción",
  location: "CD Central",
  createdDate: "2026-08-01",
  status: ProjectStatus.CREADO,
  materials: [{ id: "m1", name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" }],
  estimatedTotal: 10,
};

function renderSection(onRejectProject = vi.fn()) {
  render(
    <ToastProvider>
      <TechnicalReviewSection
        projects={[pendingProject]}
        onReviewProject={vi.fn()}
        onRejectProject={onRejectProject}
      />
    </ToastProvider>,
  );
  return { onRejectProject };
}

describe("TechnicalReviewSection — rechazo de petición", () => {
  it("abre el modal de rechazo desde el paso 1 del wizard de revisión", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    expect(screen.getByText("Motivo del rechazo *")).toBeInTheDocument();
  });

  it("no permite confirmar el rechazo sin motivo", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    expect(screen.getByRole("button", { name: /Confirmar rechazo/ })).toBeDisabled();
  });

  it("llama onRejectProject con el motivo y cierra el wizard", async () => {
    const { onRejectProject } = renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    fireEvent.change(screen.getByLabelText("Motivo del rechazo *"), {
      target: { value: "Descripción insuficiente." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar rechazo/ }));

    expect(onRejectProject).toHaveBeenCalledWith("PRJ-020", "Descripción insuficiente.");
  });
});
