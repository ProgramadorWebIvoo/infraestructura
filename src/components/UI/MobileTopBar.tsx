import { Menu, Building2 } from "lucide-react";

interface MobileTopBarProps {
  user: { name: string; email: string } | null;
  onMenuClick: () => void;
}

export default function MobileTopBar({ user, onMenuClick }: MobileTopBarProps) {
  return (
    <header className="bg-[#0F172A] text-white border-b border-slate-800/80 shadow-sm relative overflow-hidden md:hidden">
      {/* Gradient blur accent */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/4" />

      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <button
            id="btn-mobile-menu"
            aria-label="Abrir menú de navegación"
            onClick={onMenuClick}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-colors duration-200 cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 ring-1 ring-white/15 shrink-0">
            <Building2 className="h-[18px] w-[18px] text-white stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black tracking-tight text-emerald-400 leading-none">IVOO</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.15em] leading-none">Gestión</span>
            </div>
            <p className="text-[9px] text-slate-500 font-medium mt-0.5 tracking-wide leading-tight">
              Construyendo con propósito
            </p>
          </div>
        </div>

        {/* User email */}
        <div className="hidden sm:block text-right">
          <p className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
            {user?.email ?? "Sesión activa"}
          </p>
        </div>
      </div>
    </header>
  );
}
