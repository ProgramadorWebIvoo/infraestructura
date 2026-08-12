interface AccessDeniedViewProps {
  onLogout: () => void;
}

export default function AccessDeniedView({ onLogout }: AccessDeniedViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">⛔</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Acceso denegado</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Tu cuenta no tiene un rol asignado. Contacta al administrador del sistema para que configure tus permisos.
        </p>
        <button
          onClick={onLogout}
          className="cursor-pointer mt-2 px-6 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
