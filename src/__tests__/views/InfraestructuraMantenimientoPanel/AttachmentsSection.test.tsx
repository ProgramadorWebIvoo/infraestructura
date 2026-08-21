/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para AttachmentsSection — las 3 zonas de carga
 * (fotos/documentos/planos) del formulario unificado de Infraestructura.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AttachmentsSection from "@/views/InfraestructuraMantenimientoPanel/components/AttachmentsSection";
import { ToastProvider } from "@/components/UI/Toast";

vi.mock("@/hooks/useAppGroupSettings", () => ({
  useAppGroupSettings: () => ({ maxFileSizeBytes: 10 * 1024 * 1024 }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSection(overrides: Partial<React.ComponentProps<typeof AttachmentsSection>> = {}) {
  const props: React.ComponentProps<typeof AttachmentsSection> = {
    photoFiles: [],
    onPhotoFilesChange: vi.fn(),
    documentFiles: [],
    onDocumentFilesChange: vi.fn(),
    planFiles: [],
    onPlanFilesChange: vi.fn(),
    ...overrides,
  };
  render(
    <ToastProvider>
      <AttachmentsSection {...props} />
    </ToastProvider>,
  );
  return props;
}

describe("AttachmentsSection", () => {
  it("renderiza las 3 zonas de carga (fotos, documentos, planos)", () => {
    renderSection();

    expect(screen.getByText("Fotos del sitio")).toBeInTheDocument();
    expect(screen.getByText("Documentos / cubicaciones")).toBeInTheDocument();
    expect(screen.getByText("Planos de ingeniería")).toBeInTheDocument();
  });

  it("no muestra el banner de error cuando no se pasa error", () => {
    renderSection();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("muestra el banner de error cuando se pasa (falta al menos un archivo)", () => {
    renderSection({ error: "Adjunta al menos un archivo (foto, documento o plano) antes de continuar." });
    expect(
      screen.getByText("Adjunta al menos un archivo (foto, documento o plano) antes de continuar."),
    ).toBeInTheDocument();
  });
});
