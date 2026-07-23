export default function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200/80 border-l-4 ${color} bg-white p-4 shadow-xs`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
          {sub && <p className="text-[10px] font-medium text-slate-400">{sub}</p>}
        </div>
        <div className="rounded-lg bg-slate-50 p-2 text-slate-400">{icon}</div>
      </div>
    </div>
  );
}
