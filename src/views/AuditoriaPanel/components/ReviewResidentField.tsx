/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resident of the work being reviewed (F2-R D14): inherited (read-only) when
 * the location is registered; mandatory choice when it is custom.
 */

import { HardHat } from "lucide-react";
import ResidentSelect from "@/components/ResidentSelect";
import type { Project } from "@/types";
import { reviewNeedsResidentChoice } from "@/utils/projectLocation";

interface ReviewResidentFieldProps {
  project: Pick<Project, "localizationId" | "localizationTitle" | "residentName">;
  value: number | null;
  onChange: (residentUserId: number | null) => void;
}

export default function ReviewResidentField({ project, value, onChange }: ReviewResidentFieldProps) {
  if (!reviewNeedsResidentChoice(project)) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs">
        <HardHat className="h-4 w-4 shrink-0 text-sky-600" />
        <p className="font-medium text-slate-600">
          Ubicación registrada{project.localizationTitle ? ` (${project.localizationTitle})` : ""}: la obra hereda a su residente,{" "}
          <strong className="text-slate-800">{project.residentName ?? "—"}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="review-resident" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Ingeniero residente de la obra <span className="text-rose-500">*</span>
      </label>
      <ResidentSelect id="review-resident" value={value} onChange={onChange} allowEmpty={false} />
      <p className="mt-1 text-[10px] font-medium text-slate-400">Ubicación personalizada: corresponde a Auditoría elegir quién corrobora la obra en campo.</p>
    </div>
  );
}
