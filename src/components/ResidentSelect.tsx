import { HardHat } from "lucide-react";
import Select from "@/components/UI/Select";
import { useResidents } from "@/hooks/useResidents";

interface ResidentSelectProps {
  value: number | null;
  onChange: (residentUserId: number | null) => void;
  id?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  /** Offers the "Sin asignar" option (default). Turn off where a resident is mandatory. */
  allowEmpty?: boolean;
  /** Resident to leave out of the list (e.g. the origin of a handover). */
  excludeId?: number | null;
  placeholderLabel?: string;
}

/** Selector of users with role RESIDENTE (active). */
export default function ResidentSelect({ value, onChange, id, size = "md", disabled, allowEmpty = true, excludeId = null, placeholderLabel = "Sin asignar" }: ResidentSelectProps) {
  const residents = useResidents().filter((r) => r.id !== excludeId);
  const empty = allowEmpty || value === null ? [{ value: "", label: allowEmpty ? placeholderLabel : "Selecciona un residente" }] : [];

  return (
    <Select
      id={id}
      size={size}
      disabled={disabled}
      ariaLabel="Ingeniero residente"
      icon={<HardHat className="h-4 w-4" />}
      value={value === null ? "" : String(value)}
      onChange={(v) => onChange(v === "" ? null : Number(v))}
      options={[...empty, ...residents.map((r) => ({ value: String(r.id), label: r.name }))]}
    />
  );
}
