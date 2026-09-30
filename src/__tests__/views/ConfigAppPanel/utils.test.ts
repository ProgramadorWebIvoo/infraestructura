import { describe, it, expect } from "vitest";
import { isDirtySettingValue, isDirtyRuleValue, formatRangeBound } from "@/views/ConfigAppPanel/utils";

describe("isDirtySettingValue", () => {
  it("para tipos escalares, compara el string crudo", () => {
    expect(isDirtySettingValue("integer", "10", "10")).toBe(false);
    expect(isDirtySettingValue("integer", "10", "20")).toBe(true);
    expect(isDirtySettingValue("string", "a", "b")).toBe(true);
  });

  it("para json, compara como conjuntos ordenados (ignora orden de inserción)", () => {
    expect(isDirtySettingValue("json", '["a","b"]', '["b","a"]')).toBe(false);
    expect(isDirtySettingValue("json", '["a","b"]', '["a","c"]')).toBe(true);
    expect(isDirtySettingValue("json", '["a"]', '["a","b"]')).toBe(true);
  });

  it("para json inválido, cae a comparación de string", () => {
    expect(isDirtySettingValue("json", "no es json", "no es json")).toBe(false);
    expect(isDirtySettingValue("json", "no es json", "otro texto")).toBe(true);
  });
});

describe("isDirtyRuleValue", () => {
  it("compara roles de app y mail como conjuntos, no como arrays ordenados", () => {
    expect(isDirtyRuleValue({ app: ["A", "B"], mail: [], appEnabled: true, mailEnabled: true }, { app: ["B", "A"], mail: [], appEnabled: true, mailEnabled: true })).toBe(false);
    expect(isDirtyRuleValue({ app: ["A"], mail: [], appEnabled: true, mailEnabled: true }, { app: ["B"], mail: [], appEnabled: true, mailEnabled: true })).toBe(true);
    expect(isDirtyRuleValue({ app: [], mail: ["X"], appEnabled: true, mailEnabled: true }, { app: [], mail: [], appEnabled: true, mailEnabled: true })).toBe(true);
  });

  it("los toggles de canal también cuentan como cambio", () => {
    const saved = { app: ["A"], mail: [], appEnabled: true, mailEnabled: true };
    expect(isDirtyRuleValue({ ...saved, appEnabled: false }, saved)).toBe(true);
    expect(isDirtyRuleValue({ ...saved, mailEnabled: false }, saved)).toBe(true);
    expect(isDirtyRuleValue({ ...saved }, saved)).toBe(false);
  });
});

describe("formatRangeBound", () => {
  it("redondea a entero para settings type: integer, sin decimales", () => {
    expect(formatRangeBound(1.0, "integer")).toBe("1");
    expect(formatRangeBound(100.0, "integer")).toBe("100");
  });

  it("conserva decimales para settings type: float", () => {
    expect(formatRangeBound(0.5, "float")).toBe("0.5");
    expect(formatRangeBound(0, "float")).toBe("0");
  });
});
