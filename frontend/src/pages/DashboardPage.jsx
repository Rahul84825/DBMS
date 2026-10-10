import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Map,
  Sprout,
  Radio,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Droplets,
  RefreshCw,
  Activity,
  ArrowRight,
  ShieldAlert,
  Clock,
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

import { dashboardService } from '../services/dashboardService.js';
import MetricCard from '../components/common/MetricCard.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import ChartContainer from '../components/charts/ChartContainer.jsx';
import { CardSkeleton } from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import {
  formatCurrency,
  formatNumber,
  formatKg,
  formatDateTime,
  formatPercent,
} from '../utils/formatters.js';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [threshold, setThreshold] = useState(30.0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await dashboardService.getSummary(threshold);
      setData(summary);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <CardSkeleton count={4} />
        <CardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="Failed to Load Dashboard Summary"
        message={error.message}
        onRetry={fetchDashboardData}
        isNetworkError={error.isNetworkError}
        errorDetails={error.details}
      />
    );
  }

  const { counts = {}, financials = {}, alerts = {}, recentIrrigation = [], latestReadings = [] } = data || {};

  // Prepare chart data: Moisture readings
  const moistureChartData = (latestReadings || [])
    .filter((r) => r.sensor_type === 'SOIL_MOISTURE')
    .map((r) => ({
      name: r.sensor_code,
      field: r.field_name,
      value: Number(r.reading_value),
      isAlert: Number(r.reading_value) < threshold,
    }));

  // Prepare chart data: Financial overview
  const financialChartData = [
    {
      category: 'Harvest Revenue',
      amount: Number(financials.totalRevenueUsd || 0),
      fill: '#2D6A4F',
    },
    {
      category: 'Farm Expenses',
      amount: Number(financials.totalExpenseUsd || 0),
      fill: '#DC2626',
    },
    {
      category: 'Net Farm Income',
      amount: Math.max(0, Number(financials.netIncomeUsd || 0)),
      fill: '#1B4332',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top action & header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agricultural Overview</h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Database Source: MySQL <code className="text-emerald-700 font-mono">smart_farm_db</code></span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" /> Updated {lastUpdated.toLocaleTimeString()}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            isLoading={loading}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Primary Infrastructure Metric Cards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Farm Infrastructure & Land</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Farms"
            value={formatNumber(counts.farms, 0)}
            subtitle="Registered agrarian sites"
            icon={Building2}
            color="forest"
          />
          <MetricCard
            title="Total Fields"
            value={formatNumber(counts.fields, 0)}
            subtitle="Cultivated soil plots"
            icon={Map}
            color="emerald"
          />
          <MetricCard
            title="Active Plantings"
            value={formatNumber(counts.activePlantings, 0)}
            subtitle={`${counts.totalPlantings || 0} total lifetime cycles`}
            icon={Sprout}
            color="emerald"
          />
          <MetricCard
            title="Active Sensors"
            value={`${counts.activeSensors || 0} / ${counts.sensors || 0}`}
            subtitle={`${counts.telemetryReadings || 0} total telemetry entries`}
            icon={Radio}
            color="sky"
          />
        </div>
      </div>

      {/* Financials & Yield Metric Cards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Harvest Yield & Financials</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Harvest Yield"
            value={formatKg(financials.totalYieldKg)}
            subtitle="Recorded produce weight"
            icon={TrendingUp}
            color="emerald"
          />
          <MetricCard
            title="Harvest Revenue"
            value={formatCurrency(financials.totalRevenueUsd)}
            subtitle="Gross market valuation"
            icon={TrendingUp}
            color="forest"
          />
          <MetricCard
            title="Total Expenses"
            value={formatCurrency(financials.totalExpenseUsd)}
            subtitle="Input & operational expenditures"
            icon={Receipt}
            color="rose"
          />
          <MetricCard
            title="Net Farm Income"
            value={formatCurrency(financials.netIncomeUsd)}
            subtitle="Revenue minus expenses"
            icon={TrendingUp}
            color={Number(financials.netIncomeUsd) >= 0 ? 'emerald' : 'rose'}
          />
        </div>
      </div>

      {/* Critical Moisture Alerts Banner (if any) */}
      {alerts.count > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-900">
                    Low Soil Moisture Deficit Detected ({alerts.count} Sensor{alerts.count > 1 ? 's' : ''})
                  </h4>
                  <Badge variant="warning">Threshold: &lt; {alerts.thresholdUsed}%</Badge>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  The following active sensors report moisture levels below target threshold. Irrigation intervention recommended:
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {alerts.items?.map((item) => (
                    <div
                      key={item.sensor_id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs shadow-2xs"
                    >
                      <span className="font-mono font-semibold text-amber-900">{item.sensor_code}</span>
                      <span className="text-slate-500">({item.field_name})</span>
                      <span className="font-bold text-rose-600">{formatPercent(item.reading_value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Link to="/readings" className="shrink-0">
              <Button size="sm" variant="secondary" icon={ArrowRight} iconPosition="right">
                View Alerts
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Activity className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Soil Moisture Optimal</p>
              <p className="text-xs text-emerald-700">All registered soil moisture sensors are operating at or above the {threshold}% demonstration threshold.</p>
            </div>
          </div>
          <Link to="/readings">
            <span className="text-xs font-semibold text-emerald-800 hover:underline">Monitor Telemetry &rarr;</span>
          </Link>
        </div>
      )}

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Soil Moisture Bar Chart */}
        <ChartContainer
          title="Latest Soil Moisture Levels by Sensor"
          subtitle={`Evaluated against ${threshold}% threshold baseline`}
          isEmpty={moistureChartData.length === 0}
          emptyMessage="No soil moisture sensors registered with telemetry"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moistureChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                formatter={(val, name, item) => [`${val}% (${item.payload.field})`, 'Soil Moisture']}
                contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {moistureChartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.isAlert ? '#DC2626' : '#2D6A4F'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Financial Overview Bar Chart */}
        <ChartContainer
          title="Financial Performance"
          subtitle="Harvest revenue compared against input expenditures (USD)"
          isEmpty={Number(financials.totalRevenueUsd) === 0 && Number(financials.totalExpenseUsd) === 0}
          emptyMessage="No financial revenue or expense transactions recorded"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `$${val}`} />
              <Tooltip
                formatter={(val) => [formatCurrency(val), 'Amount']}
                contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {financialChartData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Operational Activity Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Irrigation Events */}
        <Card
          title="Recent Irrigation Activity"
          subtitle="Latest 5 automated and manual water applications"
          action={
            <Link to="/irrigation" className="text-xs font-semibold text-emerald-800 hover:underline">
              View All &rarr;
            </Link>
          }
        >
          {recentIrrigation.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No irrigation events recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2">Field</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2">Volume</th>
                    <th className="pb-2">Reason</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentIrrigation.map((event) => (
                    <tr key={event.irrigation_id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-medium text-slate-900">{event.field_name}</td>
                      <td className="py-2.5">
                        <Badge size="sm" variant="info">{event.irrigation_method}</Badge>
                      </td>
                      <td className="py-2.5 font-mono text-slate-700">{formatNumber(event.water_volume_liters, 0)} L</td>
                      <td className="py-2.5">
                        <Badge size="sm" variant={event.trigger_reason === 'LOW_MOISTURE_ALERT' ? 'warning' : 'neutral'}>
                          {event.trigger_reason}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right text-slate-400">{formatDateTime(event.start_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Latest Sensor Telemetry Readings */}
        <Card
          title="Latest Sensor Telemetry Snapshot"
          subtitle="Most recent reading recorded per sensor"
          action={
            <Link to="/readings" className="text-xs font-semibold text-emerald-800 hover:underline">
              View All &rarr;
            </Link>
          }
        >
          {latestReadings.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No sensor readings logged.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2">Sensor</th>
                    <th className="pb-2">Field</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Reading</th>
                    <th className="pb-2 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestReadings.slice(0, 6).map((reading) => (
                    <tr key={reading.sensor_id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-mono font-semibold text-slate-900">{reading.sensor_code}</td>
                      <td className="py-2.5 text-slate-700">{reading.field_name}</td>
                      <td className="py-2.5">
                        <Badge size="sm" variant={reading.sensor_type === 'SOIL_MOISTURE' ? 'forest' : 'info'}>
                          {reading.sensor_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-mono font-bold text-slate-900">
                        {Number(reading.reading_value).toFixed(2)} {reading.unit_of_measurement}
                      </td>
                      <td className="py-2.5 text-right text-slate-400">{formatDateTime(reading.recorded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
