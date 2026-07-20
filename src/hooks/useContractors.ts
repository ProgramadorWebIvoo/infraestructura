/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook que gestiona el catálogo de contratistas/proveedores.
 */

import { useState, useCallback } from "react";
import type { Contractor } from "../types";
import { INITIAL_CONTRACTORS } from "../data";
import { apiFetch } from "../services/api";

export function useContractors(authToken: string) {
  const [contractors, setContractors] = useState<Contractor[]>([]);

  const handleAddContractor = useCallback((newContractor: Contractor) => {
    setContractors(prev => [...prev.filter(item => item.code !== newContractor.code), newContractor]);
  }, []);

  const handleUpdateContractorRating = useCallback(async (code: string, rating: number) => {
    await apiFetch(`/contractors/${code}/rating`, {
      method: "POST",
      token: authToken,
      body: JSON.stringify({ rating }),
    });
    setContractors(prev => prev.map(c => c.code === code ? { ...c, rating } : c));
  }, [authToken]);

  const resetContractors = useCallback(() => {
    setContractors([]);
  }, []);

  return {
    contractors,
    setContractors,
    handleAddContractor,
    handleUpdateContractorRating,
    resetContractors,
  };
}
