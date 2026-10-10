import React from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import Card from '../common/Card.jsx';

export default function ChartContainer({
  title,
  subtitle,
  children,
  isEmpty = false,
  emptyMessage = 'No chart data available to plot.',
  isLoading = false,
  action,
  height = 'h-72',
  className = '',
}) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      action={action}
      className={`flex flex-col ${className}`}
      bodyClassName="flex-1 flex flex-col justify-center"
    >
      {isLoading ? (
        <div className={`w-full ${height} flex items-center justify-center`}>
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Generating visualization...</span>
          </div>
        </div>
      ) : isEmpty ? (
        <div className={`w-full ${height} flex flex-col items-center justify-center p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50`}>
          <BarChart3 className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
          <p className="text-xs text-slate-400 mt-1">Data will populate automatically as records are logged.</p>
        </div>
      ) : (
        <div className={`w-full ${height}`}>{children}</div>
      )}
    </Card>
  );
}
