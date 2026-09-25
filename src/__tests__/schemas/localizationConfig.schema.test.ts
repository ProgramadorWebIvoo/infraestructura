import { describe, it, expect } from "vitest";
import { localizationConfigSchema, residentChangeReasonError } from "@/schemas/localizationConfig.schema";

describe("localizationConfigSchema", () => {
  const valid = { title: "Tienda Sur", city: "Valencia", type: "TIENDA", residentUserId: 3 };

  it("accepts a complete location", () => {
    expect(localizationConfigSchema.safeParse(valid).success).toBe(true);
  });

  it("requires title and city", () => {
    expect(localizationConfigSchema.safeParse({ ...valid, title: " " }).success).toBe(false);
    expect(localizationConfigSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
  });

  it("requires a resident", () => {
    expect(localizationConfigSchema.safeParse({ ...valid, residentUserId: null }).success).toBe(false);
  });

  it("rejects unknown types", () => {
    expect(localizationConfigSchema.safeParse({ ...valid, type: "BODEGA" }).success).toBe(false);
  });
});

describe("residentChangeReasonError", () => {
  it("needs no reason on creation or when the resident is unchanged", () => {
    expect(residentChangeReasonError(null, 3, "")).toBeNull();
    expect(residentChangeReasonError(3, 3, "")).toBeNull();
  });

  it("requires a reason when an existing location changes resident", () => {
    expect(residentChangeReasonError(3, 4, "")).toMatch(/motivo/i);
    expect(residentChangeReasonError(3, 4, "ab")).toMatch(/motivo/i);
    expect(residentChangeReasonError(3, 4, "Licencia")).toBeNull();
  });
});
