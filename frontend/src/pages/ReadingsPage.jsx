import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  Sliders,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { readingService } from '../services/readingService.js';
import { sensorService } from '../services/sensorService.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Badge from '../components/common/Badge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatDateTime, formatPercent } from '../utils/formatters.js';

export default function ReadingsPage() {
  const { showToast } = useToast();

  // Active view tab: 'latest' | 'alerts' | 'history'
  const [activeTab, setActiveTab] = useState('latest');

  // Latest readings state
  const [latestReadings, setLatestReadings] = useState([]);
  const [loadingLatest, setLoadingLatest] = useState(false);

  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [threshold, setThreshold] = useState(30.0);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Historical readings state
  const [historyReadings, setHistoryReadings] = useState([]);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historySourceFilter, setHistorySourceFilter] = useState('');

  // General error state
  const [error, setError] = useState(null);

  // Sensors for ingestion modal
  const [sensorsList, setSensorsList] = useState([]);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ingestion form data
  const [formData, setFormData] = useState({
    sensor_id: '',
    reading_value: '',
    data_source: 'SIMULATED',
    is_valid: true,
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch sensors list
  const loadSensorsList = async () => {
    try {
      const res = await sensorService.getAll({ limit: 100 });
      setSensorsList(res.data);
    } catch {
      // ignore
    }
  };

  // Fetch latest readings
  const fetchLatest = useCallback(async () => {
    setLoadingLatest(true);
    setError(null);
    try {
      const data = await readingService.getLatest();
      setLatestReadings(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingLatest(false);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setError(null);
    try {
      const res = await readingService.getAlerts(threshold);
      setAlerts(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingAlerts(false);
    }
  }, [threshold]);

  // Fetch historical readings
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const params = {
        page: historyPage,
        limit: 15,
        sensor_type: historyTypeFilter || undefined,
        data_source: historySourceFilter || undefined,
      };
      const res = await readingService.getHistory(params);
      setHistoryReadings(res.data);
      setHistoryPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPage, historyTypeFilter, historySourceFilter]);

  useEffect(() => {
    loadSensorsList();
    fetchLatest();
    fetchAlerts();
  }, [fetchLatest, fetchAlerts]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const handleOpenIngest = () => {
    setFormData({
      sensor_id: sensorsList[0]?.sensor_id || '',
      reading_value: '',
      data_source: 'SIMULATED',
      is_valid: true,
    });
    setFormErrors({});
    setIsIngestModalOpen(true);
  };

  const validateIngestForm = () => {
    const errs = {};
    if (!formData.sensor_id) errs.sensor_id = 'Target sensor is required';
    const val = Number(formData.reading_value);
    if (formData.reading_value === '' || isNaN(val)) {
      errs.reading_value = 'A valid numeric reading is required';
    } else {
      const chosenSensor = sensorsList.find((s) => s.sensor_id === Number(formData.sensor_id));
      if (chosenSensor && chosenSensor.sensor_type === 'SOIL_MOISTURE') {
        if (val < 0 || val > 100) {
          errs.reading_value = 'Soil moisture must be between 0% and 100%';
        }
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleIngestSubmit = async (e) => {
    e.preventDefault();
    if (!validateIngestForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        sensor_id: Number(formData.sensor_id),
        reading_value: Number(formData.reading_value),
        data_source: formData.data_source,
        is_valid: Boolean(formData.is_valid),
      };
      await readingService.create(payload);
      showToast('Telemetry reading ingested successfully', 'success');
      setIsIngestModalOpen(false);
      fetchLatest();
      fetchAlerts();
      if (activeTab === 'history') fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sensor Telemetry & Moisture Alerts</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time sensor monitoring, agronomic threshold alerts, and historical telemetry queries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenIngest} icon={Plus}>
            Ingest Telemetry Reading
          </Button>
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-3">
        <Radio className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold block text-blue-950 mb-0.5">Telemetry Data Notice:</span>
          Records tagged as <Badge size="sm" variant="neutral">SIMULATED</Badge> are synthetic benchmark readings generated by the Python simulator and SQL seed workloads for demonstration. Telemetry labeled <Badge size="sm" variant="forest">REAL</Badge> designates live physical IoT device streams.
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('latest')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'latest'
              ? 'border-emerald-700 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Latest Telemetry Snapshot ({latestReadings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'border-amber-600 text-amber-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          Moisture Deficit Alerts ({alerts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-emerald-700 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Historical Telemetry Log
        </button>
      </div>

      {/* TAB 1: LATEST READINGS SNAPSHOT */}
      {activeTab === 'latest' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span>Displaying newest reading for each active sensor node in the database.</span>
            <Button variant="outline" size="sm" onClick={fetchLatest} icon={RefreshCw} isLoading={loadingLatest}>
              Refresh
            </Button>
          </div>

          {loadingLatest && !latestReadings.length ? (
            <TableSkeleton rows={5} cols={7} />
          ) : error ? (
            <ErrorState title="Failed to Load Latest Readings" message={error.message} onRetry={fetchLatest} />
          ) : latestReadings.length === 0 ? (
            <EmptyState icon={Radio} title="No sensor telemetry logged" message="Submit a simulated reading or run the Python simulator to populate readings." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestReadings.map((reading) => {
                const isSoilMoisture = reading.sensor_type === 'SOIL_MOISTURE';
                const isAlert = isSoilMoisture && Number(reading.reading_value) < threshold;

                return (
                  <div
                    key={reading.sensor_id}
                    className={`bg-white rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-sm ${
                      isAlert ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">{reading.sensor_code}</span>
                          <Badge size="sm" variant={reading.data_source === 'SIMULATED' ? 'neutral' : 'forest'}>
                            {reading.data_source}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {reading.field_name} • {reading.farm_name}
                        </p>
                      </div>
                      <Badge variant={reading.sensor_status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {reading.sensor_status}
                      </Badge>
                    </div>

                    <div className="my-4 flex items-baseline justify-between">
                      <div className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                        {Number(reading.reading_value).toFixed(2)}{' '}
                        <span className="text-base font-normal text-slate-500">{reading.unit_of_measurement}</span>
                      </div>
                      <Badge variant={isSoilMoisture ? 'forest' : 'info'}>
                        {reading.sensor_type}
                      </Badge>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(reading.recorded_at)}
                      </span>
                      {isAlert && (
                        <span className="font-semibold text-rose-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Deficit Alert
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SOIL MOISTURE DEFICIT ALERTS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Threshold Configuration Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-emerald-800 shrink-0" />
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Moisture Alert Threshold: <span className="font-mono text-emerald-800">{threshold}%</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Evaluates the newest valid reading per soil moisture sensor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-40 sm:w-52 accent-[#1b4332]"
              />
              <Button size="sm" variant="outline" onClick={fetchAlerts} icon={RefreshCw} isLoading={loadingAlerts}>
                Recalculate
              </Button>
            </div>
          </div>

          {loadingAlerts && !alerts.length ? (
            <TableSkeleton rows={3} cols={6} />
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <div className="p-3 rounded-full bg-emerald-50 text-emerald-700 w-fit mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">All Moisture Readings Above Threshold</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No active soil moisture sensors have latest readings falling below the current {threshold}% test threshold.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50/70 border-b border-amber-200 text-amber-900 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Sensor Code</th>
                      <th className="py-3 px-4">Field Location</th>
                      <th className="py-3 px-4">Latest Moisture</th>
                      <th className="py-3 px-4">Threshold</th>
                      <th className="py-3 px-4">Advisory Recommendation</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alerts.map((alert) => (
                      <tr key={alert.sensor_id} className="hover:bg-amber-50/30">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {alert.sensor_code}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold">{alert.field_name}</span>
                          <span className="text-slate-400 text-[11px] block">{alert.farm_name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-600 text-sm">
                          {formatPercent(alert.latest_soil_moisture_pct)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          &lt; {alert.alert_threshold_pct}%
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="danger">{alert.advisory_notice}</Badge>
                          <span className="text-[11px] text-slate-500 block mt-0.5">{alert.system_advice}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatDateTime(alert.timestamp_recorded)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORICAL TELEMETRY QUERY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <select
                  value={historyTypeFilter}
                  onChange={(e) => {
                    setHistoryTypeFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
                >
                  <option value="">All Sensor Types</option>
                  <option value="SOIL_MOISTURE">Soil Moisture</option>
                  <option value="AIR_TEMPERATURE">Air Temperature</option>
                  <option value="HUMIDITY">Humidity</option>
                  <option value="LIGHT">Light</option>
                </select>
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={historySourceFilter}
                  onChange={(e) => {
                    setHistorySourceFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
                >
                  <option value="">All Data Sources</option>
                  <option value="SIMULATED">SIMULATED</option>
                  <option value="REAL">REAL</option>
                </select>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={fetchHistory} icon={RefreshCw} isLoading={loadingHistory}>
              Refresh
            </Button>
          </div>

          {loadingHistory && !historyReadings.length ? (
            <TableSkeleton rows={5} cols={6} />
          ) : historyReadings.length === 0 ? (
            <EmptyState icon={FileText} title="No historical readings found" message="No telemetry records match the selected parameters." />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Reading ID</th>
                      <th className="py-3 px-4">Sensor Code</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Field</th>
                      <th className="py-3 px-4">Reading Value</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4 text-right">Recorded Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyReadings.map((r) => (
                      <tr key={r.reading_id} className="hover:bg-slate-50/75">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">#{r.reading_id}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{r.sensor_code}</td>
                        <td className="py-3 px-4">
                          <Badge variant={r.sensor_type === 'SOIL_MOISTURE' ? 'forest' : 'info'}>{r.sensor_type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{r.field_name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {Number(r.reading_value).toFixed(2)} {r.unit_of_measurement}
                        </td>
                        <td className="py-3 px-4">
                          <Badge size="sm" variant={r.data_source === 'SIMULATED' ? 'neutral' : 'forest'}>
                            {r.data_source}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">{formatDateTime(r.recorded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <Pagination pagination={historyPagination} onPageChange={(p) => setHistoryPage(p)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingest Reading Modal */}
      <Modal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        title="Ingest Telemetry Reading"
        subtitle="Submit a simulated or real sensor telemetry measurement"
      >
        <form onSubmit={handleIngestSubmit} className="space-y-4">
          <Select
            label="Target Sensor Node"
            name="sensor_id"
            value={formData.sensor_id}
            onChange={(e) => setFormData({ ...formData, sensor_id: e.target.value })}
            options={sensorsList.map((s) => ({
              value: s.sensor_id,
              label: `${s.sensor_code} (${s.sensor_type} • ${s.unit_of_measurement})`,
            }))}
            placeholder="Select Sensor Node"
            error={formErrors.sensor_id}
            required
          />

          <Input
            label="Telemetry Measurement Value"
            name="reading_value"
            type="number"
            step="0.01"
            placeholder="e.g. 24.50"
            value={formData.reading_value}
            onChange={(e) => setFormData({ ...formData, reading_value: e.target.value })}
            error={formErrors.reading_value}
            required
          />

          <Select
            label="Data Provenance Source"
            name="data_source"
            value={formData.data_source}
            onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
            options={['SIMULATED', 'REAL']}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsIngestModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Ingest Reading
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
