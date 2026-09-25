import { describe, it, expect } from "vitest";
import { buildLocationInput } from "@/utils/projectLocation";
import { validateDatosStep } from "@/hooks/useRequestForm";

describe("buildLocationInput", () => {
  it("sends only localizationId for a registered location", () => {
    expect(buildLocationInput("registered", 7, "texto ignorado")).toEqual({ localizationId: 7 });
  });

  it("sends only location for a custom one", () => {
    expect(buildLocationInput("custom", 7, "Galpón Maracay")).toEqual({ location: "Galpón Maracay" });
  });

  it("falls back to free text when registered mode has no selection", () => {
    expect(buildLocationInput("registered", null, "")).toEqual({ location: "" });
  });
});

describe("validateDatosStep — location source", () => {
  const base = { title: "Obra", description: "Alcance" };

  it("requires a picked location in registered mode", () => {
    const errors = validateDatosStep({ ...base, location: "", locationMode: "registered", localizationId: null });
    expect(errors.location).toMatch(/registrada/i);
  });

  it("ignores the free text in registered mode once a location is picked", () => {
    expect(validateDatosStep({ ...base, location: "", locationMode: "registered", localizationId: 3 })).toEqual({});
  });

  it("requires the free text in custom mode even if a registered one was picked before", () => {
    const errors = validateDatosStep({ ...base, location: " ", locationMode: "custom", localizationId: 3 });
    expect(errors.location).toBeDefined();
  });
});
