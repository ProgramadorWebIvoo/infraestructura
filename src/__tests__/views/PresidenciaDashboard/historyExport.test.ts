import { describe, it, expect } from "vitest";
import { HISTORY_EXPORT_COLUMNS, HISTORY_EXPORT_HEADERS, alertsText, toExportRow } from "@/views/PresidenciaDashboard/historyExport";
import type { ProjectHistoryRow } from "@/views/PresidenciaDashboard/projectHistoryTypes";

const noFlags = { unapproved: false, awardedExceedsApproved: false, executedExceedsAwarded: false, executedExceedsApproved: false };
const variation = { approvedVsEstimated: null, awardedVsApproved: null, executedVsAwarded: null, executedVsApproved: null };

const row = (over: Partial<ProjectHistoryRow> = {}): ProjectHistoryRow => ({
  id: "PRJ-002",
  title: "Reparación, cubierta",
  type: "INFRAESTRUCTURA",
  location: "Caracas",
  status: "COMPLETADO_PAGADO",
  createdDate: "2026-09-24",
  contractor: { code: "CON-301", name: "TestRif", rating: 4.5 },
  figures: { estimated: 1400, approved: 2200, awarded: 1940, executed: 2100, executionPercent: 95.45, variation, flags: { ...noFlags, executedExceedsAwarded: true } },
  ...over,
});

describe("historyExport", () => {
  it("tiene un descriptor de columna por cada encabezado", () => {
    expect(HISTORY_EXPORT_COLUMNS).toHaveLength(HISTORY_EXPORT_HEADERS.length);
  });

  it("arma la fila con el mismo orden que los encabezados", () => {
    const r = toExportRow(row());

    expect(r).toHaveLength(HISTORY_EXPORT_HEADERS.length);
    expect(r).toEqual([
      "PRJ-002", "Reparación, cubierta", "INFRAESTRUCTURA", "Caracas", "Completado", "2026-09-24",
      1400, 2200, 1940, 2100, 95.45, "TestRif", 4.5, "Pagado > adjudicado",
    ]);
  });

  it("no inventa datos: obra sin aprobar ni proveedor", () => {
    const r = toExportRow(row({
      location: null,
      contractor: null,
      figures: { estimated: 900, approved: null, awarded: null, executed: 0, executionPercent: null, variation, flags: { ...noFlags, unapproved: true } },
    }));

    expect(r[3]).toBe("");
    expect(r[7]).toBe("Sin aprobar");
    expect(r[8]).toBe("");
    expect(r[10]).toBe("");
    expect(r[11]).toBe("");
    expect(r[12]).toBe("");
    expect(r[13]).toBe("Sin aprobar");
  });

  it("usa el código de estado si no tiene etiqueta", () => {
    expect(toExportRow(row({ status: "ESTADO_RARO" }))[4]).toBe("ESTADO_RARO");
  });

  it("lista todas las alertas activas separadas por punto y coma y vacío si no hay", () => {
    const all = { unapproved: true, awardedExceedsApproved: true, executedExceedsAwarded: true, executedExceedsApproved: true };
    const f = row().figures;

    expect(alertsText({ ...f, flags: all })).toBe("Sin aprobar; Adjudicado > aprobado; Pagado > adjudicado; Pagado > aprobado");
    expect(alertsText({ ...f, flags: noFlags })).toBe("");
  });
});
