import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePolledFetch } from "@/hooks/usePolledFetch";

vi.mock("@/services/logger", () => ({
  logError: vi.fn(),
}));

function renderWithClient(props: {
  authToken: string;
  showToast?: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
  fetcher: () => Promise<string[]>;
  getSignature: (data: string[]) => string;
  errorMessage?: string;
  interval?: number;
  queryKey?: string[];
}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const showToast = props.showToast ?? vi.fn();
  const hook = renderHook(
    () =>
      usePolledFetch<string>({
        authToken: props.authToken,
        showToast,
        queryKey: props.queryKey ?? ["test-resource"],
        fetcher: props.fetcher,
        getSignature: props.getSignature,
        errorMessage: props.errorMessage ?? "Error cargando datos",
        interval: props.interval ?? 5000,
      }),
    { wrapper },
  );
  return { ...hook, showToast, client };
}

describe("usePolledFetch", () => {
  const mockFetcher = vi.fn();
  const mockGetSignature = vi.fn((data: string[]) => data.join(","));

  beforeEach(() => {
    mockFetcher.mockClear();
    mockGetSignature.mockClear();
  });

  it("inicia con data vacía y isLoading=true", () => {
    mockFetcher.mockResolvedValue(["a", "b"]);

    const { result } = renderWithClient({
      authToken: "token",
      fetcher: mockFetcher,
      getSignature: mockGetSignature,
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("inicia con isLoading=false si no hay authToken", () => {
    const { result } = renderWithClient({
      authToken: "",
      fetcher: mockFetcher,
      getSignature: mockGetSignature,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([]);
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it("carga datos en montaje y setea isLoading=false", async () => {
    mockFetcher.mockResolvedValue(["item1", "item2"]);

    const { result } = renderWithClient({
      authToken: "token",
      fetcher: mockFetcher,
      getSignature: mockGetSignature,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(["item1", "item2"]);
  });

  it("refresh() fuerza recarga y refleja datos nuevos", async () => {
    mockFetcher.mockResolvedValue(["initial"]);
    mockGetSignature.mockReturnValue("initial");

    const { result } = renderWithClient({
      authToken: "token",
      fetcher: mockFetcher,
      getSignature: mockGetSignature,
    });

    await waitFor(() => expect(result.current.data).toEqual(["initial"]));

    mockFetcher.mockResolvedValue(["refreshed"]);
    mockGetSignature.mockReturnValue("refreshed");

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.data).toEqual(["refreshed"]));
  });

  it("setData actualiza data externamente", async () => {
    mockFetcher.mockResolvedValue(["a"]);

    const { result } = renderWithClient({
      authToken: "token",
      fetcher: mockFetcher,
      getSignature: mockGetSignature,
    });

    await waitFor(() => expect(result.current.data).toEqual(["a"]));

    act(() => {
      result.current.setData(["external", "data"]);
    });

    await waitFor(() => expect(result.current.data).toEqual(["external", "data"]));
  });

  it("muestra toast y loggea error en carga inicial", async () => {
    mockFetcher.mockRejectedValue(new Error("Network error"));

    const { result, showToast } = renderWithClient({
      authToken: "token",
      fetcher: mockFetcher,
      getSignature: mockGetSignature,
      errorMessage: "Error cargando datos",
    });

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Error cargando datos", "error"));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([]);
  });

  it("dos instancias con el mismo queryKey comparten data (caché compartida)", async () => {
    mockFetcher.mockResolvedValue(["shared"]);
    mockGetSignature.mockReturnValue("shared");

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const showToast = vi.fn();

    const first = renderHook(
      () =>
        usePolledFetch<string>({
          authToken: "token",
          showToast,
          queryKey: ["shared-resource"],
          fetcher: mockFetcher,
          getSignature: mockGetSignature,
          errorMessage: "err",
        }),
      { wrapper },
    );
    await waitFor(() => expect(first.result.current.data).toEqual(["shared"]));

    mockFetcher.mockClear();

    const second = renderHook(
      () =>
        usePolledFetch<string>({
          authToken: "token",
          showToast,
          queryKey: ["shared-resource"],
          fetcher: mockFetcher,
          getSignature: mockGetSignature,
          errorMessage: "err",
        }),
      { wrapper },
    );

    // Segunda instancia lee de la caché compartida sin volver a fetchear
    expect(second.result.current.data).toEqual(["shared"]);
    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
