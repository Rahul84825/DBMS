import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  TrendingUp,
  Receipt,
  Sprout,
  Droplets,
  BarChart2,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';

import { reportService } from '../services/reportService.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import ChartContainer from '../components/charts/ChartContainer.jsx';
import { TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { exportToCsv } from '../utils/exportCsv.js';
import {
  formatCurrency,
  formatNumber,
  formatKg,
  formatHectares,
} from '../utils/formatters.js';

export default function ReportsPage() {
  // Active report tab: 'harvests' | 'expenses' | 'crops' | 'irrigation'
  const [activeReport, setActiveReport] = useState('harvests');

  const [harvestsData, setHarvestsData] = useState([]);
  const [expensesData, setExpensesData] = useState(null);
  const [cropsData, setCropsData] = useState([]);
  const [irrigationData, setIrrigationData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCurrentReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeReport === 'harvests') {
        const data = await reportService.getHarvests();
        setHarvestsData(data);
      } else if (activeReport === 'expenses') {
        const data = await reportService.getExpenses();
        setExpensesData(data);
      } else if (activeReport === 'crops') {
        const data = await reportService.getCrops();
        setCropsData(data);
      } else if (activeReport === 'irrigation') {
        const data = await reportService.getIrrigation();
        setIrrigationData(data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeReport]);

  useEffect(() => {
    fetchCurrentReport();
  }, [fetchCurrentReport]);

  // Handle CSV export of the active report dataset
  const handleExportCsv = () => {
    if (activeReport === 'harvests') {
      exportToCsv(harvestsData, 'smart_farm_harvest_report.csv', [
        { key: 'crop_name', label: 'Crop Name' },
        { key: 'variety', label: 'Variety' },
        { key: 'harvest_count', label: 'Harvest Events' },
        { key: 'total_yield_kg', label: 'Total Yield (kg)' },
        { key: 'total_revenue_usd', label: 'Total Revenue (USD)' },
        { key: 'avg_yield_kg_per_ha', label: 'Avg Yield (kg/ha)' },
      ]);
    } else if (activeReport === 'expenses') {
      const exportList = (expensesData?.byCategory || []).map((cat) => ({
        category: cat.category,
        transaction_count: cat.transaction_count,
        total_spent_usd: cat.total_spent_usd,
        avg_amount_usd: cat.avg_amount_usd,
      }));
      exportToCsv(exportList, 'smart_farm_expenses_by_category.csv');
    } else if (activeReport === 'crops') {
      exportToCsv(cropsData, 'smart_farm_crop_agronomics_report.csv', [
        { key: 'crop_name', label: 'Crop Name' },
        { key: 'variety', label: 'Variety' },
        { key: 'optimal_soil_moisture_min', label: 'Min Moisture (%)' },
        { key: 'optimal_soil_moisture_max', label: 'Max Moisture (%)' },
        { key: 'optimal_temp_celsius_min', label: 'Min Temp (°C)' },
        { key: 'optimal_temp_celsius_max', label: 'Max Temp (°C)' },
        { key: 'growth_duration_days', label: 'Cycle Days' },
        { key: 'total_plantings', label: 'Total Plantings' },
        { key: 'currently_growing', label: 'Active Growing' },
        { key: 'total_hectares_planted', label: 'Total Hectares Planted' },
      ]);
    } else if (activeReport === 'irrigation') {
      const exportList = (irrigationData?.byField || []).map((f) => ({
        field_name: f.field_name,
        farm_name: f.farm_name,
        event_count: f.event_count,
        total_liters_applied: f.total_liters_applied,
      }));
      exportToCsv(exportList, 'smart_farm_irrigation_by_field.csv');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agricultural Analytics & Reports</h2>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated SQL reporting queries for harvest performance, operational expenditure, agronomics, and water volumes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCurrentReport} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportCsv} icon={Download}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveReport('harvests')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
            activeReport === 'harvests'
              ? 'border-emerald-700 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Harvest Performance
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('expenses')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
            activeReport === 'expenses'
              ? 'border-emerald-700 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Expense Breakdown
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('crops')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
            activeReport === 'crops'
              ? 'border-emerald-700 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sprout className="w-4 h-4" />
          Crop Agronomics
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('irrigation')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
            activeReport === 'irrigation'
              ? 'border-emerald-700 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Droplets className="w-4 h-4" />
          Irrigation Operations
        </button>
      </div>

      {error ? (
        <ErrorState title="Failed to Load Analytical Report" message={error.message} onRetry={fetchCurrentReport} />
      ) : loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : null}

      {/* 1. HARVEST PERFORMANCE REPORT */}
      {!loading && !error && activeReport === 'harvests' && (
        <div className="space-y-6">
          <ChartContainer
            title="Total Harvest Revenue by Crop Variety"
            subtitle="Calculated market valuation from SQL GROUP BY crop_id aggregate (USD)"
            isEmpty={harvestsData.length === 0}
            emptyMessage="No harvest yields recorded yet"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={harvestsData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="crop_name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${formatCurrency(val)} (${formatKg(item.payload.total_yield_kg)})`,
                    'Revenue',
                  ]}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                />
                <Bar dataKey="total_revenue_usd" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <Card title="Harvest Yield Summary by Crop" subtitle="Aggregate SQL performance dataset">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Crop & Variety</th>
                    <th className="py-3 px-4">Harvest Count</th>
                    <th className="py-3 px-4">Total Yield Weight</th>
                    <th className="py-3 px-4">Total Gross Revenue</th>
                    <th className="py-3 px-4">Avg Yield (kg / ha)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {harvestsData.map((row) => (
                    <tr key={row.crop_id} className="hover:bg-slate-50/75">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{row.crop_name}</span>
                        <span className="text-slate-500 text-[11px]">{row.variety}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{row.harvest_count}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatKg(row.total_yield_kg)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {formatCurrency(row.total_revenue_usd)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {row.avg_yield_kg_per_ha ? `${formatNumber(row.avg_yield_kg_per_ha)} kg/ha` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 2. EXPENSE BREAKDOWN REPORT */}
      {!loading && !error && activeReport === 'expenses' && expensesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer
              title="Expenses by Category"
              subtitle="SQL GROUP BY category aggregate (USD)"
              isEmpty={!expensesData.byCategory?.length}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesData.byCategory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Total Spent']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_spent_usd" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer
              title="Expenses by Farm Location"
              subtitle="SQL GROUP BY farm_id aggregate (USD)"
              isEmpty={!expensesData.byFarm?.length}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesData.byFarm} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="farm_name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Total Spent']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_spent_usd" fill="#9333EA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Expenditures by Category">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Transactions</th>
                    <th className="py-2.5 px-3 text-right">Total Spent</th>
                    <th className="py-2.5 px-3 text-right">Avg / Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expensesData.byCategory?.map((cat) => (
                    <tr key={cat.category}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{cat.category}</td>
                      <td className="py-2.5 px-3 font-mono">{cat.transaction_count}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(cat.total_spent_usd)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(cat.avg_amount_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Expenditures by Farm Property">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Farm Name</th>
                    <th className="py-2.5 px-3">Transactions</th>
                    <th className="py-2.5 px-3 text-right">Total Spent</th>
                    <th className="py-2.5 px-3 text-right">Avg / Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expensesData.byFarm?.map((fm) => (
                    <tr key={fm.farm_id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{fm.farm_name}</td>
                      <td className="py-2.5 px-3 font-mono">{fm.transaction_count}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(fm.total_spent_usd)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(fm.avg_transaction_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* 3. CROP AGRONOMICS REPORT */}
      {!loading && !error && activeReport === 'crops' && (
        <Card title="Crop Cultivation & Agronomic Bounds Report" subtitle="Agronomic baseline parameters and acreage utilization">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Crop Name</th>
                  <th className="py-3 px-4">Variety</th>
                  <th className="py-3 px-4">Moisture Bounds</th>
                  <th className="py-3 px-4">Thermal Bounds</th>
                  <th className="py-3 px-4">Cycle Days</th>
                  <th className="py-3 px-4">Total Plantings</th>
                  <th className="py-3 px-4">Currently Growing</th>
                  <th className="py-3 px-4">Total Area (ha)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cropsData.map((c) => (
                  <tr key={c.crop_id} className="hover:bg-slate-50/75">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.crop_name}</td>
                    <td className="py-3 px-4 text-slate-600">{c.variety}</td>
                    <td className="py-3 px-4 font-mono text-emerald-800">
                      {c.optimal_soil_moisture_min}% – {c.optimal_soil_moisture_max}%
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-800">
                      {c.optimal_temp_celsius_min}°C – {c.optimal_temp_celsius_max}°C
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{c.growth_duration_days} days</td>
                    <td className="py-3 px-4 font-mono">{c.total_plantings}</td>
                    <td className="py-3 px-4">
                      <Badge variant={Number(c.currently_growing) > 0 ? 'success' : 'neutral'}>
                        {c.currently_growing} active
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatHectares(c.total_hectares_planted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. IRRIGATION OPERATIONS REPORT */}
      {!loading && !error && activeReport === 'irrigation' && irrigationData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer
              title="Water Applied by Field Subdivision"
              subtitle="SQL GROUP BY field_id aggregate (Liters)"
              isEmpty={!irrigationData.byField?.length}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={irrigationData.byField} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="field_name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `${v / 1000}k L`} />
                  <Tooltip
                    formatter={(val) => [`${formatNumber(val, 0)} Liters`, 'Total Water']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_liters_applied" fill="#0284C7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer
              title="Water Volume by Irrigation Method"
              subtitle="SQL GROUP BY irrigation_method aggregate (Liters)"
              isEmpty={!irrigationData.byMethod?.length}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={irrigationData.byMethod} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="irrigation_method" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `${v / 1000}k L`} />
                  <Tooltip
                    formatter={(val) => [`${formatNumber(val, 0)} Liters`, 'Volume']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_liters" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <Card title="Irrigation Applied per Field Subdivision">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Field Name</th>
                  <th className="py-2.5 px-3">Farm Name</th>
                  <th className="py-2.5 px-3">Irrigation Events</th>
                  <th className="py-2.5 px-3 text-right">Total Applied (Liters)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {irrigationData.byField?.map((f) => (
                  <tr key={f.field_id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{f.field_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{f.farm_name}</td>
                    <td className="py-2.5 px-3 font-mono">{f.event_count}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-800">
                      {formatNumber(f.total_liters_applied, 0)} L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
