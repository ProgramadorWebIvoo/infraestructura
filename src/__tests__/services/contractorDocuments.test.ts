import { describe, it, expect } from "vitest";
import {
  buildContractorFormData,
  canManageContractorDocuments,
  missingRequiredTypes,
  type ContractorDocumentType,
} from "@/services/contractorDocuments";

const types: ContractorDocumentType[] = [
  { id: 1, key: "rif", label: "RIF", isRequired: true, isActive: true, sortOrder: 10 },
  { id: 2, key: "extra", label: "Extra", isRequired: false, isActive: true, sortOrder: 20 },
];

describe("contractorDocuments service helpers", () => {
  it("missingRequiredTypes lista solo los obligatorios sin archivo", () => {
    expect(missingRequiredTypes(types, {}).map((t) => t.id)).toEqual([1]);
    const file = new File(["x"], "rif.pdf", { type: "application/pdf" });
    expect(missingRequiredTypes(types, { 1: file })).toEqual([]);
  });

  it("buildContractorFormData omite nulos y usa documents[<typeId>]", () => {
    const file = new File(["x"], "rif.pdf", { type: "application/pdf" });
    const form = buildContractorFormData({ name: "ACME", phone: null, rating: 4 }, { 1: file, 2: undefined });
    expect(form.get("name")).toBe("ACME");
    expect(form.get("rating")).toBe("4");
    expect(form.has("phone")).toBe(false);
    expect((form.get("documents[1]") as File).name).toBe("rif.pdf");
    expect(form.has("documents[2]")).toBe(false);
  });

  it("solo ADMIN, SUPERADMIN y CATALOGOS gestionan documentos", () => {
    expect(canManageContractorDocuments("ADMIN")).toBe(true);
    expect(canManageContractorDocuments("CATALOGOS")).toBe(true);
    expect(canManageContractorDocuments("FINANZAS")).toBe(false);
    expect(canManageContractorDocuments(undefined)).toBe(false);
  });
});
