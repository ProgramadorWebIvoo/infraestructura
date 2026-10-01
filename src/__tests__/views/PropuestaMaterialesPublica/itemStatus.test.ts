import { describe, it, expect } from "vitest";
import { canBeBulkSource, getItemStatus, planBulkApply } from "@/views/PropuestaMaterialesPublica/itemStatus";
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

describe("planBulkApply", () => {
  const source = priced({ _id: "src", conditionStatus: "new", warrantyDescription: "12 meses de fábrica", warrantyValue: 12, warrantyUnit: "meses" });

  it("no hay plan si la línea origen no está completa", () => {
    expect(canBeBulkSource(priced({ conditionStatus: "new" }))).toBe(false);
    expect(planBulkApply([priced({ conditionStatus: "new" }), priced({ _id: "2" })], 0)).toEqual([]);
    expect(planBulkApply([{ ...source, warrantyValue: 12, warrantyUnit: undefined }, priced({ _id: "2" })], 0)).toEqual([]);
  });

  it("solo toca líneas cotizadas: las sin precio se ignoran", () => {
    const plan = planBulkApply([source, base, priced({ _id: "3" })], 0);
    expect(plan.map((e) => e.index)).toEqual([2]);
  });

  it("copia condición, garantía y duración a una línea vacía", () => {
    const [entry] = planBulkApply([source, priced({ _id: "2" })], 0);
    expect(entry.index).toBe(1);
    expect(entry.patch).toEqual({ conditionStatus: "new", warrantyDescription: "12 meses de fábrica", warrantyValue: 12, warrantyUnit: "meses" });
  });

  it("nunca pisa lo ya cargado: solo completa los vacíos", () => {
    const onlyCondition = priced({ _id: "2", conditionStatus: "used" });
    const onlyWarranty = priced({ _id: "3", warrantyDescription: "Sin garantía" });
    const plan = planBulkApply([source, onlyCondition, onlyWarranty], 0);

    expect(plan.find((e) => e.index === 1)?.patch).toEqual({ warrantyDescription: "12 meses de fábrica", warrantyValue: 12, warrantyUnit: "meses" });
    expect(plan.find((e) => e.index === 2)?.patch).toEqual({ conditionStatus: "new" });
  });

  it("respeta una duración propia de la línea destino", () => {
    const own = priced({ _id: "2", warrantyValue: 6, warrantyUnit: "dias" });
    const [entry] = planBulkApply([source, own], 0);
    expect(entry.patch).toEqual({ conditionStatus: "new", warrantyDescription: "12 meses de fábrica" });
  });

  it("las líneas ya completas no entran al plan", () => {
    const done = priced({ _id: "2", conditionStatus: "used", warrantyDescription: "Otra" });
    expect(planBulkApply([source, done], 0)).toEqual([]);
  });
});
