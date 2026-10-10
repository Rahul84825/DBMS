import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Droplets, RefreshCw } from 'lucide-react';
import { irrigationService } from '../services/irrigationService.js';
import { fieldService } from '../services/fieldService.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Textarea from '../components/common/Textarea.jsx';
import Badge from '../components/common/Badge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatDateTime, formatNumber } from '../utils/formatters.js';

export default function IrrigationPage() {
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [fieldsList, setFieldsList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [fieldFilter, setFieldFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    field_id: '',
    start_time: '',
    end_time: '',
    water_volume_liters: '',
    irrigation_method: 'DRIP',
    trigger_reason: 'LOW_MOISTURE_ALERT',
    notes: '',
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

  const fetchIrrigations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        field_id: fieldFilter || undefined,
      };
      const res = await irrigationService.getAll(params);
      setEvents(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, fieldFilter]);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    fetchIrrigations();
  }, [fetchIrrigations]);

  const handleOpenCreate = () => {
    setSelectedEvent(null);
    const nowIso = new Date().toISOString().slice(0, 16);
    setFormData({
      field_id: fieldsList[0]?.field_id || '',
      start_time: nowIso,
      end_time: '',
      water_volume_liters: '5000',
      irrigation_method: 'DRIP',
      trigger_reason: 'LOW_MOISTURE_ALERT',
      notes: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedEvent(item);
    setFormData({
      field_id: item.field_id,
      start_time: item.start_time ? item.start_time.replace(' ', 'T').slice(0, 16) : '',
      end_time: item.end_time ? item.end_time.replace(' ', 'T').slice(0, 16) : '',
      water_volume_liters: item.water_volume_liters,
      irrigation_method: item.irrigation_method,
      trigger_reason: item.trigger_reason,
      notes: item.notes || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDelete = (item) => {
    setSelectedEvent(item);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.field_id) errs.field_id = 'Field plot is required';
    if (!formData.start_time) errs.start_time = 'Start timestamp is required';
    if (!formData.water_volume_liters || Number(formData.water_volume_liters) < 0) {
      errs.water_volume_liters = 'Water volume cannot be negative';
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
        start_time: formData.start_time.replace('T', ' '),
        end_time: formData.end_time ? formData.end_time.replace('T', ' ') : null,
        water_volume_liters: Number(formData.water_volume_liters),
        irrigation_method: formData.irrigation_method,
        trigger_reason: formData.trigger_reason,
        notes: formData.notes.trim() || null,
      };

      if (selectedEvent) {
        await irrigationService.update(selectedEvent.irrigation_id, payload);
        showToast('Irrigation event updated successfully', 'success');
      } else {
        await irrigationService.create(payload);
        showToast('Irrigation event logged successfully', 'success');
      }
      setIsFormOpen(false);
      fetchIrrigations();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    try {
      await irrigationService.delete(selectedEvent.irrigation_id);
      showToast('Irrigation event deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchIrrigations();
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Irrigation Operations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated and schedule-driven water delivery records, delivery methods, and volumes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Log Irrigation Event
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-64">
          <select
            value={fieldFilter}
            onChange={(e) => {
              setFieldFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
          >
            <option value="">All Field Plots (Filter)</option>
            {fieldsList.map((f) => (
              <option key={f.field_id} value={f.field_id}>
                {f.field_name} ({f.farm_name})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchIrrigations} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading && !events.length ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState title="Failed to Load Irrigation Records" message={error.message} onRetry={fetchIrrigations} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Droplets}
          title="No irrigation events recorded"
          message={fieldFilter ? 'No events match this field filter.' : 'Log irrigation activities to record water application.'}
          actionLabel={fieldFilter ? undefined : 'Log Irrigation Event'}
          onAction={fieldFilter ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Field & Farm</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Volume (Liters)</th>
                  <th className="py-3 px-4">Trigger Reason</th>
                  <th className="py-3 px-4">Start Time</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((item) => (
                  <tr key={item.irrigation_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{item.irrigation_id}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold text-slate-900 block">{item.field_name}</span>
                      <span className="text-slate-400 text-[11px]">{item.farm_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="info">{item.irrigation_method}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatNumber(item.water_volume_liters, 0)} L
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={item.trigger_reason === 'LOW_MOISTURE_ALERT' ? 'warning' : 'neutral'}>
                        {item.trigger_reason}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDateTime(item.start_time)}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{item.notes || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Event"
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

      {/* Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedEvent ? `Edit Event #${selectedEvent.irrigation_id}` : 'Log Irrigation Event'}
        subtitle="Record water volume, distribution mechanism, and activation reason"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Field Parcel"
            name="field_id"
            value={formData.field_id}
            onChange={(e) => setFormData({ ...formData, field_id: e.target.value })}
            options={fieldsList.map((f) => ({ value: f.field_id, label: `${f.field_name} (${f.farm_name})` }))}
            placeholder="Select Field Parcel"
            error={formErrors.field_id}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Timestamp"
              name="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              error={formErrors.start_time}
              required
            />
            <Input
              label="End Timestamp (Optional)"
              name="end_time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Water Volume (Liters)"
              name="water_volume_liters"
              type="number"
              min="0"
              placeholder="e.g. 5000"
              value={formData.water_volume_liters}
              onChange={(e) => setFormData({ ...formData, water_volume_liters: e.target.value })}
              error={formErrors.water_volume_liters}
              required
            />
            <Select
              label="Irrigation Method"
              name="irrigation_method"
              value={formData.irrigation_method}
              onChange={(e) => setFormData({ ...formData, irrigation_method: e.target.value })}
              options={['DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL']}
              required
            />
          </div>

          <Select
            label="Activation Trigger Reason"
            name="trigger_reason"
            value={formData.trigger_reason}
            onChange={(e) => setFormData({ ...formData, trigger_reason: e.target.value })}
            options={['LOW_MOISTURE_ALERT', 'MANUAL_SCHEDULE', 'AUTOMATED_RULE']}
            required
          />

          <Textarea
            label="Operational Notes (Optional)"
            name="notes"
            placeholder="Drip emitter pressure, zone valves, etc."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedEvent ? 'Update Record' : 'Save Irrigation Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Irrigation Record Deletion"
        message="Are you sure you want to delete this irrigation event log?"
        confirmText="Delete Event"
        isLoading={isSubmitting}
      />
    </div>
  );
}
