import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Radio, Search, RefreshCw, Cpu, Activity } from 'lucide-react';
import { sensorService } from '../services/sensorService.js';
import { fieldService } from '../services/fieldService.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Badge from '../components/common/Badge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatDate, formatDateTime } from '../utils/formatters.js';

export default function SensorsPage() {
  const { showToast } = useToast();
  const [sensors, setSensors] = useState([]);
  const [fieldsList, setFieldsList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorDetails, setSensorDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    field_id: '',
    sensor_code: '',
    sensor_type: 'SOIL_MOISTURE',
    unit_of_measurement: '%',
    status: 'ACTIVE',
    installation_date: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const loadFields = async () => {
    try {
      const res = await fieldService.getAll({ limit: 100 });
      setFieldsList(res.data);
    } catch {
      // ignore
    }
  };

  const fetchSensors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        sensor_type: typeFilter || undefined,
        status: statusFilter || undefined,
      };
      const res = await sensorService.getAll(params);
      setSensors(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    fetchSensors();
  }, [fetchSensors]);

  const handleOpenCreate = () => {
    setSelectedSensor(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      field_id: fieldsList[0]?.field_id || '',
      sensor_code: `SM-${Math.floor(100 + Math.random() * 900)}`,
      sensor_type: 'SOIL_MOISTURE',
      unit_of_measurement: '%',
      status: 'ACTIVE',
      installation_date: today,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s) => {
    setSelectedSensor(s);
    setFormData({
      field_id: s.field_id,
      sensor_code: s.sensor_code,
      sensor_type: s.sensor_type,
      unit_of_measurement: s.unit_of_measurement,
      status: s.status,
      installation_date: s.installation_date ? s.installation_date.substring(0, 10) : '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenView = async (s) => {
    try {
      const details = await sensorService.getById(s.sensor_id);
      setSensorDetails(details);
      setIsDetailOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDelete = (s) => {
    setSelectedSensor(s);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.field_id) errs.field_id = 'Field selection is required';
    if (!formData.sensor_code.trim()) errs.sensor_code = 'Sensor code is required';
    if (!formData.sensor_type) errs.sensor_type = 'Sensor type is required';
    if (!formData.unit_of_measurement.trim()) errs.unit_of_measurement = 'Unit is required';
    if (!formData.installation_date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.installation_date)) {
      errs.installation_date = 'Installation date is required (YYYY-MM-DD)';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        field_id: Number(formData.field_id),
        sensor_code: formData.sensor_code.trim(),
        sensor_type: formData.sensor_type,
        unit_of_measurement: formData.unit_of_measurement.trim(),
        status: formData.status,
        installation_date: formData.installation_date,
      };

      if (selectedSensor) {
        await sensorService.update(selectedSensor.sensor_id, payload);
        showToast(`Sensor '${payload.sensor_code}' updated successfully`, 'success');
      } else {
        await sensorService.create(payload);
        showToast(`Sensor '${payload.sensor_code}' registered successfully`, 'success');
      }
      setIsFormOpen(false);
      fetchSensors();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSensor) return;
    setIsSubmitting(true);
    try {
      await sensorService.delete(selectedSensor.sensor_id);
      showToast(`Sensor '${selectedSensor.sensor_code}' deleted successfully`, 'success');
      setIsDeleteOpen(false);
      fetchSensors();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (newType) => {
    let unit = '%';
    if (newType === 'AIR_TEMPERATURE') unit = '°C';
    else if (newType === 'HUMIDITY') unit = '%';
    else if (newType === 'LIGHT') unit = 'lux';

    setFormData((prev) => ({
      ...prev,
      sensor_type: newType,
      unit_of_measurement: unit,
    }));
  };

  const statusBadgeVariant = (st) => {
    switch (st) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'neutral';
      case 'FAULTY': return 'danger';
      case 'MAINTENANCE': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sensor Hardware Registry</h2>
          <p className="text-xs text-slate-500 mt-1">
            Registered agricultural telemetry nodes, field placements, and operational states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Register New Sensor
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code or field..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f]"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="FAULTY">Faulty</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchSensors} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {loading && !sensors.length ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Sensors"
          message={error.message}
          onRetry={fetchSensors}
          isNetworkError={error.isNetworkError}
        />
      ) : sensors.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No sensors found"
          message={search || typeFilter || statusFilter ? 'No sensors match your query.' : 'Register physical or simulated sensor units to stream telemetry.'}
          actionLabel={search || typeFilter || statusFilter ? undefined : 'Register New Sensor'}
          onAction={search || typeFilter || statusFilter ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Sensor ID</th>
                  <th className="py-3 px-4">Sensor Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Installed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sensors.map((s) => (
                  <tr key={s.sensor_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{s.sensor_id}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{s.sensor_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={s.sensor_type === 'SOIL_MOISTURE' ? 'forest' : 'info'}>
                        {s.sensor_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium text-slate-900">{s.field_name}</span>
                      <span className="text-slate-400 text-[11px] block">{s.farm_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">{s.unit_of_measurement}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(s.installation_date)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          title="View Telemetry Summary"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Sensor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Sensor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedSensor ? `Edit Sensor #${selectedSensor.sensor_id}` : 'Register Sensor Unit'}
        subtitle="Hardware node configuration and field placement"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Field Subdivision Placement"
              name="field_id"
              value={formData.field_id}
              onChange={(e) => setFormData({ ...formData, field_id: e.target.value })}
              options={fieldsList.map((f) => ({ value: f.field_id, label: `${f.field_name} (${f.farm_name})` }))}
              placeholder="Select Field"
              error={formErrors.field_id}
              required
            />
            <Input
              label="Sensor Identification Code"
              name="sensor_code"
              placeholder="e.g. SM-101"
              value={formData.sensor_code}
              onChange={(e) => setFormData({ ...formData, sensor_code: e.target.value })}
              error={formErrors.sensor_code}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Sensor Type"
              name="sensor_type"
              value={formData.sensor_type}
              onChange={(e) => handleTypeChange(e.target.value)}
              options={['SOIL_MOISTURE', 'AIR_TEMPERATURE', 'HUMIDITY', 'LIGHT']}
              required
            />
            <Input
              label="Unit of Measurement"
              name="unit_of_measurement"
              placeholder="e.g. % or °C"
              value={formData.unit_of_measurement}
              onChange={(e) => setFormData({ ...formData, unit_of_measurement: e.target.value })}
              error={formErrors.unit_of_measurement}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Operational Status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={['ACTIVE', 'INACTIVE', 'FAULTY', 'MAINTENANCE']}
              required
            />
            <Input
              label="Installation Date (YYYY-MM-DD)"
              name="installation_date"
              type="date"
              value={formData.installation_date}
              onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
              error={formErrors.installation_date}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedSensor ? 'Update Sensor' : 'Register Sensor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sensor Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={sensorDetails ? `${sensorDetails.sensor_code} Profile` : 'Sensor Details'}
        subtitle="Hardware status and telemetry telemetry stream"
        maxWidth="max-w-xl"
      >
        {sensorDetails && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Sensor Code</span>
                <span className="font-bold font-mono text-slate-800">{sensorDetails.sensor_code}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Type</span>
                <span className="font-semibold text-slate-800">{sensorDetails.sensor_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <Badge size="sm" variant={statusBadgeVariant(sensorDetails.status)}>{sensorDetails.status}</Badge>
              </div>
              <div>
                <span className="text-slate-400 block">Readings Count</span>
                <span className="font-bold text-emerald-800 font-mono">{sensorDetails.total_readings} entries</span>
              </div>
            </div>

            {sensorDetails.latest_reading ? (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-700" /> Latest Telemetry Reading
                  </span>
                  <Badge size="sm" variant={sensorDetails.latest_reading.data_source === 'SIMULATED' ? 'neutral' : 'forest'}>
                    {sensorDetails.latest_reading.data_source}
                  </Badge>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {Number(sensorDetails.latest_reading.reading_value).toFixed(2)} {sensorDetails.unit_of_measurement}
                </div>
                <p className="text-xs text-slate-500">
                  Recorded at {formatDateTime(sensorDetails.latest_reading.recorded_at)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No telemetry readings received from this sensor yet.</p>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Sensor Deletion"
        message={`Are you sure you want to delete sensor '${selectedSensor?.sensor_code}'? Related telemetry records will be protected by foreign-key safety.`}
        confirmText="Delete Sensor"
        isLoading={isSubmitting}
      />
    </div>
  );
}
