/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para useContainerRows — calcula pageSize dinámico según
 * el alto real del contenedor, en vez de un valor fijo que deja hueco vacío
 * en pantallas grandes o fuerza scroll en pantallas chicas.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useContainerRows } from "@/hooks/useContainerRows";

/**
 * El ResizeObserver global de test/setup.ts es un no-op (observe() no
 * dispara callback) — sirve para que librerías que lo invoquen incondicio-
 * nalmente no exploten, pero no permite probar la lógica de recálculo de
 * este hook. Se reemplaza localmente por una versión que invoca el
 * callback de forma síncrona al observar, así el div montado por React ya
 * tiene el clientHeight simulado disponible cuando recalculate() corre.
 */
function stubSyncResizeObserver() {
  const OriginalRO = window.ResizeObserver;
  class SyncResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = SyncResizeObserver as unknown as typeof ResizeObserver;
  return () => {
    window.ResizeObserver = OriginalRO;
  };
}

afterEach(() => vi.restoreAllMocks());

function TestHarness({ clientHeight, ...options }: Parameters<typeof useContainerRows>[0] & { clientHeight: number }) {
  const { containerRef, rows } = useContainerRows(options);
  return (
    <div
      ref={(el) => {
        if (el) Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
    >
      <span data-testid="rows">{rows}</span>
    </div>
  );
}

describe("useContainerRows", () => {
  it("calcula filas restando header y paginación del alto disponible", () => {
    const restore = stubSyncResizeObserver();
    try {
      // 520 - 40 (header) - 40 (paginación) = 440 disponibles / 40 por fila = 11
      render(<TestHarness clientHeight={520} rowHeight={40} headerHeight={40} paginationHeight={40} minRows={1} />);
      expect(screen.getByTestId("rows")).toHaveTextContent("11");
    } finally {
      restore();
    }
  });

  it("respeta paginated:false: no resta el alto de una barra de paginación inexistente", () => {
    const restore = stubSyncResizeObserver();
    try {
      // 520 - 40 (header) = 480 disponibles / 40 por fila = 12 (sin restar paginationHeight)
      render(
        <TestHarness
          clientHeight={520}
          rowHeight={40}
          headerHeight={40}
          paginationHeight={999}
          paginated={false}
          minRows={1}
        />,
      );
      expect(screen.getByTestId("rows")).toHaveTextContent("12");
    } finally {
      restore();
    }
  });

  it("nunca calcula menos de minRows, incluso con muy poco alto disponible", () => {
    const restore = stubSyncResizeObserver();
    try {
      render(<TestHarness clientHeight={50} rowHeight={40} headerHeight={40} paginationHeight={40} minRows={3} />);
      expect(screen.getByTestId("rows")).toHaveTextContent("3");
    } finally {
      restore();
    }
  });
});
