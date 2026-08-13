/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de roles como chips — wrapper delgado sobre TagMultiSelect
 * (ya genérico sobre {value,label}[]) que solo agrega los labels legibles
 * de rol. Usado en la matriz de notificaciones de CONFIG APP.
 */

import TagMultiSelect from "./TagMultiSelect";
import { roleLabel } from "../../constants/roles";

interface RoleMultiSelectProps {
  roles: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export default function RoleMultiSelect({ roles, value, onChange, disabled, className }: RoleMultiSelectProps) {
  const options = roles.map(role => ({ value: role, label: roleLabel(role) }));

  return <TagMultiSelect options={options} value={value} onChange={onChange} disabled={disabled} className={className} />;
}
