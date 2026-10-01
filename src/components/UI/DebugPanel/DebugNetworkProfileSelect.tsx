/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de red simulada (tab Network). Solo afecta a las llamadas de la
 * app por apiFetch/apiDownload — no al navegador, Pusher ni fetch/axios
 * directos (ver services/debugNetwork.ts).
 */

import { Gauge } from "lucide-react";
import { useDebugStore } from "@/stores/debugStore";
import { NETWORK_PROFILES, NETWORK_PROFILE_KEYS, type NetworkProfileKey } from "@/utils/debugNetworkProfile";

export default function DebugNetworkProfileSelect() {
  const profile = useDebugStore(s => s.networkProfile);
  const setNetworkProfile = useDebugStore(s => s.setNetworkProfile);

  return (
    <label
      className="flex items-center gap-1 text-[10px] font-bold text-slate-600"
      title="Simula latencia u offline solo para las llamadas de la app (apiFetch/apiDownload)"
    >
      <Gauge className="h-3 w-3" />
      <select
        value={profile}
        onChange={e => setNetworkProfile(e.target.value as NetworkProfileKey)}
        aria-label="Red simulada"
        className="rounded-lg border border-border-default bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
      >
        {NETWORK_PROFILE_KEYS.map(key => (
          <option key={key} value={key}>{NETWORK_PROFILES[key].label}</option>
        ))}
      </select>
    </label>
  );
}
