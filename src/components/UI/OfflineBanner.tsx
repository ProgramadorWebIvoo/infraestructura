/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OfflineBanner — Banner global que alerta cuando no hay conexión.
 * Se posiciona fijo en la parte superior y es visible en todas las vistas.
 */

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[99999] bg-rose-600 text-white text-center text-sm font-semibold py-2.5 px-4 shadow-lg flex items-center justify-center gap-2"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Sin conexión a internet. Los cambios no podrán guardarse hasta que se restablezca la conexión.</span>
    </div>
  );
}
