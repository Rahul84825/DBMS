import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <div className="border-b border-slate-200 bg-slate-50/75 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded animate-pulse flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 bg-slate-100 rounded animate-pulse flex-1"
                style={{ width: `${Math.floor(60 + Math.random() * 35)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default {
  TableSkeleton,
  CardSkeleton,
};
