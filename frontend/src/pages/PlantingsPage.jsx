import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, CalendarDays, RefreshCw, Filter } from 'lucide-react';
import { plantingService } from '../services/plantingService.js';
import { fieldService } from '../services/fieldService.js';
import { cropService } from '../services/cropService.js';
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
import { formatDate, formatHectares, formatKg, formatCurrency } from '../utils/formatters.js';

export default function PlantingsPage() {
  const { showToast } = useToast();
  const [plantings, setPlantings] = useState([]);
  const [fieldsList, setFieldsList] = useState([]);
  const [cropsList, setCropsList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPlanting, setSelectedPlanting] = useState(null);
  const [plantingDetails, setPlantingDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    field_id: '',
    crop_id: '',
    planting_date: '',
    expected_harvest_date: '',
    status: 'GROWING',
    planted_area_hectares: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const loadReferenceData = async () => {
    try {
      const [fRes, cRes] = await Promise.all([
        fieldService.getAll({ limit: 100 }),
        cropService.getAll({ limit: 100 }),
      ]);
      setFieldsList(fRes.data);
      setCropsList(cRes.data);
    } catch {
      // ignore
    }
  };

  const fetchPlantings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        status: statusFilter || undefined,
        crop_id: cropFilter || undefined,
      };
      const res = await plantingService.getAll(params);
      setPlantings(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, cropFilter]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    fetchPlantings();
  }, [fetchPlantings]);

  const handleOpenCreate = () => {
    setSelectedPlanting(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      field_id: fieldsList[0]?.field_id || '',
      crop_id: cropsList[0]?.crop_id || '',
      planting_date: today,
      expected_harvest_date: '',
      status: 'GROWING',
      planted_area_hectares: '5.0',
      notes: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p) => {
    setSelectedPlanting(p);
    setFormData({
      field_id: p.field_id,
      crop_id: p.crop_id,
      planting_date: p.planting_date ? p.planting_date.substring(0, 10) : '',
      expected_harvest_date: p.expected_harvest_date ? p.expected_harvest_date.substring(0, 10) : '',
      status: p.status,
      planted_area_hectares: p.planted_area_hectares,
      notes: p.notes || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenView = async (p) => {
    try {
      const details = await plantingService.getById(p.planting_id);
      setPlantingDetails(details);
      setIsDetailOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDelete = (p) => {
    setSelectedPlanting(p);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.field_id) errs.field_id = 'Field selection is required';
    if (!formData.crop_id) errs.crop_id = 'Crop selection is required';
    if (!formData.planting_date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.planting_date)) {
      errs.planting_date = 'Planting date is required (YYYY-MM-DD)';
    }
    if (formData.expected_harvest_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.expected_harvest_date)) {
      errs.expected_harvest_date = 'Expected harvest date must be YYYY-MM-DD';
    }
    if (!formData.planted_area_hectares || Number(formData.planted_area_hectares) <= 0) {
      errs.planted_area_hectares = 'Planted area must be a positive number';
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
        crop_id: Number(formData.crop_id),
        planting_date: formData.planting_date,
        expected_harvest_date: formData.expected_harvest_date || null,
        status: formData.status,
        planted_area_hectares: Number(formData.planted_area_hectares),
        notes: formData.notes.trim() || null,
      };

      if (selectedPlanting) {
        await plantingService.update(selectedPlanting.planting_id, payload);
        showToast('Planting cycle updated successfully', 'success');
      } else {
        await plantingService.create(payload);
        showToast('Planting cycle registered successfully', 'success');
      }
      setIsFormOpen(false);
      fetchPlantings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlanting) return;
    setIsSubmitting(true);
    try {
      await plantingService.delete(selectedPlanting.planting_id);
      showToast('Planting record deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchPlantings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadgeVariant = (st) => {
    switch (st) {
      case 'GROWING': return 'success';
      case 'HARVESTED': return 'info';
      case 'PLANNED': return 'purple';
      case 'FAILED': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Crop Planting Cycles</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track active cultivation, harvest projections, and acreage allocation per field.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Record New Planting
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="w-full sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
            >
              <option value="">All Statuses (Filter)</option>
              <option value="GROWING">Growing</option>
              <option value="PLANNED">Planned</option>
              <option value="HARVESTED">Harvested</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="w-full sm:w-56">
            <select
              value={cropFilter}
              onChange={(e) => {
                setCropFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
            >
              <option value="">All Crops (Filter)</option>
              {cropsList.map((c) => (
                <option key={c.crop_id} value={c.crop_id}>
                  {c.crop_name} ({c.variety})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchPlantings} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {loading && !plantings.length ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Plantings"
          message={error.message}
          onRetry={fetchPlantings}
          isNetworkError={error.isNetworkError}
        />
      ) : plantings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No planting records found"
          message={statusFilter || cropFilter ? 'No plantings match the current filters.' : 'Record crop plantings to start monitoring cultivation cycles.'}
          actionLabel={statusFilter || cropFilter ? undefined : 'Record New Planting'}
          onAction={statusFilter || cropFilter ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Cycle ID</th>
                  <th className="py-3 px-4">Crop</th>
                  <th className="py-3 px-4">Field & Farm</th>
                  <th className="py-3 px-4">Planting Date</th>
                  <th className="py-3 px-4">Expected Harvest</th>
                  <th className="py-3 px-4">Planted Area</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plantings.map((p) => (
                  <tr key={p.planting_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{p.planting_id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{p.crop_name}</span>
                      <span className="text-slate-500 text-[11px]">{p.crop_variety}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium text-slate-900">{p.field_name}</span>
                      <span className="text-slate-400 text-[11px] block">{p.farm_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{formatDate(p.planting_date)}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(p.expected_harvest_date)}</td>
                    <td className="py-3 px-4 font-mono text-slate-900">{formatHectares(p.planted_area_hectares)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadgeVariant(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          title="View Details & Harvests"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Planting"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Planting"
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
        title={selectedPlanting ? `Edit Planting #${selectedPlanting.planting_id}` : 'Record New Planting'}
        subtitle="Associate crop to field parcel and establish cultivation timeline"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Field Plot"
              name="field_id"
              value={formData.field_id}
              onChange={(e) => setFormData({ ...formData, field_id: e.target.value })}
              options={fieldsList.map((f) => ({ value: f.field_id, label: `${f.field_name} (${f.farm_name})` }))}
              placeholder="Select Field Plot"
              error={formErrors.field_id}
              required
            />
            <Select
              label="Crop Variety"
              name="crop_id"
              value={formData.crop_id}
              onChange={(e) => setFormData({ ...formData, crop_id: e.target.value })}
              options={cropsList.map((c) => ({ value: c.crop_id, label: `${c.crop_name} (${c.variety})` }))}
              placeholder="Select Crop"
              error={formErrors.crop_id}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Planting Date (YYYY-MM-DD)"
              name="planting_date"
              type="date"
              value={formData.planting_date}
              onChange={(e) => setFormData({ ...formData, planting_date: e.target.value })}
              error={formErrors.planting_date}
              required
            />
            <Input
              label="Expected Harvest Date"
              name="expected_harvest_date"
              type="date"
              value={formData.expected_harvest_date}
              onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })}
              error={formErrors.expected_harvest_date}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Planted Area (Hectares)"
              name="planted_area_hectares"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 10.0"
              value={formData.planted_area_hectares}
              onChange={(e) => setFormData({ ...formData, planted_area_hectares: e.target.value })}
              error={formErrors.planted_area_hectares}
              required
            />
            <Select
              label="Cultivation Status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={['PLANNED', 'GROWING', 'HARVESTED', 'FAILED']}
              required
            />
          </div>

          <Textarea
            label="Agronomic Notes (Optional)"
            name="notes"
            placeholder="Special fertilizer treatment, seedling lot number, etc."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedPlanting ? 'Update Planting' : 'Save Planting Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={plantingDetails ? `Planting Cycle #${plantingDetails.planting_id}` : 'Planting Details'}
        subtitle="Cultivation parameters and recorded harvest yields"
        maxWidth="max-w-2xl"
      >
        {plantingDetails && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Crop</span>
                <span className="font-bold text-slate-800">
                  {plantingDetails.crop_name} ({plantingDetails.crop_variety})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Field / Farm</span>
                <span className="font-semibold text-slate-800">
                  {plantingDetails.field_name} • {plantingDetails.farm_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Planted Date</span>
                <span className="font-semibold text-slate-800">{formatDate(plantingDetails.planting_date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <Badge size="sm" variant={statusBadgeVariant(plantingDetails.status)}>{plantingDetails.status}</Badge>
              </div>
            </div>

            {plantingDetails.notes && (
              <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-950">
                <span className="font-semibold block text-emerald-900 mb-0.5">Agronomic Notes:</span>
                {plantingDetails.notes}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Linked Harvest Records ({plantingDetails.harvests?.length || 0})
              </h4>
              {plantingDetails.harvests && plantingDetails.harvests.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Harvest Date</th>
                        <th className="py-2 px-3">Yield Quantity</th>
                        <th className="py-2 px-3">Grade</th>
                        <th className="py-2 px-3">Market Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plantingDetails.harvests.map((h) => (
                        <tr key={h.harvest_id}>
                          <td className="py-2 px-3 text-slate-700">{formatDate(h.harvest_date)}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">{formatKg(h.yield_quantity_kg)}</td>
                          <td className="py-2 px-3">
                            <Badge size="sm" variant="info">Grade {h.quality_grade}</Badge>
                          </td>
                          <td className="py-2 px-3 font-mono text-emerald-700">{formatCurrency(h.market_value_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">No harvests logged yet for this planting cycle.</p>
              )}
            </div>

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
        title="Confirm Planting Cycle Deletion"
        message="Are you sure you want to delete this planting cycle? The database ensures referential integrity and rejects deletion if linked harvest events exist."
        confirmText="Delete Planting"
        isLoading={isSubmitting}
      />
    </div>
  );
}
