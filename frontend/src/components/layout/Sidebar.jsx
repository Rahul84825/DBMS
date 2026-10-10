import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Map,
  Sprout,
  CalendarDays,
  Radio,
  Activity,
  Droplets,
  PackageCheck,
  Receipt,
  FileSpreadsheet,
  X,
  Layers,
} from 'lucide-react';

const navigationLinks = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Farms', path: '/farms', icon: Building2 },
  { name: 'Fields', path: '/fields', icon: Map },
  { name: 'Crop Catalog', path: '/crops', icon: Sprout },
  { name: 'Plantings', path: '/plantings', icon: CalendarDays },
  { name: 'Sensors', path: '/sensors', icon: Radio },
  { name: 'Telemetry & Alerts', path: '/readings', icon: Activity },
  { name: 'Irrigation', path: '/irrigation', icon: Droplets },
  { name: 'Harvests', path: '/harvests', icon: PackageCheck },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Analytical Reports', path: '/reports', icon: FileSpreadsheet },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#143224] text-slate-200 flex flex-col border-r border-[#1e4834] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-[#1e4834] bg-[#0f271c]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sprout className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block">Smart Farm</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 block -mt-0.5">
                DBMS Dashboard
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a3e2d] lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database context badge */}
        <div className="px-5 py-3 border-b border-[#1e4834]/80 bg-[#173a2a]/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> DB Schema:
            </span>
            <span className="font-mono text-emerald-300 text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              smart_farm_db
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-[#1c4532] hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-300" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* System info footer */}
        <div className="p-4 border-t border-[#1e4834] bg-[#0f271c] text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span>API Gateway</span>
            <span className="text-emerald-400 font-mono">/api/v1</span>
          </div>
          <p className="mt-1 text-slate-400 text-[10px]">
            Precision Agriculture • MySQL 8.x
          </p>
        </div>
      </aside>
    </>
  );
}
