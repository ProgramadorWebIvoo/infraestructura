import { describe, it, expect, beforeEach } from "vitest";
import {
  MAX_STORAGE_VALUE_CHARS,
  parseCookies,
  readCookieRows,
  readDisplayValue,
  readEditableValue,
  readStorageRows,
  removeStorageKey,
  writeStorageValue,
} from "@/utils/debugStorage";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.cookie.split(";").forEach(c => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
});

describe("readStorageRows", () => {
  it("lista clave y tamaño ordenado, sin exponer valores", () => {
    window.localStorage.setItem("zeta", "abc");
    window.localStorage.setItem("alfa", "12345");
    const rows = readStorageRows("local");
    expect(rows.map(r => [r.key, r.length])).toEqual([["alfa", 5], ["zeta", 3]]);
    expect(JSON.stringify(rows)).not.toContain("12345");
  });

  it("marca claves sensibles, valores enormes y claves protegidas", () => {
    window.localStorage.setItem("auth_token", "x");
    window.localStorage.setItem("ivoo_debug_mode", "1");
    window.localStorage.setItem("ivoo-query-cache", "x".repeat(MAX_STORAGE_VALUE_CHARS + 1));
    const rows = Object.fromEntries(readStorageRows("local").map(r => [r.key, r]));
    expect(rows["auth_token"].sensitive).toBe(true);
    expect(rows["ivoo_debug_mode"].warning).toMatch(/DEBUG-MODE/);
    expect(rows["ivoo-query-cache"].tooLarge).toBe(true);
  });

  it("sessionStorage es independiente de localStorage", () => {
    window.sessionStorage.setItem("s", "1");
    expect(readStorageRows("local")).toHaveLength(0);
    expect(readStorageRows("session").map(r => r.key)).toEqual(["s"]);
  });
});

describe("valores mostrados y editables", () => {
  it("el valor mostrado pasa por el sanitizador", () => {
    window.localStorage.setItem("contacto", "maria@ivoo.com Bearer abc.def");
    expect(readDisplayValue("local", "contacto")).toBe("m***@ivoo.com Bearer [redacted]");
  });

  it("las claves sensibles se muestran como [redacted] y no son editables", () => {
    window.localStorage.setItem("refresh_token", "secreto");
    expect(readDisplayValue("local", "refresh_token")).toBe("[redacted]");
    expect(readEditableValue("local", "refresh_token")).toBeNull();
  });

  it("un valor enorme no se lee ni se edita", () => {
    window.localStorage.setItem("big", "x".repeat(MAX_STORAGE_VALUE_CHARS + 5));
    expect(readDisplayValue("local", "big")).toMatch(/demasiado grande/);
    expect(readEditableValue("local", "big")).toBeNull();
  });

  it("devuelve null si la clave no existe", () => {
    expect(readDisplayValue("local", "nada")).toBeNull();
  });

  it("escribe, edita y elimina", () => {
    writeStorageValue("local", "flag", "1");
    expect(readEditableValue("local", "flag")).toBe("1");
    writeStorageValue("local", "flag", "2");
    expect(window.localStorage.getItem("flag")).toBe("2");
    removeStorageKey("local", "flag");
    expect(window.localStorage.getItem("flag")).toBeNull();
  });
});

describe("cookies", () => {
  it("parsea pares clave=valor con decodeURIComponent y tolera valores mal formados", () => {
    expect(parseCookies("a=1; XSRF-TOKEN=ab%3D; raro=%E0%A4%A; sola")).toEqual([
      { key: "a", value: "1" },
      { key: "XSRF-TOKEN", value: "ab=" },
      { key: "raro", value: "%E0%A4%A" },
      { key: "sola", value: "" },
    ]);
  });

  it("lista, advierte sobre XSRF-TOKEN y elimina cookies creadas con path=/", () => {
    document.cookie = "XSRF-TOKEN=abc; path=/";
    document.cookie = "tema=oscuro; path=/";
    const rows = readCookieRows();
    expect(rows.find(r => r.key === "XSRF-TOKEN")?.warning).toMatch(/CSRF/);
    expect(readDisplayValue("cookie", "XSRF-TOKEN")).toBe("[redacted]");

    removeStorageKey("cookie", "tema");
    expect(readCookieRows().map(r => r.key)).toEqual(["XSRF-TOKEN"]);
  });
});
