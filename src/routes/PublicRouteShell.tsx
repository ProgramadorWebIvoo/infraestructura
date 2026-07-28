import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Spinner from "../components/UI/Spinner";
import ErrorBoundary from "../components/ErrorBoundary";
import { ROUTES } from "../routes.tsx";
import type { Contractor } from "../types";

const MaterialesProveedores = lazy(() => import("../views/MaterialesProveedores"));
const PropuestaMaterialesPublica = lazy(() => import("../views/PropuestaMaterialesPublica"));
const ResetPasswordScreen = lazy(() => import("../views/ResetPasswordScreen"));

function FullScreenFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Spinner size="xl" />
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
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordScreen />} />
          <Route path="*" element={<Navigate to={ROUTES.REGISTRO_PROVEEDORES} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
