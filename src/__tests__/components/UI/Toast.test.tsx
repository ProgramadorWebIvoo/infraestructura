import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../../../components/UI/Toast";

// ── Helper component to trigger toasts ────────────────────────────────────────
function ToastTrigger({ message, type }: { message: string; type?: "success" | "error" | "warning" | "info" }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(message, type)}>Show Toast</button>;
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows a toast when showToast is called", () => {
    renderWithProvider(<ToastTrigger message="Hello World" />);

    act(() => {
      screen.getByText("Show Toast").click();
    });

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("auto-dismisses a toast after 4 seconds", () => {
    renderWithProvider(<ToastTrigger message="Auto Dismiss" />);

    act(() => {
      screen.getByText("Show Toast").click();
    });

    expect(screen.getByText("Auto Dismiss")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4250);
    });

    expect(screen.queryByText("Auto Dismiss")).not.toBeInTheDocument();
  });

  it("dismisses a toast when close button is clicked", () => {
    renderWithProvider(<ToastTrigger message="Dismiss Me" />);

    act(() => {
      screen.getByText("Show Toast").click();
    });

    expect(screen.getByText("Dismiss Me")).toBeInTheDocument();

    act(() => {
      screen.getByLabelText("Cerrar notificación").click();
    });

    // Advance past exit animation (250ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByText("Dismiss Me")).not.toBeInTheDocument();
  });

  it("uses role='alert' for error toasts", () => {
    renderWithProvider(<ToastTrigger message="Error!" type="error" />);

    act(() => {
      screen.getByText("Show Toast").click();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Error!");
  });

  it("uses role='status' for non-error toasts", () => {
    renderWithProvider(<ToastTrigger message="Success!" type="success" />);

    act(() => {
      screen.getByText("Show Toast").click();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Success!");
  });

  it("limits toasts to MAX_TOASTS (5)", () => {
    renderWithProvider(<ToastTrigger message="Toast" />);

    for (let i = 0; i < 7; i++) {
      act(() => {
        screen.getByText("Show Toast").click();
      });
    }

    // Only last 5 should be visible
    const toasts = screen.getAllByText("Toast");
    expect(toasts.length).toBe(5);
  });

  it("renders children and provides showToast context", () => {
    renderWithProvider(<div data-testid="child">Child Content</div>);

    expect(screen.getByTestId("child")).toHaveTextContent("Child Content");
  });

  it("throws error when useToast is used outside provider", () => {
    // Suppress console.error for this expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ToastTrigger message="test" />)).toThrow(
      "useToast debe usarse dentro de ToastProvider",
    );

    spy.mockRestore();
  });

  it("handles multiple toasts with different types", () => {
    function MultiTrigger() {
      const { showToast } = useToast();
      return (
        <div>
          <button onClick={() => showToast("Success Msg", "success")}>Success</button>
          <button onClick={() => showToast("Error Msg", "error")}>Error</button>
          <button onClick={() => showToast("Warning Msg", "warning")}>Warning</button>
          <button onClick={() => showToast("Info Msg", "info")}>Info</button>
        </div>
      );
    }

    renderWithProvider(<MultiTrigger />);

    act(() => { screen.getByText("Success").click(); });
    act(() => { screen.getByText("Error").click(); });
    act(() => { screen.getByText("Warning").click(); });
    act(() => { screen.getByText("Info").click(); });

    expect(screen.getByText("Success Msg")).toBeInTheDocument();
    expect(screen.getByText("Error Msg")).toBeInTheDocument();
    expect(screen.getByText("Warning Msg")).toBeInTheDocument();
    expect(screen.getByText("Info Msg")).toBeInTheDocument();

    // Error has role="alert", others role="status"
    expect(screen.getAllByRole("alert").length).toBe(1);
    expect(screen.getAllByRole("status").length).toBe(3);
  });

  it("does not leak timers when toasts are dismissed early", () => {
    renderWithProvider(<ToastTrigger message="Early Dismiss" />);

    act(() => { screen.getByText("Show Toast").click(); });

    act(() => {
      screen.getByLabelText("Cerrar notificación").click();
    });

    // Advance well past the auto-dismiss time — should not re-appear
    act(() => { vi.advanceTimersByTime(5000); });

    expect(screen.queryByText("Early Dismiss")).not.toBeInTheDocument();
  });
});
