import "@testing-library/jest-dom/vitest";

// jsdom no implementa estas APIs — varias librerías (motion, componentes con
// media queries o medición de layout) las invocan incondicionalmente al
// montar, y sin este mock cada test que las toque falla con
// "X is not a function" en vez del error real que se esté probando.

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;
}

if (!window.ResizeObserver) {
  window.ResizeObserver = MockObserver as unknown as typeof ResizeObserver;
}
