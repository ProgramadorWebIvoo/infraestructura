// Skeleton primitives for loading states
// Uses animate-pulse with slate palette that matches the bento aesthetic

import { memo } from "react";

const base = "animate-pulse bg-slate-200 rounded-xl";

export const SkeletonBlock = memo(function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`${base} ${className}`} />;
});

export const SkeletonCard = memo(function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 ${className}`}>
      <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-6">
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/5" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-3/4" />
      </div>
    </div>
  );
});

export const SkeletonStats = memo(function SkeletonStats({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 shadow-sm p-5 bg-white ${className}`}>
      <SkeletonBlock className="h-3 w-1/2 mb-3" />
      <SkeletonBlock className="h-8 w-3/4 mb-2" />
      <SkeletonBlock className="h-3 w-2/3" />
    </div>
  );
});

export const SkeletonStatsDark = memo(function SkeletonStatsDark({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md ${className}`}>
      <SkeletonBlock className="h-3 w-1/2 mb-3 !bg-slate-700" />
      <SkeletonBlock className="h-8 w-3/4 mb-2 !bg-slate-700" />
      <SkeletonBlock className="h-3 w-2/3 !bg-slate-700" />
    </div>
  );
});

export const SkeletonTableRow = memo(function SkeletonTableRow({ cells = 5 }: { cells?: number }) {
  return (
    <tr className="border-b border-slate-50">
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <SkeletonBlock className={`h-4 ${i === 0 ? "w-32" : i === cells - 1 ? "w-20" : "w-24"}`} />
        </td>
      ))}
    </tr>
  );
});

export const SkeletonTable = memo(function SkeletonTable({
  rows = 5,
  columns = 6,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}>
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-3 w-64" />
          </div>
          <SkeletonBlock className="h-8 w-24" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="py-3 px-4">
                  <SkeletonBlock className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonTableRow key={i} cells={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export const SkeletonList = memo(function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 border border-slate-100 rounded-xl">
          <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-3/5" />
            <SkeletonBlock className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
});

export const SkeletonBadge = memo(function SkeletonBadge({ className = "" }: { className?: string }) {
  return <SkeletonBlock className={`h-5 w-16 rounded-lg ${className}`} />;
});

export const SkeletonButton = memo(function SkeletonButton({ className = "" }: { className?: string }) {
  return <SkeletonBlock className={`h-10 rounded-xl ${className}`} />;
});
