import { describe, it, expect } from "vitest";
import { buildSearchMatcher, MAX_REGEX_LENGTH } from "@/utils/debugSearch";

const entry = (searchText: string) => ({ searchText });

describe("buildSearchMatcher — texto plano", () => {
  it("sin consulta coincide con todo", () => {
    expect(buildSearchMatcher("  ", false).matches(entry("cualquier cosa"))).toBe(true);
  });

  it("busca sin distinguir mayúsculas (searchText ya está en minúsculas)", () => {
    const { matches } = buildSearchMatcher("GET /Projects", false);
    expect(matches(entry("get /projects — 200"))).toBe(true);
    expect(matches(entry("post /users"))).toBe(false);
  });

  it("en modo plano los caracteres regex son literales", () => {
    const { matches, error } = buildSearchMatcher("a.c", false);
    expect(error).toBeNull();
    expect(matches(entry("abc"))).toBe(false);
    expect(matches(entry("a.c"))).toBe(true);
  });
});

describe("buildSearchMatcher — regex", () => {
  it("aplica la expresión (insensible a mayúsculas) y es repetible (sin lastIndex)", () => {
    const { matches, error } = buildSearchMatcher(String.raw`^(get|post) /pro\w+`, true);
    expect(error).toBeNull();
    expect(matches(entry("get /projects"))).toBe(true);
    expect(matches(entry("get /projects"))).toBe(true);
    expect(matches(entry("delete /projects"))).toBe(false);
  });

  it("una regex inválida informa el error y NO vacía el listado", () => {
    const { matches, error } = buildSearchMatcher("([", true);
    expect(error).toMatch(/Regex inválida/);
    expect(matches(entry("lo que sea"))).toBe(true);
  });

  it("rechaza patrones demasiado largos", () => {
    const { matches, error } = buildSearchMatcher("a".repeat(MAX_REGEX_LENGTH + 1), true);
    expect(error).toMatch(/demasiado larga/);
    expect(matches(entry("x"))).toBe(true);
  });
});
