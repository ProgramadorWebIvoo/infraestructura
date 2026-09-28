/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos de documento activos del proveedor (endpoint público de solo lectura).
 */

import { useEffect, useState } from "react";
import { fetchPublicDocumentTypes, type ContractorDocumentType } from "@/services/contractorDocuments";
import { logError } from "@/services/logger";

export function useContractorDocumentTypes() {
  const [types, setTypes] = useState<ContractorDocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicDocumentTypes()
      .then((data) => {
        if (!cancelled) setTypes(data);
      })
      .catch((error) => {
        logError("useContractorDocumentTypes", error);
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { types, isLoading, hasError };
}
