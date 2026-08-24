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

vi.mock("motion/react", () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const { initial, animate, exit, variants, transition, layout, ...rest } = props;
    return rest;
  };
  return {
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...stripMotionProps(props)}>{children}</div>
      ),
      tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <tbody {...stripMotionProps(props)}>{children}</tbody>
      ),
      tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <tr {...stripMotionProps(props)}>{children}</tr>
      ),
      span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <span {...stripMotionProps(props)}>{children}</span>
      ),
    },
  };
});

vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("@/hooks/useAppGroupSettings", () => ({
  useAppGroupSettings: () => ({ maxFileSizeBytes: 10 * 1024 * 1024 }),
}));

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
  apiDownload: vi.fn(),
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

function renderSection(
  onRejectProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] }),
  onReviewProject = vi.fn(),
  projects: Project[] = [pendingProject],
) {
  render(
    <ToastProvider>
      <TechnicalReviewSection
        projects={projects}
        authToken="test-token"
        onReviewProject={onReviewProject}
        onRejectProject={onRejectProject}
      />
    </ToastProvider>,
  );
  return { onRejectProject, onReviewProject };
}

describe("TechnicalReviewSection — rechazo de petición", () => {
  it("abre el modal de rechazo desde el paso 1 del wizard de revisión", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    expect(screen.getByText("Motivo del rechazo")).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText("Motivo del rechazo"), {
      target: { value: "Descripción insuficiente." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar rechazo/ }));

    expect(onRejectProject).toHaveBeenCalledWith("PRJ-020", "Descripción insuficiente.", "", []);
  });

  it("permite escribir observaciones opcionales y las envía junto con el motivo", async () => {
    const { onRejectProject } = renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    fireEvent.change(screen.getByLabelText("Motivo del rechazo"), {
      target: { value: "Descripción insuficiente." },
    });
    fireEvent.change(screen.getByLabelText("Observaciones (opcional)"), {
      target: { value: "Revisar también la cubicación de concreto." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar rechazo/ }));

    expect(onRejectProject).toHaveBeenCalledWith(
      "PRJ-020",
      "Descripción insuficiente.",
      "Revisar también la cubicación de concreto.",
      [],
    );
  });
});

describe("TechnicalReviewSection — revisión (auditoría, sin subida de archivos)", () => {
  it("el paso 1 no precarga texto en Notas de Revisión — placeholder vacío", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));

    expect(screen.getByLabelText("Notas de Revisión y Corrección (opcional)")).toHaveValue("");
  });

  it("permite confirmar la revisión sin escribir notas ni requerir archivos adjuntos", async () => {
    const { onReviewProject } = renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ })); // paso 2
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ })); // paso 3
    fireEvent.click(screen.getByRole("button", { name: /Guardar y Enviar a Procura/ }));

    expect(onReviewProject).toHaveBeenCalledWith("PRJ-020", "");
  });

  it("el paso 2 no ofrece subir archivos — es de solo revisión", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(screen.queryByText("Hoja de Cálculo / Cubicaciones")).not.toBeInTheDocument();
    expect(screen.queryByText("Planos de Ingeniería")).not.toBeInTheDocument();
  });

  it("el paso 2 muestra un estado vacío cuando la petición no trae adjuntos", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(screen.getByText(/no trae fotos, cálculos ni planos adjuntos/)).toBeInTheDocument();
  });

  it("muestra el detalle de cada material: condición, marca y garantía", () => {
    renderSection(undefined, undefined, [
      {
        ...pendingProject,
        materials: [
          {
            id: "m1",
            name: "Bomba de agua",
            quantity: 2,
            unit: "unidad",
            estimatedUnitPrice: 100,
            condition: "USADO",
            brand: "Pedrollo",
            warrantyValue: 6,
            warrantyUnit: "MESES",
          },
        ],
      },
    ]);

    fireEvent.click(screen.getByText(pendingProject.title));

    expect(screen.getByText("Bomba de agua")).toBeInTheDocument();
    expect(screen.getByText("Usado")).toBeInTheDocument();
    expect(screen.getByText("Pedrollo")).toBeInTheDocument();
    expect(screen.getByText(/Garantía: 6 meses/)).toBeInTheDocument();
  });
});
