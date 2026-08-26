import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ConfigAppPanel from "@/views/ConfigAppPanel";
import type { AppSettingRecord, SettingsByGroup } from "@/hooks/useAppSettings";

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockUpdateSetting = vi.fn();
const mockUseAppSettings = vi.fn();
vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: (token: string) => mockUseAppSettings(token),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

function makeSetting(overrides: Partial<AppSettingRecord> = {}): AppSettingRecord {
  return {
    id: 1,
    group: "presupuesto",
    key: "anticipo_maximo_porcentaje",
    value: "100",
    type: "integer",
    min_value: 0,
    max_value: 100,
    label: "Anticipo máximo (%)",
    description: null,
    created_at: "2026-08-12T00:00:00.000000Z",
    updated_at: "2026-08-12T00:00:00.000000Z",
    ...overrides,
  } as AppSettingRecord;
}

describe("ConfigAppPanel", () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    mockUpdateSetting.mockClear();
    mockUpdateSetting.mockResolvedValue({});
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith("/config-audit-logs")) {
        return Promise.resolve({ items: [], currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
      }
      if (path === "/settings/notification-actions") {
        return Promise.resolve([
          { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo" },
          { value: "Confirmacion de contratacion", label: "Confirmacion de contratacion" },
        ]);
      }
      if (path === "/notification-rules") {
        return Promise.resolve({
          actions: [{ value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo", group: "proyectos", critical: false }],
          roles: ["SUPERADMIN", "PROCURA"],
          rules: { "Rechazo de cuadro comparativo": { app: ["PROCURA"], mail: [] } },
          unconfigured: [],
        });
      }
      return Promise.resolve(undefined);
    });
  });

  it("muestra el skeleton mientras isLoading es true", () => {
    mockUseAppSettings.mockReturnValue({ settings: {}, isLoading: true, updateSetting: mockUpdateSetting });

    const { container } = render(<ConfigAppPanel authToken="token" />);

    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("renderiza una sección por grupo con settings, con su título", () => {
    const settings: SettingsByGroup = {
      presupuesto: [makeSetting()],
      fiscal: [makeSetting({ id: 2, group: "fiscal", key: "razon_social", label: "Razón social", type: "string", value: null })],
    };
    mockUseAppSettings.mockReturnValue({ settings, isLoading: false, updateSetting: mockUpdateSetting });

    render(<ConfigAppPanel authToken="token" />);

    expect(screen.getByText("Presupuesto y anticipos")).toBeInTheDocument();
    expect(screen.getByText("Datos fiscales")).toBeInTheDocument();
    expect(screen.getByText("Anticipo máximo (%)")).toBeInTheDocument();
    expect(screen.getByText("Razón social")).toBeInTheDocument();
  });

  it("SUPERADMIN: muestra un banner cuando el backend reporta settings documentados sin fila en BD", () => {
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      missingKeys: ["proyecto_estancado_umbral_dias", "sesion_inactividad_minutos"],
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" activeRole="SUPERADMIN" />);

    expect(screen.getByText(/parámetros documentados no tienen/)).toBeInTheDocument();
    expect(screen.getByText("proyecto_estancado_umbral_dias, sesion_inactividad_minutos")).toBeInTheDocument();
  });

  it("no SUPERADMIN: no muestra el banner de settings faltantes aunque missingKeys tenga datos", () => {
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      missingKeys: ["proyecto_estancado_umbral_dias"],
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" activeRole="PROCURA" />);

    expect(screen.queryByText(/parámetros documentados no tienen/)).not.toBeInTheDocument();
  });

  it("no muestra el banner de settings faltantes cuando missingKeys está vacío", () => {
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      missingKeys: [],
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" activeRole="SUPERADMIN" />);

    expect(screen.queryByText(/parámetros documentados no tienen/)).not.toBeInTheDocument();
  });

  it("no renderiza secciones para grupos sin settings", () => {
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" />);

    expect(screen.queryByText("Ratings")).not.toBeInTheDocument();
    expect(screen.queryByText("Alertas de precio")).not.toBeInTheDocument();
  });

  it("no llama a updateSetting al editar — el cambio queda en borrador local", () => {
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" />);

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "75" } });

    expect(mockUpdateSetting).not.toHaveBeenCalled();
  });

  it("la barra global aparece solo cuando hay cambios pendientes y desaparece al descartar", async () => {
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" />);

    expect(screen.queryByText("Guardar todo")).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "75" } });
    expect(screen.getByText("Guardar todo")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Descartar cambios"));
    await waitFor(() => expect(screen.queryByText("Guardar todo")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("100")).toBeInTheDocument();
  });

  it("deseleccionar y volver a seleccionar el mismo tag no deja la barra de guardado activa (aunque cambie el orden serializado)", async () => {
    mockUseAppSettings.mockReturnValue({
      settings: {
        notificaciones: [
          makeSetting({
            id: 3,
            group: "notificaciones",
            key: "acciones_con_correo",
            type: "json",
            value: '["Rechazo de cuadro comparativo","Confirmacion de contratacion"]',
            label: "Acciones que envían correo",
            min_value: null,
            max_value: null,
          }),
        ],
      },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith("/config-audit-logs")) return Promise.resolve({ items: [], currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
      if (path === "/settings/notification-actions") {
        return Promise.resolve([
          { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo" },
          { value: "Confirmacion de contratacion", label: "Confirmacion de contratacion" },
        ]);
      }
      return Promise.resolve(undefined);
    });

    render(<ConfigAppPanel authToken="token" />);

    await waitFor(() => expect(screen.getByText("Confirmacion de contratacion")).toHaveAttribute("aria-pressed"));

    // Deseleccionar "Rechazo de cuadro comparativo"...
    fireEvent.click(screen.getByText("Rechazo de cuadro comparativo"));
    expect(screen.getByText("Rechazo de cuadro comparativo")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Guardar todo")).toBeInTheDocument();

    // ...y volver a seleccionarlo: el conjunto final es idéntico al original,
    // aunque el orden del array cambió (queda al final en vez de al principio).
    fireEvent.click(screen.getByText("Rechazo de cuadro comparativo"));
    expect(screen.getByText("Rechazo de cuadro comparativo")).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(screen.queryByText("Guardar todo")).not.toBeInTheDocument());
  });

  it("Guardar todo persiste todos los cambios pendientes de todas las secciones", async () => {
    mockUseAppSettings.mockReturnValue({
      settings: {
        presupuesto: [makeSetting()],
        fiscal: [makeSetting({ id: 2, group: "fiscal", key: "razon_social", label: "Razón social", type: "string", value: "" })],
      },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" />);

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "75" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "IVOO C.A." } });

    fireEvent.click(screen.getByText("Guardar todo"));

    await waitFor(() => expect(mockUpdateSetting).toHaveBeenCalledTimes(2));
    expect(mockUpdateSetting).toHaveBeenCalledWith(1, "75");
    expect(mockUpdateSetting).toHaveBeenCalledWith(2, "IVOO C.A.");
  });

  it("SUPERADMIN: inserta la entrada de auditoría devuelta por el guardado sin volver a consultar el endpoint", async () => {
    mockUpdateSetting.mockResolvedValue({
      auditLog: {
        id: 99,
        settingKey: "anticipo_maximo_porcentaje",
        oldValue: "100",
        newValue: "75",
        userName: "Admin Test",
        changedAt: "2026-08-13 10:00",
      },
    });
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" activeRole="SUPERADMIN" />);

    // Carga inicial del historial (una sola vez, no polling).
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/config-audit-logs?page=1&per_page=20", { token: "token" }));
    const auditLogCallsBeforeSave = mockApiFetch.mock.calls.filter(([path]) => (path as string).startsWith("/config-audit-logs")).length;
    expect(auditLogCallsBeforeSave).toBe(1);

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "75" } });
    fireEvent.click(screen.getByText("Guardar todo"));

    // Abrir el panel de auditoría (colapsado por defecto) para ver la entrada.
    const toggle = await screen.findByRole("button", { name: /Historial de cambios/ });
    fireEvent.click(toggle);

    await waitFor(() => expect(screen.getByText("Admin Test", { exact: false })).toBeInTheDocument());

    // Sigue siendo una sola consulta al endpoint de auditoría — la entrada se insertó localmente.
    const auditLogCallsAfterSave = mockApiFetch.mock.calls.filter(([path]) => (path as string).startsWith("/config-audit-logs")).length;
    expect(auditLogCallsAfterSave).toBe(1);
  });

  it("al fallar la validación de un campo, muestra el mensaje inline junto al input y conserva los demás cambios pendientes", async () => {
    mockUpdateSetting.mockImplementation((id: number, value: string) => {
      if (id === 1) {
        return Promise.reject(new Error("El valor no puede ser mayor a 100."));
      }
      return Promise.resolve({ id, group: "fiscal", key: "razon_social", value, type: "string", min_value: null, max_value: null, label: "Razón social", description: null, created_at: "", updated_at: "" });
    });
    mockUseAppSettings.mockReturnValue({
      settings: {
        presupuesto: [makeSetting()],
        fiscal: [makeSetting({ id: 2, group: "fiscal", key: "razon_social", label: "Razón social", type: "string", value: "" })],
      },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" />);

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "40" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "IVOO C.A." } });

    fireEvent.click(screen.getByText("Guardar todo"));

    await waitFor(() => expect(screen.getByText("El valor no puede ser mayor a 100.")).toBeInTheDocument());

    // El campo que sí se guardó se limpia del draft y desaparece de "pendientes".
    await waitFor(() => expect(screen.getByText("1 cambio pendiente")).toBeInTheDocument());

    // Editar el campo con error limpia su mensaje inline (el texto sale con
    // una transición corta vía AnimatePresence, no desaparece del DOM al
    // instante — se espera a que termine).
    fireEvent.change(screen.getByDisplayValue("40"), { target: { value: "90" } });
    await waitFor(() =>
      expect(screen.queryByText("El valor no puede ser mayor a 100.")).not.toBeInTheDocument(),
    );
  });

  it("SUPERADMIN: la barra global también guarda cambios pendientes de la matriz de notificaciones por rol", async () => {
    mockUseAppSettings.mockReturnValue({
      settings: { presupuesto: [makeSetting()] },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" activeRole="SUPERADMIN" />);

    // La matriz de reglas vive en la tab "Notificaciones" — no es la activa
    // por default (esa es "Negocio").
    fireEvent.click(screen.getByRole("tab", { name: "Notificaciones" }));

    // Expande la fila de la matriz y togglea un rol — no dispara ningún
    // guardado por sí solo, solo queda en el borrador local.
    await waitFor(() => expect(screen.getByText("Rechazo de cuadro comparativo")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Rechazo de cuadro comparativo"));
    fireEvent.click(screen.getAllByText("Super Administrador")[0]);

    expect(mockApiFetch).not.toHaveBeenCalledWith(
      "/notification-rules",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(screen.getByText("Guardar todo")).toBeInTheDocument();

    mockApiFetch.mockResolvedValueOnce({ action: "Rechazo de cuadro comparativo", app: ["PROCURA", "SUPERADMIN"], mail: [] });

    fireEvent.click(screen.getByText("Guardar todo"));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith("/notification-rules", {
        method: "PUT",
        body: JSON.stringify({ action: "Rechazo de cuadro comparativo", app: ["PROCURA", "SUPERADMIN"], mail: [] }),
        token: "token",
      }),
    );
    await waitFor(() => expect(screen.queryByText("Guardar todo")).not.toBeInTheDocument());
  });

  it("SUPERADMIN: la fila de la matriz refleja cuando la acción está desmarcada en 'Acciones que envían notificación (app)'", async () => {
    mockUseAppSettings.mockReturnValue({
      settings: {
        notificaciones: [
          makeSetting({
            id: 5,
            group: "notificaciones",
            key: "acciones_con_notificacion_app",
            type: "json",
            // "Rechazo de cuadro comparativo" quedó fuera de la lista.
            value: '["Confirmacion de contratacion"]',
            label: "Acciones que envían notificación (app)",
            min_value: null,
            max_value: null,
          }),
        ],
      },
      isLoading: false,
      updateSetting: mockUpdateSetting,
    });

    render(<ConfigAppPanel authToken="token" activeRole="SUPERADMIN" />);

    // La matriz de reglas vive en la tab "Notificaciones" — no es la activa
    // por default (esa es "Negocio").
    fireEvent.click(screen.getByRole("tab", { name: "Notificaciones" }));

    await waitFor(() => expect(screen.getByText("Notificaciones por rol")).toBeInTheDocument());

    // Solo el canal app está silenciado (acciones_con_correo no está en este
    // mock, así que ese canal queda sin filtrar) — se expande la fila de la
    // matriz y se verifica el aviso específico del canal app.
    const matrixSection = screen.getByText("Notificaciones por rol").closest(".bg-surface") as HTMLElement;
    fireEvent.click(within(matrixSection).getByText("Rechazo de cuadro comparativo"));
    expect(screen.getByText('Desactivada en "Acciones que envían notificación (app)"')).toBeInTheDocument();
  });
});
