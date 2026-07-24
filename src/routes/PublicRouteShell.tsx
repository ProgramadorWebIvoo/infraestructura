import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "../components/ErrorBoundary";
import { ROUTES } from "../routes.tsx";
import type { Contractor } from "../types";

const MaterialesProveedores = lazy(() => import("../views/MaterialesProveedores"));
const PropuestaMaterialesPublica = lazy(() => import("../views/PropuestaMaterialesPublica"));

function FullScreenFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Cargando módulo…</p>
      </div>
    </div>
  );
}

interface PublicRouteShellProps {
  contractorsCount: number;
  onAddContractor: (contractor: Contractor) => void;
}

export default function PublicRouteShell({ contractorsCount, onAddContractor }: PublicRouteShellProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FullScreenFallback />}>
        <Routes>
          <Route
            path={ROUTES.REGISTRO_PROVEEDORES}
            element={
              <MaterialesProveedores
                contractorsCount={contractorsCount}
                onAddContractor={onAddContractor}
              />
            }
          />
          <Route path={ROUTES.PROPUESTA_MATERIALES} element={<PropuestaMaterialesPublica />} />
          <Route path="*" element={<Navigate to={ROUTES.REGISTRO_PROVEEDORES} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
