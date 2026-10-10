import React from 'react';
import { AlertCircle, RefreshCw, Terminal, ServerOff } from 'lucide-react';
import Button from './Button.jsx';

export default function ErrorState({
  title = 'Failed to load data',
  message,
  onRetry,
  isNetworkError = false,
  errorDetails,
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border border-rose-200 bg-rose-50/50 p-6 sm:p-8 text-slate-800 ${className}`}
      role="alert"
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="p-3 rounded-xl bg-rose-100 text-rose-700 shrink-0">
          {isNetworkError ? <ServerOff className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-rose-900">{title}</h3>
          <p className="mt-1 text-sm text-rose-700 leading-relaxed">
            {message || 'An error occurred while communicating with the Smart Farm backend API.'}
          </p>

          {isNetworkError && (
            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Terminal className="w-4 h-4" />
                <span>Backend Connection Help:</span>
              </div>
              <p className="text-slate-300">
                1. Ensure MySQL service is running on <code className="text-amber-300">localhost:3306</code>
              </p>
              <p className="text-slate-300">
                2. Start the Express API server from the project directory:
              </p>
              <p className="bg-slate-800 p-2 rounded text-emerald-300 select-all">
                cd backend && npm start
              </p>
              <p className="text-slate-400 text-[11px]">
                API will listen on <code className="text-slate-200">http://localhost:5000/api/v1</code>
              </p>
            </div>
          )}

          {errorDetails && (
            <details className="mt-3 text-xs text-rose-800 cursor-pointer">
              <summary className="font-medium hover:underline">Technical error details</summary>
              <pre className="mt-2 p-3 bg-white/80 rounded border border-rose-200 overflow-x-auto text-[11px]">
                {typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : String(errorDetails)}
              </pre>
            </details>
          )}

          {onRetry && (
            <div className="mt-5">
              <Button
                variant="primary"
                onClick={onRetry}
                icon={RefreshCw}
                size="sm"
              >
                Retry Request
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
