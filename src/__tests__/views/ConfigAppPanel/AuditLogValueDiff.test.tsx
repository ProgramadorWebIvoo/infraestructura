import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuditLogValueDiff from "@/views/ConfigAppPanel/components/AuditLogValueDiff";

describe("AuditLogValueDiff", () => {
  it("muestra un diff escalar simple para valores no-JSON", () => {
    render(<AuditLogValueDiff oldValue="7" newValue="90" />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
  });

  it("muestra tags añadidos/quitados para arrays JSON", () => {
    render(<AuditLogValueDiff oldValue='["a","b"]' newValue='["a","c"]' />);
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("+ c")).toBeInTheDocument();
    expect(screen.queryByText("a")).not.toBeInTheDocument();
  });

  it("para un objeto JSON, muestra el identificador (code) como contexto y solo los campos que cambiaron", () => {
    render(
      <AuditLogValueDiff
        oldValue='{"code":"EUR","name":"Euro","symbol":"€","is_active":true}'
        newValue='{"code":"EUR","name":"Euro","symbol":"€","is_active":false}'
      />,
    );
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.getByText("Estado:")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.queryByText("Nombre:")).not.toBeInTheDocument();
    expect(screen.queryByText("Símbolo:")).not.toBeInTheDocument();
  });

  it("para un objeto JSON, muestra múltiples campos cambiados (nombre y símbolo a la vez)", () => {
    render(
      <AuditLogValueDiff
        oldValue='{"code":"EUR","name":"Euro","symbol":"€","is_active":true}'
        newValue='{"code":"EUR","name":"Euro (actualizado)","symbol":"EU","is_active":true}'
      />,
    );
    expect(screen.getByText("Nombre:")).toBeInTheDocument();
    expect(screen.getByText("Euro")).toBeInTheDocument();
    expect(screen.getByText("Euro (actualizado)")).toBeInTheDocument();
    expect(screen.getByText("Símbolo:")).toBeInTheDocument();
    expect(screen.getByText("€")).toBeInTheDocument();
    expect(screen.getByText("EU")).toBeInTheDocument();
    expect(screen.queryByText("Estado:")).not.toBeInTheDocument();
  });

  it("para un objeto JSON sin cambios reales, muestra el mensaje de 'sin cambios'", () => {
    render(
      <AuditLogValueDiff
        oldValue='{"code":"EUR","name":"Euro","symbol":"€","is_active":true}'
        newValue='{"code":"EUR","name":"Euro","symbol":"€","is_active":true}'
      />,
    );
    expect(screen.getByText("Sin cambios.")).toBeInTheDocument();
  });
});
