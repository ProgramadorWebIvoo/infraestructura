/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integración de UsuariosPanel — carga, búsqueda/filtro, alta (con
 * validación de contraseña) y edición vía el modal unificado. `apiFetch`
 * se mockea; los sub-componentes se renderizan reales.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UsuariosPanel from "@/views/UsuariosPanel";
import type { UserRecord } from "@/hooks/useUsuarios";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants;
      delete rest.transition; delete rest.whileHover; delete rest.whileTap; delete rest.layout;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <span {...rest}>{children}</span>;
    },
    ul: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <ul {...rest}>{children}</ul>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants;
      delete rest.transition; delete rest.whileHover; delete rest.whileTap;
      return <button {...rest}>{children}</button>;
    },
    tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants;
      delete rest.transition; delete rest.layout;
      return <tr {...rest}>{children}</tr>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <p {...rest}>{children}</p>;
    },
  },
}));

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/hooks/useConfigAuditLogs", () => ({
  useConfigAuditLogs: () => ({
    logs: [],
    isLoading: false,
    hasLoaded: true,
    page: 1,
    lastPage: 1,
    total: 0,
    goToPage: vi.fn(),
    prependLocal: vi.fn(),
  }),
}));

const USER: UserRecord = {
  id: 1,
  name: "Maria Rodriguez",
  email: "maria@ivoo.local",
  role: "ANALISTA",
  status: "Active",
  created_at: "2026-07-01T00:00:00.000000Z",
};

async function resolveUsersAndRoles() {
  // useUsuarios hace fetch de /users (lista) y /roles (catálogo) al montar.
  mockApiFetch.mockImplementation((url: string) => {
    if (url === "/roles") return Promise.resolve(["ANALISTA", "ADMIN"]);
    if (url === "/users") return Promise.resolve([USER]);
    return Promise.resolve([]);
  });
}

describe("UsuariosPanel (integración)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUsersAndRoles();
  });

  it("carga y renderiza el listado de usuarios", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    expect(screen.getByRole("heading", { name: "Gestión de Usuarios" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());
  });

  it("muestra el ID del usuario junto al correo (identificador inmutable, útil para correlacionar con el historial de auditoría)", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    expect(screen.getByText((_, el) => el?.textContent === "maria@ivoo.local · #1")).toBeInTheDocument();
  });

  it("filtra por nombre o correo", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o correo/), {
      target: { value: "inexistente" },
    });
    expect(screen.getByText(/Ningún usuario coincide/)).toBeInTheDocument();
  });

  it("abre el modal de creación con el botón «Nuevo usuario»", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Nuevo usuario" })).toBeInTheDocument();
    // En modo creación se piden contraseña + confirmación.
    expect(screen.getByLabelText(/^Contraseña/)).toBeInTheDocument();
  });

  it("rechaza el alta si faltan nombre o correo", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // El botón de guardar está deshabilitado por el modal mientras falten
    // campos obligatorios — nunca llega a disparar la validación del panel.
    expect(screen.getByRole("button", { name: "Crear usuario" })).toBeDisabled();
  });

  it("rechaza el alta si la contraseña no cumple los requisitos", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Nuevo Usuario" } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: "nuevo@ivoo.local" } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: "abc" } });

    expect(screen.getByRole("button", { name: "Crear usuario" })).toBeDisabled();
  });

  it("rechaza el alta si las contraseñas no coinciden", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Nuevo Usuario" } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: "nuevo@ivoo.local" } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText(/Confirmar contraseña/), { target: { value: "Password2" } });

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear usuario" })).toBeDisabled();
  });

  it("crea un usuario con los campos válidos", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Nuevo Usuario" } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: "nuevo@ivoo.local" } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText(/Confirmar contraseña/), { target: { value: "Password1" } });

    const saveButton = screen.getByRole("button", { name: "Crear usuario" });
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    mockApiFetch.mockResolvedValueOnce({ ...USER, id: 2, name: "Nuevo Usuario", email: "nuevo@ivoo.local" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Usuario "Nuevo Usuario" registrado correctamente.', "success");
    });
  });

  it("abre el modal de edición con los datos del usuario precargados", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Editar Maria Rodriguez/ }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    expect(screen.getByRole("heading", { name: "Editar usuario" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("Maria Rodriguez");
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue("maria@ivoo.local");
    // En edición no se piden campos de contraseña.
    expect(screen.queryByLabelText(/^Contraseña/)).not.toBeInTheDocument();
  });

  it("guarda cambios de edición (nombre/correo/rol/estado)", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Editar Maria Rodriguez/ }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Maria R. Actualizada" } });

    mockApiFetch.mockResolvedValueOnce({ ...USER, name: "Maria R. Actualizada" });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/users/1",
        expect.objectContaining({ method: "PATCH", body: expect.stringContaining("Maria R. Actualizada") }),
      );
    });
  });

  it("activa/desactiva un usuario desde la fila", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    mockApiFetch.mockResolvedValueOnce({ id: 1, status: "Inactive" });
    fireEvent.click(screen.getByRole("button", { name: /Desactivar Maria Rodriguez/ }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("Usuario desactivado correctamente.", "success");
    });
  });

  it("envía el link de restablecimiento de contraseña", async () => {
    render(<UsuariosPanel authToken="token" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument());

    mockApiFetch.mockResolvedValueOnce({ message: "sent" });
    fireEvent.click(screen.getByRole("button", { name: /Enviar restablecimiento de contraseña a Maria Rodriguez/ }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining("Link de restablecimiento enviado"),
        "success",
      );
    });
  });
});
