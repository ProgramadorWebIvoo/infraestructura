import { Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";
import RoleBadge from "./RoleBadge";

interface MobileTopBarProps {
  user: { name: string; email: string } | null;
  activeRole: string;
  onMenuClick: () => void;
}

export default function MobileTopBar({ user, activeRole, onMenuClick }: MobileTopBarProps) {
  return (
    <header className="bg-[#0F172A] text-white border-b border-slate-800/60 shadow-sm relative overflow-hidden lg:hidden">
      {/* Atmospheric light — matching sidebar header */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2.5">
        {/* Menu + Logo (mismo SVG oficial que el sidebar desktop, antes un ícono genérico Building2) */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            id="btn-mobile-menu"
            aria-label="Abrir menú de navegación"
            onClick={onMenuClick}
            className="p-2 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-colors duration-200 cursor-pointer shrink-0"
          >
            <Menu className="h-5.5 w-5.5" />
          </button>

          <img src="/ivoo_logoo.svg" alt="IVOO" className="block h-7 w-auto shrink-0" />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <RoleBadge role={activeRole} variant="dark" compact className="max-w-24 truncate" />
          <NotificationBell />
        </div>
      </div>

      {user?.email && (
        <div className="relative z-10 px-3 pb-2 -mt-1">
          <p className="text-[10px] text-slate-500 font-mono truncate">{user.email}</p>
        </div>
      )}
    </header>
  );
}
