import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    mockApiFetch.mockResolvedValue([]);
  });

  it("muestra el spinner mientras isLoading es true", () => {
    mockUseAppSettings.mockReturnValue({ settings: {}, isLoading: true, updateSetting: mockUpdateSetting });

    const { container } = render(<ConfigAppPanel authToken="token" />);

    expect(container.querySelector("[class*='animate-spin']")).toBeTruthy();
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
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/config-audit-logs", { token: "token" }));
    expect(mockApiFetch).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "75" } });
    fireEvent.click(screen.getByText("Guardar todo"));

    // Abrir el panel de auditoría (colapsado por defecto) para ver la entrada.
    const toggle = await screen.findByRole("button", { name: /Historial de cambios/ });
    fireEvent.click(toggle);

    await waitFor(() => expect(screen.getByText("Admin Test", { exact: false })).toBeInTheDocument());

    // Sigue siendo una sola consulta al endpoint — la entrada se insertó localmente.
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});
