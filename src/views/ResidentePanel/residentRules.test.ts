import { describe, expect, it } from "vitest";
import type { ResidentProject } from "@/hooks/useResidentProjects";
import { filterResidentProjects, hasResidentPhoto, reportState, sortPendingFirst, toClosureReport, validateResidentPhoto } from "./residentRules";

const project = (id: string, pendingAction: boolean, photos: ResidentProject["closure"] extends infer C ? any : never = []): ResidentProject => ({
  id, title: id, location: "L", description: null, status: "INFORME_ENVIADO", pendingAction,
  closure: { status: "ENVIADO", revision: 1, submittedAt: null, rejectionReason: null, rejectionTarget: null, residentNotes: null, residentVerifiedAt: null, items: [], photos },
});

describe("residentRules", () => {
  it("ordena primero las obras pendientes sin perder el orden relativo", () => {
    expect(sortPendingFirst([project("a", false), project("b", true), project("c", false), project("d", true)]).map((p) => p.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("distingue informe por cargar, devuelto por Auditoría y enviado", () => {
    const returned = { ...project("r", true), closure: { ...project("r", true).closure!, rejectionTarget: "RESIDENTE" as const } };
    expect(reportState(project("a", true))).toBe("PENDIENTE");
    expect(reportState(returned)).toBe("DEVUELTO");
    expect(reportState(project("b", false))).toBe("ENVIADO");
  });

  it("filtra por texto (título, ID, ubicación) y por estado sin alterar el orden", () => {
    const list = [
      { ...project("PRJ-001", true), title: "Tienda Norte", location: "Caracas" },
      { ...project("PRJ-002", false), title: "Planta Sur", location: "Valencia" },
      { ...project("PRJ-003", true), title: "Oficina Este", location: "Caracas" },
    ];
    expect(filterResidentProjects(list, "caracas", "ALL").map((p) => p.id)).toEqual(["PRJ-001", "PRJ-003"]);
    expect(filterResidentProjects(list, "prj-002", "ALL").map((p) => p.id)).toEqual(["PRJ-002"]);
    expect(filterResidentProjects(list, "", "ENVIADO").map((p) => p.id)).toEqual(["PRJ-002"]);
    expect(filterResidentProjects(list, "planta", "PENDIENTE")).toEqual([]);
    expect(filterResidentProjects(list, "  ", "ALL")).toHaveLength(3);
  });

  it("valida tipo y tamaño de la foto", () => {
    expect(validateResidentPhoto({ name: "a.jpg", type: "image/jpeg", size: 100 })).toBeNull();
    expect(validateResidentPhoto({ name: "a.pdf", type: "application/pdf", size: 100 })).toMatch(/JPG, PNG o WEBP/);
    expect(validateResidentPhoto({ name: "a.png", type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });

  it("exige foto del residente y no cuenta las del proveedor", () => {
    const contractor = [{ id: 1, itemId: null, uploadedByType: "CONTRATISTA", originalName: "x", path: "p" }];
    expect(hasResidentPhoto(project("a", true, contractor))).toBe(false);
    expect(hasResidentPhoto(project("a", true, [{ ...contractor[0], uploadedByType: "RESIDENTE" }]))).toBe(true);
  });

  it("adapta el informe sin exponer dinero y devuelve null sin informe", () => {
    const report = toClosureReport(project("a", true));
    expect(report).not.toBeNull();
    expect(report).not.toHaveProperty("finiquitoAmount");
    expect(toClosureReport({ ...project("b", false), closure: null })).toBeNull();
  });
});
