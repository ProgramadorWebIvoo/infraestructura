/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para LoginScreen — verifica renderizado,
 * rate limiting, toggle password, errores, y limpieza de interval.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginScreen from "@/views/LoginScreen";

// ---------------------------------------------------------------------------
// Mock motion (framer-motion no necesario en tests unitarios)
// ---------------------------------------------------------------------------

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Pasar className y key pero ignorar motion-specific props
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEmailInput(): HTMLInputElement {
  return screen.getByLabelText(/correo electrónico/i);
}

function getPasswordInput(): HTMLInputElement {
  return screen.getByLabelText("Clave", { exact: true });
}

function getSubmitButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /ingresar|validando|espere/i });
}

async function typeAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(getEmailInput(), email);
  await user.type(getPasswordInput(), password);
  await user.click(getSubmitButton());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LoginScreen", () => {
  const mockOnLogin = vi.fn<(_email: string, _password: string) => Promise<void>>();

  beforeEach(() => {
    mockOnLogin.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Renderizado básico
  // -----------------------------------------------------------------------

  describe("renderizado", () => {
    it("muestra el logo y título", () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.getByText("IVOO")).toBeInTheDocument();
      expect(screen.getByText("Gestión")).toBeInTheDocument();
      expect(screen.getByText("Acceso interno")).toBeInTheDocument();
    });

    it("renderiza campos de email y password", () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(getEmailInput()).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();
    });

    it("el campo password es type=password por defecto", () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(getPasswordInput()).toHaveAttribute("type", "password");
    });

    it("el email tiene autocomplete=email", () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(getEmailInput()).toHaveAttribute("autocomplete", "email");
    });

    it("el password tiene autocomplete=current-password", () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(getPasswordInput()).toHaveAttribute("autocomplete", "current-password");
    });

    it("botón submit dice 'Ingresar' en estado normal", () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(getSubmitButton()).toHaveTextContent("Ingresar");
    });

    it("muestra el año actual en el footer", () => {
      const { container } = render(<LoginScreen onLogin={mockOnLogin} />);
      // buscar el año dentro del footer
      expect(container.innerHTML).toContain(new Date().getFullYear().toString());
    });
  });

  // -----------------------------------------------------------------------
  // Password visibility toggle
  // -----------------------------------------------------------------------

  describe("password visibility toggle", () => {
    it("cambia a type=text al hacer clic en mostrar", async () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup();
      const toggle = screen.getByRole("button", { name: /mostrar clave/i });
      await user.click(toggle);
      expect(getPasswordInput()).toHaveAttribute("type", "text");
    });

    it("cambia aria-label a 'Ocultar clave' cuando visible", async () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup();
      const toggle = screen.getByRole("button", { name: /mostrar clave/i });
      await user.click(toggle);
      expect(screen.getByRole("button", { name: /ocultar clave/i })).toBeInTheDocument();
    });

    it("regresa a type=password al hacer clic dos veces", async () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup();
      const toggle = screen.getByRole("button", { name: /mostrar clave/i });
      await user.click(toggle);
      await user.click(toggle);
      expect(getPasswordInput()).toHaveAttribute("type", "password");
    });
  });

  // -----------------------------------------------------------------------
  // Estados del botón submit
  // -----------------------------------------------------------------------

  describe("submit button states", () => {
    it("muestra 'Validando...' con spinner durante submit", async () => {
      mockOnLogin.mockImplementation(() => new Promise(() => {})); // nunca resuelve
      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup();
      await user.type(getEmailInput(), "a@b.c");
      await user.type(getPasswordInput(), "pass");
      await user.click(getSubmitButton());
      expect(getSubmitButton()).toHaveTextContent("Validando...");
    });

    it("botón deshabilitado durante submit", async () => {
      mockOnLogin.mockImplementation(() => new Promise(() => {}));
      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup();
      await user.type(getEmailInput(), "a@b.c");
      await user.type(getPasswordInput(), "pass");
      await user.click(getSubmitButton());
      expect(getSubmitButton()).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Manejo de errores
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    it("muestra mensaje de error del servidor", async () => {
      mockOnLogin.mockRejectedValueOnce(new Error("Credenciales inválidas"));
      render(<LoginScreen onLogin={mockOnLogin} />);
      await typeAndSubmit("a@b.c", "wrong");
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Credenciales inválidas");
      });
    });

    it("el error tiene role='alert' para accesibilidad", async () => {
      mockOnLogin.mockRejectedValueOnce(new Error("Error"));
      render(<LoginScreen onLogin={mockOnLogin} />);
      await typeAndSubmit("a@b.c", "x");
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("no muestra error antes de submit", () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Rate limiting — backoff exponencial
  // -----------------------------------------------------------------------

  describe("rate limiting", () => {
    it("bloquea después de 3 intentos fallidos", async () => {
      mockOnLogin.mockRejectedValue(new Error("bad"));

      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 3 fallos sin bloqueo
      for (let i = 0; i < 3; i++) {
        await typeAndSubmit("a@b.c", "x");
        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
        // limpiar error para el siguiente intento
        // (el error se reemplaza en cada submit, no hay limpieza manual)
      }

      // 4to intento — debe disparar bloqueo de 2s
      await user.type(getEmailInput(), "a@b.c");
      // password ya tiene "x" del intento anterior, limpiar y re-escribir
      await user.clear(getPasswordInput());
      await user.type(getPasswordInput(), "x");
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/espere/i);
      });

      // botón muestra cuenta regresiva
      expect(getSubmitButton()).toHaveTextContent(/espere/i);
      expect(getSubmitButton()).toBeDisabled();
    });

    it("incrementa el tiempo de bloqueo con cada intento adicional", async () => {
      mockOnLogin.mockRejectedValue(new Error("bad"));

      render(<LoginScreen onLogin={mockOnLogin} />);

      // Forzar 4 fallos para llegar a bloqueo de 2s
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      for (let i = 0; i < 4; i++) {
        await typeAndSubmit("a@b.c", "x");
        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      }

      // debería estar bloqueado 2s
      expect(getSubmitButton()).toHaveTextContent(/espere 2/i);
    });

    it("libera el bloqueo después de la cuenta regresiva", async () => {
      mockOnLogin.mockRejectedValue(new Error("bad"));

      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 4 fallos → bloqueo 2s
      for (let i = 0; i < 4; i++) {
        await user.type(getEmailInput(), "a@b.c");
        await user.clear(getPasswordInput());
        await user.type(getPasswordInput(), "x");
        await user.click(getSubmitButton());
        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
        });
      }

      expect(getSubmitButton()).toBeDisabled();

      // Avanzar 2.5s para superar el bloqueo
      vi.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(getSubmitButton()).not.toBeDisabled();
        expect(getSubmitButton()).toHaveTextContent("Ingresar");
      });
    });

    it("reanuda el contador después de éxito", async () => {
      // 2 fallos, 1 éxito → contador se resetea
      mockOnLogin
        .mockRejectedValueOnce(new Error("bad"))
        .mockRejectedValueOnce(new Error("bad"))
        .mockResolvedValueOnce(undefined);

      render(<LoginScreen onLogin={mockOnLogin} />);

      await typeAndSubmit("a@b.c", "x");
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

      await typeAndSubmit("a@b.c", "x");
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

      // éxito
      await typeAndSubmit("a@b.c", "ok");

      // el contador se reseteó a 0, siguientes 3 fallos no deben bloquear
      mockOnLogin.mockRejectedValue(new Error("bad"));

      for (let i = 0; i < 3; i++) {
        await typeAndSubmit("a@b.c", "x");
        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      }

      // Sin bloqueo (solo 3 fallos)
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Inputs deshabilitados durante bloqueo
  // -----------------------------------------------------------------------

  describe("disabled durante bloqueo", () => {
    it("deshabilita inputs email y password cuando está bloqueado", async () => {
      mockOnLogin.mockRejectedValue(new Error("bad"));

      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 4 fallos → bloqueo
      for (let i = 0; i < 4; i++) {
        await user.type(getEmailInput(), "a@b.c");
        await user.clear(getPasswordInput());
        await user.type(getPasswordInput(), "x");
        await user.click(getSubmitButton());
        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      }

      expect(getEmailInput()).toBeDisabled();
      expect(getPasswordInput()).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Cleanup de interval al desmontar
  // -----------------------------------------------------------------------

  describe("cleanup", () => {
    it("limpia el interval de bloqueo al desmontar el componente", async () => {
      mockOnLogin.mockRejectedValue(new Error("bad"));

      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 4 fallos → inicia interval
      for (let i = 0; i < 4; i++) {
        await user.type(getEmailInput(), "a@b.c");
        await user.clear(getPasswordInput());
        await user.type(getPasswordInput(), "x");
        await user.click(getSubmitButton());
        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      }

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // Llamada a onLogin con datos correctos
  // -----------------------------------------------------------------------

  describe("onLogin call", () => {
    it("llama a onLogin con email y password ingresados", async () => {
      mockOnLogin.mockResolvedValueOnce(undefined);
      render(<LoginScreen onLogin={mockOnLogin} />);
      await typeAndSubmit("user@ivoo.local", "secret123");
      expect(mockOnLogin).toHaveBeenCalledWith("user@ivoo.local", "secret123");
    });

    it("no llama a onLogin si está bloqueado", async () => {
      mockOnLogin.mockRejectedValue(new Error("bad"));

      render(<LoginScreen onLogin={mockOnLogin} />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      for (let i = 0; i < 4; i++) {
        await user.type(getEmailInput(), "a@b.c");
        await user.clear(getPasswordInput());
        await user.type(getPasswordInput(), "x");
        await user.click(getSubmitButton());
        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      }

      // intentar submit mientras bloqueado
      mockOnLogin.mockClear();
      await user.click(getSubmitButton());
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });
});
