/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para HomePanel — contenido derivado por rol (KPIs +
 * accesos a módulos), sin backend nuevo (todo se deriva de `projects`).
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePanel from "@/views/HomePanel";
import { ProjectStatus } from "@/types";
import type { AuditLog, Project } from "@/types";

vi.mock("motion/react", () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const { initial, animate, exit, variants, transition, layout, whileHover, whileTap, whileInView, viewport, ...rest } = props;
    return rest;
  };
  return {
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
            React.createElement(tag, stripMotionProps(props), children),
      },
    ),
  };
});

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: "P-1",
    title: "Proyecto de prueba",
    type: "INFRAESTRUCTURA",
    description: "desc",
    location: "loc",
    createdDate: "2026-01-01",
    status: ProjectStatus.CREADO,
    materials: [],
    estimatedTotal: 0,
    ...overrides,
  };
}

function renderHome(props: Partial<React.ComponentProps<typeof HomePanel>> = {}) {
  return render(
    <MemoryRouter>
      <HomePanel
        user={{ name: "Ana Torres", email: "ana@ivoo.local" }}
        activeRole="CIERRE_DE_OBRA"
        projects={[]}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("HomePanel", () => {
  it("muestra un skeleton mientras isLoading es true", () => {
    renderHome({ isLoading: true });
    expect(screen.queryByText(/Tus módulos/i)).not.toBeInTheDocument();
  });

  it("saluda usando el primer nombre del usuario", () => {
    renderHome();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });

  it("muestra el label del rol activo", () => {
    renderHome({ activeRole: "CIERRE_DE_OBRA" });
    expect(screen.getByText("Cierre de Obra", { selector: "h1" })).toBeInTheDocument();
  });

  it("un rol de una sola vista (CIERRE_DE_OBRA) solo ofrece acceso a su propio módulo", () => {
    renderHome({ activeRole: "CIERRE_DE_OBRA" });
    expect(screen.getByText("Cierre de Obra", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Finanzas")).not.toBeInTheDocument();
    expect(screen.queryByText("Procura")).not.toBeInTheDocument();
  });

  it("calcula el KPI 'Por revisar' de Cierre de Obra contando proyectos CREADO y los lista", () => {
    const projects = [
      makeProject({ id: "OBRA-100", title: "Puente Norte", status: ProjectStatus.CREADO }),
      makeProject({ id: "OBRA-200", title: "Vía Sur", status: ProjectStatus.CREADO }),
      makeProject({ id: "OBRA-300", title: "Planta Este", status: ProjectStatus.EN_EJECUCION }),
    ];
    renderHome({ activeRole: "CIERRE_DE_OBRA", projects });

    const kpiHeading = screen.getByText("Por revisar");
    const kpiCard = kpiHeading.closest("div.group") as HTMLElement;
    expect(within(kpiCard).getByText("2")).toBeInTheDocument();
    expect(within(kpiCard).getByText("Puente Norte")).toBeInTheDocument();
    expect(within(kpiCard).getByText("Vía Sur")).toBeInTheDocument();
    expect(within(kpiCard).queryByText("Planta Este")).not.toBeInTheDocument();
  });

  it("un rol multi-vista (SUPERADMIN) ofrece accesos a todos sus módulos", () => {
    renderHome({ activeRole: "SUPERADMIN" });
    expect(screen.getByText("Presidencia")).toBeInTheDocument();
    expect(screen.getByText("Infra / Mant")).toBeInTheDocument();
    expect(screen.getByText("Cierre de Obra", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Procura")).toBeInTheDocument();
    expect(screen.getByText("Analistas")).toBeInTheDocument();
    expect(screen.getByText("Finanzas")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
  });

  it("un rol sin config específica cae al fallback sin romper", () => {
    renderHome({ activeRole: "ROL_INEXISTENTE" });
    expect(screen.getByText(/Bienvenido al sistema/i)).toBeInTheDocument();
  });

  it("los accesos a módulos apuntan a la ruta correcta", () => {
    renderHome({ activeRole: "FINANZAS" });
    const link = screen.getByRole("link", { name: /Finanzas/i });
    expect(link).toHaveAttribute("href", "/finanzas");
  });

  it("muestra actividad reciente cuando hay auditLogs", () => {
    const auditLogs: AuditLog[] = [
      {
        id: "LOG-1",
        projectId: "OBRA-1",
        projectTitle: "Puente Norte",
        role: "CIERRE_DE_OBRA",
        userName: "Ana Torres",
        action: "Revisión de documentos",
        timestamp: new Date().toISOString(),
      },
    ];
    renderHome({ auditLogs });

    expect(screen.getByText("Revisión de documentos")).toBeInTheDocument();
    expect(screen.getByText("Puente Norte")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay actividad reciente", () => {
    renderHome({ auditLogs: [] });
    expect(screen.getByText(/Sin actividad reciente/i)).toBeInTheDocument();
  });

  it("muestra el mensaje dinámico de pendientes cuando hay un solo KPI con proyectos", () => {
    const projects = [makeProject({ id: "1", status: ProjectStatus.CREADO })];
    renderHome({ activeRole: "CIERRE_DE_OBRA", projects });
    expect(screen.getByText(/Hay 1 expediente en "por revisar"/i)).toBeInTheDocument();
  });

  it("muestra confirmación de 'al día' cuando ningún KPI tiene pendientes", () => {
    renderHome({ activeRole: "CIERRE_DE_OBRA", projects: [] });
    expect(screen.getByText(/Todo al día/i)).toBeInTheDocument();
  });

  it("muestra el banner de anuncio cuando se provee announcement", () => {
    renderHome({ announcement: "Mantenimiento programado el viernes." });
    expect(screen.getByText("Mantenimiento programado el viernes.")).toBeInTheDocument();
  });

  it("no muestra ningún banner de anuncio cuando announcement es null", () => {
    renderHome({ announcement: null });
    expect(screen.queryByText(/Mantenimiento/i)).not.toBeInTheDocument();
  });
});
