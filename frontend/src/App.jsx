import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

// Pages
import DashboardPage from './pages/DashboardPage.jsx';
import FarmsPage from './pages/FarmsPage.jsx';
import FieldsPage from './pages/FieldsPage.jsx';
import CropsPage from './pages/CropsPage.jsx';
import PlantingsPage from './pages/PlantingsPage.jsx';
import SensorsPage from './pages/SensorsPage.jsx';
import ReadingsPage from './pages/ReadingsPage.jsx';
import IrrigationPage from './pages/IrrigationPage.jsx';
import HarvestsPage from './pages/HarvestsPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="farms" element={<FarmsPage />} />
            <Route path="fields" element={<FieldsPage />} />
            <Route path="crops" element={<CropsPage />} />
            <Route path="plantings" element={<PlantingsPage />} />
            <Route path="sensors" element={<SensorsPage />} />
            <Route path="readings" element={<ReadingsPage />} />
            <Route path="irrigation" element={<IrrigationPage />} />
            <Route path="harvests" element={<HarvestsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
