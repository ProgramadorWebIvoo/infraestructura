import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

import { isInvalidDateRange, useProjectHistoryDetail, useProjectHistoryList } from "@/hooks/useProjectHistory";

const emptyPage = { items: [], currentPage: 1, lastPage: 3, total: 40, perPage: 15 };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const lastPath = () => String(mockApiFetch.mock.calls.at(-1)?.[0]);

describe("isInvalidDateRange", () => {
  it("detecta desde > hasta y tolera rangos incompletos o iguales", () => {
    expect(isInvalidDateRange({ dateFrom: "2026-05-01", dateTo: "2026-01-01" })).toBe(true);
    expect(isInvalidDateRange({ dateFrom: "2026-01-01", dateTo: "2026-01-01" })).toBe(false);
    expect(isInvalidDateRange({ dateFrom: "2026-01-01", dateTo: "" })).toBe(false);
    expect(isInvalidDateRange({ dateFrom: "", dateTo: "2026-01-01" })).toBe(false);
  });
});

describe("useProjectHistoryList", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(emptyPage);
  });

  it("pide la página 1 sin filtros y expone la paginación", async () => {
    const { result } = renderHook(() => useProjectHistoryList("tok"), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(lastPath()).toBe("/project-history?page=1&perPage=15");
    expect(result.current.data?.lastPage).toBe(3);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("serializa cada filtro con el nombre que espera el backend", async () => {
    const { result } = renderHook(() => useProjectHistoryList("tok"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => {
      result.current.updateFilter("status", "EN_EJECUCION");
      result.current.updateFilter("type", "MANTENIMIENTO");
      result.current.updateFilter("dateFrom", "2026-01-01");
      result.current.updateFilter("dateTo", "2026-02-01");
      result.current.updateFilter("withAlerts", true);
    });

    await waitFor(() => expect(lastPath()).toContain("withAlerts=1"));
    const path = lastPath();
    expect(path).toContain("status=EN_EJECUCION");
    expect(path).toContain("type=MANTENIMIENTO");
    expect(path).toContain("dateFrom=2026-01-01");
    expect(path).toContain("dateTo=2026-02-01");
    expect(result.current.activeFilterCount).toBe(5);
  });

  it("cambiar un filtro vuelve a la página 1 y limpiar restablece todo", async () => {
    const { result } = renderHook(() => useProjectHistoryList("tok"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => result.current.goToPage(3));
    await waitFor(() => expect(lastPath()).toContain("page=3"));

    act(() => result.current.updateFilter("status", "CREADO"));
    await waitFor(() => expect(lastPath()).toContain("status=CREADO"));
    expect(lastPath()).toContain("page=1");
    expect(result.current.page).toBe(1);

    act(() => result.current.clearFilters());
    await waitFor(() => expect(lastPath()).not.toContain("status="));
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("acota goToPage al rango válido", async () => {
    const { result } = renderHook(() => useProjectHistoryList("tok"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => result.current.goToPage(99));
    await waitFor(() => expect(result.current.page).toBe(3));
    act(() => result.current.goToPage(-5));
    await waitFor(() => expect(result.current.page).toBe(1));
  });

  it("no consulta al backend con un rango de fechas invertido", async () => {
    const { result } = renderHook(() => useProjectHistoryList("tok"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    mockApiFetch.mockClear();

    act(() => {
      result.current.updateFilter("dateFrom", "2026-05-01");
      result.current.updateFilter("dateTo", "2026-01-01");
    });

    await waitFor(() => expect(result.current.invalidRange).toBe(true));
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("fetchAllRows usa /export con los filtros efectivos y sin paginación", async () => {
    const { result } = renderHook(() => useProjectHistoryList("tok"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => result.current.updateFilter("type", "INFRAESTRUCTURA"));
    await waitFor(() => expect(lastPath()).toContain("type=INFRAESTRUCTURA"));

    mockApiFetch.mockResolvedValueOnce({ items: [{ id: "PRJ-1" }] });
    const rows = await result.current.fetchAllRows();

    expect(rows).toEqual([{ id: "PRJ-1" }]);
    expect(lastPath()).toBe("/project-history/export?type=INFRAESTRUCTURA");
  });

  it("no consulta sin token", async () => {
    renderHook(() => useProjectHistoryList(""), { wrapper });
    await new Promise((r) => setTimeout(r, 30));
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe("useProjectHistoryDetail", () => {
  beforeEach(() => mockApiFetch.mockReset());

  it("solo consulta cuando hay un id", async () => {
    mockApiFetch.mockResolvedValue({ project: { id: "PRJ-2" } });
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useProjectHistoryDetail("tok", id), {
      wrapper,
      initialProps: { id: null as string | null },
    });
    expect(mockApiFetch).not.toHaveBeenCalled();

    rerender({ id: "PRJ-2" });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(lastPath()).toBe("/project-history/PRJ-2");
  });
});
