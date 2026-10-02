import { describe, it, expect } from "vitest";
import { getPendingFinancePayments, getReadyForFinanceCount } from "@/utils/workflowStatus";
import { ProjectStatus, type Project } from "@/types";

const project = (status: ProjectStatus) => ({ id: status, status }) as unknown as Project;

describe("getReadyForFinanceCount", () => {
  it("cuenta solo las obras aprobadas por Presidencia", () => {
    const projects = [
      project(ProjectStatus.APROBADO_PRESIDENCIA),
      project(ProjectStatus.PENDIENTE_PRESIDENCIA),
      project(ProjectStatus.CONTRATADO),
      { ...project(ProjectStatus.APROBADO_PRESIDENCIA), id: "otra" },
    ];

    expect(getReadyForFinanceCount(projects)).toBe(2);
  });

  it("devuelve 0 sin proyectos", () => {
    expect(getReadyForFinanceCount([])).toBe(0);
  });
});

describe("getPendingFinancePayments", () => {
  it("separa anticipos por liberar de finiquitos por liquidar", () => {
    const projects = [
      project(ProjectStatus.CONTRATADO),
      { ...project(ProjectStatus.CONTRATADO), id: "otra" },
      project(ProjectStatus.LISTO_PAGO_FINAL),
      project(ProjectStatus.EN_EJECUCION),
    ];

    expect(getPendingFinancePayments(projects)).toEqual({ advances: 2, settlements: 1 });
  });
});
