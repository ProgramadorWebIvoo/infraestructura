import type { Localization, LocalizationType } from "@/types";

export const LOCALIZATION_TYPE_LABELS: Record<LocalizationType, string> = {
  TIENDA: "Tienda",
  PLANTA: "Planta",
  OFICINA: "Oficina",
  OTRO: "Otro",
};

export const LOCALIZATION_TYPE_OPTIONS = (Object.keys(LOCALIZATION_TYPE_LABELS) as LocalizationType[]).map((value) => ({
  value,
  label: LOCALIZATION_TYPE_LABELS[value],
}));

/** Same "title — city" copy the backend stores in `projects.location` for registered locations. */
export const localizationLabel = (l: Pick<Localization, "title" | "city">) => `${l.title} — ${l.city}`;
