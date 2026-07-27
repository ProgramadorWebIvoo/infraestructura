/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pantalla de acceso interno.
 */

import BackgroundDecor from "./BackgroundDecor";
import LoginForm from "./LoginForm";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 font-sans">
      <BackgroundDecor />
      <LoginForm onLogin={onLogin} />
    </div>
  );
}
