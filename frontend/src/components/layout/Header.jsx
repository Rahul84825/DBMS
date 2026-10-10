import React, { useState, useEffect } from 'react';
import { Menu, RefreshCw, Database, CheckCircle2, AlertTriangle, ServerOff } from 'lucide-react';
import { checkBackendHealth } from '../../services/api.js';

export default function Header({ onOpenSidebar }) {
  const [health, setHealth] = useState({ status: 'checking', database: { connected: false } });
  const [isChecking, setIsChecking] = useState(false);

  const fetchHealth = async () => {
    setIsChecking(true);
    try {
      const res = await checkBackendHealth();
      setHealth(res);
    } catch {
      setHealth({ status: 'offline', database: { connected: false } });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll health status every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-800">
            Agricultural Operations
          </span>
          <h1 className="text-sm font-semibold text-slate-800 -mt-0.5">
            Farm Management & Telemetry Center
          </h1>
        </div>
      </div>

      {/* Backend & DB Health status badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {health.status === 'healthy' && health.database?.connected ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden md:inline font-mono">MySQL 8.x Connected</span>
              <span className="md:hidden">DB Online</span>
            </div>
          ) : health.status === 'degraded' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>DB Degraded</span>
            </div>
          ) : health.status === 'checking' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Connecting...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
              <ServerOff className="w-3.5 h-3.5 text-rose-600" />
              <span>API Offline</span>
            </div>
          )}

          <button
            type="button"
            onClick={fetchHealth}
            disabled={isChecking}
            title="Refresh backend status"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
