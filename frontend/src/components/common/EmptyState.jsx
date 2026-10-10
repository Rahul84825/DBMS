import React from 'react';
import { Database, Plus } from 'lucide-react';
import Button from './Button.jsx';

export default function EmptyState({
  icon: Icon = Database,
  title = 'No records found',
  message = 'There are no items recorded in this section yet.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200/80 my-4">
      <div className="p-4 rounded-2xl bg-emerald-50 text-[#1b4332] border border-emerald-100 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{message}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} icon={Plus}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
