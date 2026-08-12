import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { ROUTES } from "@/routes.tsx";

function renderAt(pathname: string) {
  return renderHook(() => useDocumentHead(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[pathname]}>{children}</MemoryRouter>,
  });
}

function getFaviconHref(): string {
  return document.querySelector<HTMLLinkElement>("link[rel='icon']")?.href ?? "";
}

describe("useDocumentHead", () => {
  beforeEach(() => {
    document.title = "";
    document.querySelectorAll("link[rel='icon']").forEach(el => el.remove());
  });

  afterEach(() => {
    document.querySelectorAll("link[rel='icon']").forEach(el => el.remove());
  });

  it("sets the title with the route label for a known route", () => {
    renderAt(ROUTES.PRESIDENCIA);
    expect(document.title).toBe("IVOO-Gestión // Presidencia");
  });

  it("falls back to the default title/favicon for an unknown route", () => {
    renderAt("/ruta-inexistente");
    expect(document.title).toBe("IVOO Gestión de Infraestructura");
    expect(getFaviconHref()).toContain("/favicon.svg");
  });

  it("builds a favicon data URI that preserves the icon's own 24x24 viewBox (regression: icon used to render cropped/oversized)", () => {
    renderAt(ROUTES.PRESIDENCIA);

    const href = getFaviconHref();
    expect(href).toContain("data:image/svg+xml,");

    const decoded = decodeURIComponent(href.replace("data:image/svg+xml,", ""));

    // Outer 32x32 canvas with the route color as background.
    expect(decoded).toMatch(/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="32" height="32" viewBox="0 0 32 32">/);
    expect(decoded).toContain('fill="#38BDF8"'); // color de Presidencia en routeMeta.tsx

    // Icon must be centered and scaled down from its native 24x24 viewBox to
    // fit the 20px slot — losing the scale/translate is the bug that made
    // icons render huge/cropped instead of fitting the favicon.
    expect(decoded).toMatch(/<g transform="translate\(6, 6\) scale\(0\.8333333333333334\)"/);

    // The icon's own <svg stroke="..."> is discarded along with its wrapper
    // tag — without re-adding stroke to the replacement <g>, lucide's <path>
    // elements (fill="none", color lives only in stroke) render invisible.
    // This was the actual bug behind "no se ven los iconos" (icons drew fine
    // geometrically but with no visible color at all).
    expect(decoded).toMatch(/<g[^>]*stroke="#FFFFFF"/);

    // Must contain actual path data, not an empty icon.
    expect(decoded).toMatch(/<path/);
  });

  it("resets the title on unmount", () => {
    const { unmount } = renderAt(ROUTES.PRESIDENCIA);
    expect(document.title).toBe("IVOO-Gestión // Presidencia");

    unmount();

    expect(document.title).toBe("IVOO Gestión de Infraestructura");
  });
});
