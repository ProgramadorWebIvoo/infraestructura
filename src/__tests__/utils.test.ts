import { describe, it, expect } from "vitest";
import { getRoleColor } from "@/utils";

describe("getRoleColor", () => {
  it("es determinístico: el mismo rol siempre retorna el mismo color", () => {
    expect(getRoleColor("SUPERADMIN")).toBe(getRoleColor("SUPERADMIN"));
    expect(getRoleColor("FINANZAS")).toBe(getRoleColor("FINANZAS"));
  });

  it("retorna una clase Tailwind válida (bg-/text-/border-)", () => {
    const classes = getRoleColor("ANALISTA");
    expect(classes).toMatch(/^bg-\S+ text-\S+ border-\S+$/);
  });

  it("un rol nuevo (no listado explícitamente) igual obtiene un color", () => {
    expect(getRoleColor("ROL_FUTURO_INEXISTENTE")).toMatch(/^bg-/);
  });

  it("retorna el fallback gris para rol vacío", () => {
    expect(getRoleColor("")).toBe("bg-slate-50 text-slate-800 border-slate-200");
  });
});
