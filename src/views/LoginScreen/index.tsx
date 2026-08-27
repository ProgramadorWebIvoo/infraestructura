/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pantalla de acceso interno.
 */

import BackgroundDecor from "./components/BackgroundDecor";
import BrandPanel from "./components/BrandPanel";
import LoginForm from "./components/LoginForm";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950 font-sans">
      <BrandPanel />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        {/* En mobile/tablet no hay BrandPanel — el fondo decorativo cubre toda la pantalla */}
        <div className="absolute inset-0 lg:hidden">
          <BackgroundDecor />
        </div>
        {/* En desktop, el lado del formulario vive sobre un lienzo claro y neutro,
            que separa visualmente la mitad editorial de la mitad funcional. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#f8fafc_0%,#eef2f7_55%,#e6ebf1_100%)] lg:block"
        />

        <div className="relative z-10 w-full max-w-md lg:hidden">
          <div className="mb-8 flex items-center justify-center gap-3">
            <img src="/ivoo_logoo.svg" alt="" aria-hidden="true" className="block h-8 w-auto brightness-0 invert" />
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">IVOO</span>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <LoginForm onLogin={onLogin} />
        </div>
      </div>
    </div>
  );
}
