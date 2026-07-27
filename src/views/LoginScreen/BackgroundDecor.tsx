/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fondo animado con orbes gradientes y grid — extraído de LoginScreen.
 */

export default function BackgroundDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/5 blur-3xl" />
      {/* Grid pattern sutil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}
