import { HardHat } from "lucide-react";
import Select from "@/components/UI/Select";
import { useResidents } from "@/hooks/useResidents";

interface ResidentSelectProps {
  value: number | null;
  onChange: (residentUserId: number | null) => void;
  id?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

/** Selector del ingeniero residente / coordinador de mantenimiento (opcional). */
export default function ResidentSelect({ value, onChange, id, size = "md", disabled }: ResidentSelectProps) {
  const residents = useResidents();

  return (
    <Select
      id={id}
      size={size}
      disabled={disabled}
      ariaLabel="Ingeniero residente / coordinador"
      icon={<HardHat className="h-4 w-4" />}
      value={value === null ? "" : String(value)}
      onChange={(v) => onChange(v === "" ? null : Number(v))}
      options={[{ value: "", label: "Sin asignar" }, ...residents.map((r) => ({ value: String(r.id), label: r.name }))]}
    />
  );
}
