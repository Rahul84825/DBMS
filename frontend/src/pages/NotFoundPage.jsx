import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import Button from '../components/common/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 rounded-2xl bg-emerald-50 text-[#1b4332] border border-emerald-200 mb-6">
        <Compass className="w-12 h-12 stroke-[1.5]" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900">404 — Page Not Found</h1>
      <p className="mt-2 text-slate-500 max-w-md">
        The requested agricultural resource, entity page, or report route does not exist.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button icon={Home}>Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
