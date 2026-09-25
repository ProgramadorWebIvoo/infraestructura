import { describe, expect, it } from "vitest";
import { toResidentProject } from "./useResidentProjects";

describe("toResidentProject", () => {
  it("completa unitPriceUsd a null para reutilizar los componentes del cierre", () => {
    const project = toResidentProject({
      id: "1", title: "Obra", location: "Caracas", description: null, status: "INFORME_ENVIADO", pendingAction: true,
      closure: {
        status: "ENVIADO", revision: 1, contractorNotes: null, submittedAt: null, rejectionReason: null, rejectionTarget: null,
        residentNotes: null, residentVerifiedAt: null, photos: [],
        items: [{ id: 1, name: "Pintura", unit: "m2", contractedQuantity: 10, executedQuantity: 8, note: "x" }],
      },
    });
    expect(project.closure?.items[0].unitPriceUsd).toBeNull();
  });

  it("acepta obras sin informe", () => {
    expect(toResidentProject({ id: "2", title: "O", location: "L", description: null, status: "X", pendingAction: false, closure: null }).closure).toBeNull();
  });
});
