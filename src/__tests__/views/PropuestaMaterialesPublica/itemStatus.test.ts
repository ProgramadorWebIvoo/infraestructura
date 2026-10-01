import { describe, it, expect } from "vitest";
import { getItemStatus } from "@/views/PropuestaMaterialesPublica/itemStatus";
import type { ItemRow, PublicCatalogCategory } from "@/views/PropuestaMaterialesPublica/types";

const base: ItemRow = {
  _id: "1",
  materialName: "Cabilla",
  quantity: 10,
  unit: "und",
  unitPrice: 0,
  totalPrice: 0,
  notes: "",
  isCustom: false,
  conditionStatus: "",
  warrantyDescription: "",
  technicalSpecs: {},
};

const priced = (patch: Partial<ItemRow> = {}): ItemRow => ({ ...base, unitPrice: 5, totalPrice: 50, ...patch });

describe("getItemStatus", () => {
  it("sin precio es 'unpriced' aunque tenga otros datos", () => {
    expect(getItemStatus(base, undefined)).toBe("unpriced");
    expect(getItemStatus({ ...base, conditionStatus: "new", warrantyDescription: "1 año" }, undefined)).toBe("unpriced");
  });

  it("con precio pero sin condición o garantía faltan datos", () => {
    expect(getItemStatus(priced(), undefined)).toBe("missing");
    expect(getItemStatus(priced({ conditionStatus: "new" }), undefined)).toBe("missing");
    expect(getItemStatus(priced({ warrantyDescription: "1 año" }), undefined)).toBe("missing");
    expect(getItemStatus(priced({ conditionStatus: "new", warrantyDescription: "   " }), undefined)).toBe("missing");
  });

  it("con precio, condición y garantía está completo", () => {
    expect(getItemStatus(priced({ conditionStatus: "used", warrantyDescription: "Sin garantía" }), undefined)).toBe("complete");
  });

  it("un valor de duración de garantía sin unidad queda incompleto, incluso en 0", () => {
    const ok = priced({ conditionStatus: "new", warrantyDescription: "12 meses" });
    expect(getItemStatus({ ...ok, warrantyValue: 12 }, undefined)).toBe("missing");
    expect(getItemStatus({ ...ok, warrantyValue: 0 }, undefined)).toBe("missing");
    expect(getItemStatus({ ...ok, warrantyValue: 12, warrantyUnit: "meses" }, undefined)).toBe("complete");
    expect(getItemStatus({ ...ok, warrantyValue: "" }, undefined)).toBe("complete");
  });

  it("exige las specs obligatorias de la categoría", () => {
    const category: PublicCatalogCategory = {
      id: 1,
      name: "Acero",
      parent_id: null,
      spec_schema: [
        { key: "diametro", label: "Diámetro", type: "number", required: true },
        { key: "nota", label: "Nota", type: "text" },
      ],
    };
    const ok = priced({ conditionStatus: "new", warrantyDescription: "1 año" });
    expect(getItemStatus(ok, category)).toBe("missing");
    expect(getItemStatus({ ...ok, technicalSpecs: { diametro: 12 } }, category)).toBe("complete");
  });
});
