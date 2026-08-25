/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para GridView — componente genérico, probado con un
 * dataset arbitrario (no Project) para demostrar que no está acoplado a
 * ningún dominio de la app.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GridView from "@/components/UI/GridView/GridView";

// motion real usa RAF/variants que no se resuelven de forma síncrona en
// jsdom — se mockea igual que en ConfirmDialog.test.tsx/PasswordStrengthMeter.test.tsx
// para poder aserear sobre el DOM sin esperar animaciones.
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, whileHover, whileTap, layout, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// ---------------------------------------------------------------------------
// El ResizeObserver global de test/setup.ts es un no-op — se reemplaza
// localmente por una versión síncrona (mismo patrón que
// useContainerRows.test.tsx) para que useFullViewport reciba un
// clientWidth/clientHeight simulado y GridView pueda calcular columnas.
// ---------------------------------------------------------------------------

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

function stubContainerSize(width: number, height: number) {
  const proto = HTMLDivElement.prototype;
  // useFullViewport lee clientWidth/clientHeight; @tanstack/react-virtual
  // mide el scroll element vía offsetWidth/offsetHeight (ver getRect() en
  // virtual-core) — ninguno de los dos existe en jsdom, ambos hay que stubear.
  Object.defineProperty(proto, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(proto, "clientHeight", { value: height, configurable: true });
  Object.defineProperty(proto, "offsetWidth", { value: width, configurable: true });
  Object.defineProperty(proto, "offsetHeight", { value: height, configurable: true });
  return () => {
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.clientWidth;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.clientHeight;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.offsetWidth;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.offsetHeight;
  };
}

// ---------------------------------------------------------------------------
// Test data — dataset genérico arbitrario, no acoplado a Project
// ---------------------------------------------------------------------------

interface Widget {
  id: number;
  name: string;
  isFlagged: boolean;
}

const widgets: Widget[] = [
  { id: 1, name: "Widget Uno", isFlagged: false },
  { id: 2, name: "Widget Dos", isFlagged: true },
  { id: 3, name: "Widget Tres", isFlagged: false },
];

afterEach(() => vi.restoreAllMocks());

describe("GridView", () => {
  it("renderiza una tarjeta por item usando renderCard", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      render(
        <div style={{ height: 600 }}>
          <GridView
            items={widgets}
            rowKey={(w) => w.id}
            renderCard={(w) => <span data-testid={`card-${w.id}`}>{w.name}</span>}
          />
        </div>,
      );
      expect(screen.getByTestId("card-1")).toHaveTextContent("Widget Uno");
      expect(screen.getByTestId("card-2")).toHaveTextContent("Widget Dos");
      expect(screen.getByTestId("card-3")).toHaveTextContent("Widget Tres");
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("llama onSelect con el item correspondiente al hacer click en su tarjeta", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onSelect = vi.fn();
    try {
      render(
        <div style={{ height: 600 }}>
          <GridView
            items={widgets}
            rowKey={(w) => w.id}
            renderCard={(w) => <span>{w.name}</span>}
            onSelect={onSelect}
          />
        </div>,
      );
      fireEvent.click(screen.getByText("Widget Dos"));
      expect(onSelect).toHaveBeenCalledWith(widgets[1]);
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("aplica el accent semántico devuelto por cardAccent", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      render(
        <div style={{ height: 600 }}>
          <GridView
            items={widgets}
            rowKey={(w) => w.id}
            renderCard={(w) => <span data-testid={`card-${w.id}`}>{w.name}</span>}
            cardAccent={(w) => (w.isFlagged ? "danger" : undefined)}
          />
        </div>,
      );
      const flaggedCard = screen.getByTestId("card-2").closest("[class*='border-danger']");
      expect(flaggedCard).not.toBeNull();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra emptyState cuando no hay items", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      render(
        <div style={{ height: 600 }}>
          <GridView
            items={[]}
            rowKey={(w: Widget) => w.id}
            renderCard={(w: Widget) => <span>{w.name}</span>}
            emptyState={<span data-testid="empty">Nada aquí</span>}
          />
        </div>,
      );
      expect(screen.getByTestId("empty")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});
