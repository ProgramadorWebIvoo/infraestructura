import { describe, it, expect } from "vitest";
import { ALERT_ICONS, ALERT_STYLES, BACKEND_NOTIFICATION_TYPE_MAP, type AlertType } from "@/components/UI/alertStyles";

const ALL_TYPES: AlertType[] = ["success", "error", "warning", "info", "action-required", "urgent"];

describe("alertStyles", () => {
  it("defines an icon and style entry for all 6 AlertType values", () => {
    for (const type of ALL_TYPES) {
      expect(ALERT_ICONS[type]).toBeDefined();
      expect(ALERT_STYLES[type]).toBeDefined();
    }
  });

  it("maps every backend NotificationType value to a valid AlertType", () => {
    const backendTypes = ["informacion", "exito", "advertencia", "error", "accion_requerida", "prioritario"];
    for (const backendType of backendTypes) {
      const mapped = BACKEND_NOTIFICATION_TYPE_MAP[backendType];
      expect(mapped).toBeDefined();
      expect(ALL_TYPES).toContain(mapped);
    }
  });

  it("maps accion_requerida to action-required and prioritario to urgent", () => {
    expect(BACKEND_NOTIFICATION_TYPE_MAP.accion_requerida).toBe("action-required");
    expect(BACKEND_NOTIFICATION_TYPE_MAP.prioritario).toBe("urgent");
  });
});
