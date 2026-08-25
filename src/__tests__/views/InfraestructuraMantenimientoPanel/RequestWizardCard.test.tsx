/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de integración para RequestWizardCard — Stepper + 3 pasos +
 * navegación + submit final, reemplaza la cobertura de submit que antes
 * vivía en RequestFormSection.test.tsx.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequestWizardCard from "@/views/InfraestructuraMantenimientoPanel/components/RequestWizardCard";
import { useRequestForm } from "@/hooks/useRequestForm";
import { ToastProvider } from "@/components/UI/Toast";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
    tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, layout, ...rest } = props;
      return <tr {...rest}>{children}</tr>;
    },
    li: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, layout, ...rest } = props;
      return <li {...rest}>{children}</li>;
    },
  },
}));

vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("@/hooks/useAppGroupSettings", () => ({
  useAppGroupSettings: () => ({ maxFileSizeBytes: 10 * 1024 * 1024 }),
}));

afterEach(() => vi.restoreAllMocks());

const materialsCatalog = [{ name: "Cemento", unit: "Saco", estimatedUnitPrice: 12.5 }];

function Harness({ onAddProject }: { onAddProject: Parameters<typeof useRequestForm>[0]["onAddProject"] }) {
  const form = useRequestForm({ onAddProject });
  return <RequestWizardCard form={form} materialsCatalog={materialsCatalog} />;
}

function renderWizard(onAddProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] })) {
  render(
    <ToastProvider>
      <Harness onAddProject={onAddProject} />
    </ToastProvider>,
  );
  return { onAddProject };
}

describe("RequestWizardCard", () => {
  it("empieza en el paso 1 (Datos de la Obra)", () => {
    renderWizard();
    expect(screen.getByLabelText("Título de la Obra")).toBeInTheDocument();
  });

  it("no avanza al paso 2 sin completar los datos obligatorios", () => {
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("El título de la obra o trabajo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByLabelText("Título de la Obra")).toBeInTheDocument();
  });

  it("navega datos -> materiales -> adjuntos completando cada paso", () => {
    renderWizard();

    fireEvent.change(screen.getByLabelText("Título de la Obra"), { target: { value: "Reparación" } });
    fireEvent.change(screen.getByLabelText("Ubicación / Tienda / CD"), { target: { value: "CD Central" } });
    fireEvent.change(screen.getByLabelText("Descripción del Trabajo"), { target: { value: "Descripción" } });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    expect(screen.getByText("Elegir materiales del catálogo...")).toBeInTheDocument();

    // Sin materiales, no debe avanzar
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("Agrega al menos un material o servicio a la petición.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Elegir materiales del catálogo..."));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByText("Agregar 1 material"));
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    expect(screen.getByText("Fotos del Sitio")).toBeInTheDocument();
  });

  it("permite retroceder al paso anterior sin perder los datos ya ingresados", () => {
    renderWizard();

    fireEvent.change(screen.getByLabelText("Título de la Obra"), { target: { value: "Reparación" } });
    fireEvent.change(screen.getByLabelText("Ubicación / Tienda / CD"), { target: { value: "CD Central" } });
    fireEvent.change(screen.getByLabelText("Descripción del Trabajo"), { target: { value: "Descripción" } });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    fireEvent.click(screen.getByRole("button", { name: /Atrás/ }));

    expect(screen.getByLabelText("Título de la Obra")).toHaveValue("Reparación");
  });

  it("envía la petición al llegar al último paso con datos válidos", async () => {
    const { onAddProject } = renderWizard();

    fireEvent.change(screen.getByLabelText("Título de la Obra"), { target: { value: "Reparación" } });
    fireEvent.change(screen.getByLabelText("Ubicación / Tienda / CD"), { target: { value: "CD Central" } });
    fireEvent.change(screen.getByLabelText("Descripción del Trabajo"), { target: { value: "Descripción" } });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    fireEvent.click(screen.getByText("Elegir materiales del catálogo..."));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByText("Agregar 1 material"));
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    const photo = new File(["x"], "foto.png", { type: "image/png" });
    fireEvent.change(screen.getAllByTestId("file-input")[0], { target: { files: [photo] } });

    fireEvent.click(screen.getByRole("button", { name: /Enviar Petición a Cierre de Obra/ }));

    await waitFor(() => expect(onAddProject).toHaveBeenCalledTimes(1));
    expect(onAddProject).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reparación", location: "CD Central" }),
      { photos: [photo], documents: [], plans: [] },
    );
  });

  it("no envía si no hay ningún archivo adjunto y muestra el error", async () => {
    const { onAddProject } = renderWizard();

    fireEvent.change(screen.getByLabelText("Título de la Obra"), { target: { value: "Reparación" } });
    fireEvent.change(screen.getByLabelText("Ubicación / Tienda / CD"), { target: { value: "CD Central" } });
    fireEvent.change(screen.getByLabelText("Descripción del Trabajo"), { target: { value: "Descripción" } });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    fireEvent.click(screen.getByText("Elegir materiales del catálogo..."));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByText("Agregar 1 material"));
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    fireEvent.click(screen.getByRole("button", { name: /Enviar Petición a Cierre de Obra/ }));

    expect(onAddProject).not.toHaveBeenCalled();
    expect(
      screen.getByText("Adjunta al menos un archivo (foto, documento o plano) antes de continuar."),
    ).toBeInTheDocument();
  });
});
