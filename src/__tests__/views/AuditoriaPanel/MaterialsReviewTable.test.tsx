import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaterialsReviewTable } from "@/views/AuditoriaPanel/components/TechnicalReviewPresentational";
import ExpedienteDetailTab from "@/views/AuditoriaPanel/components/ExpedienteDetailTab";
import type { MaterialItem, Project } from "@/types";

const makeMaterials = (n: number): MaterialItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i + 1}`,
    name: `Material ${String(i + 1).padStart(2, "0")}`,
    quantity: i + 1,
    unit: "und",
    estimatedUnitPrice: 10,
    condition: "NUEVO",
    brand: i === 41 ? "Pedrollo" : undefined,
  })) as MaterialItem[];

const dataRows = (name: string) => within(screen.getByRole("table", { name })).getAllByRole("row").length - 1;

describe("MaterialsReviewTable — 70 materiales", () => {
  it("muestra una sola página en lugar de los 70", () => {
    render(<MaterialsReviewTable materials={makeMaterials(70)} />);
    expect(dataRows("Materiales solicitados")).toBe(8);
  });

  it("conserva marca y garantía de cada material", () => {
    const materials = makeMaterials(3);
    materials[0] = { ...materials[0], brand: "Pedrollo", model: "X1", warrantyValue: 6, warrantyUnit: "MESES" } as MaterialItem;
    render(<MaterialsReviewTable materials={materials} />);
    expect(screen.getByText(/Pedrollo/)).toBeInTheDocument();
    expect(screen.getByText(/Garantía: 6 meses/)).toBeInTheDocument();
  });

  it("el buscador encuentra por nombre o por marca en otra página", async () => {
    render(<MaterialsReviewTable materials={makeMaterials(70)} />);
    await userEvent.type(screen.getByRole("searchbox"), "pedrollo");
    expect(dataRows("Materiales solicitados")).toBe(1);
    expect(screen.getByText("Material 42")).toBeInTheDocument();
  });
});

describe("ExpedienteDetailTab — 70 materiales", () => {
  it("pagina la lista de materiales del expediente", () => {
    const project = {
      id: "P1", title: "Obra", description: "d", location: "l", status: "CREADO", type: "INFRAESTRUCTURA", createdDate: "2026-01-01",
      materials: makeMaterials(70), documents: [],
    } as unknown as Project;
    render(<ExpedienteDetailTab project={project} rejectionCount={0} />);

    expect(screen.getByText("Materiales (70)")).toBeInTheDocument();
    expect(dataRows("Materiales del expediente")).toBe(8);
  });
});
