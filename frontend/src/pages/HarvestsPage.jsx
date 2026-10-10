import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, PackageCheck, RefreshCw, DollarSign } from 'lucide-react';
import { harvestService } from '../services/harvestService.js';
import { plantingService } from '../services/plantingService.js';
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
import { formatDate, formatKg, formatCurrency } from '../utils/formatters.js';

export default function HarvestsPage() {
  const { showToast } = useToast();
  const [harvests, setHarvests] = useState([]);
  const [plantingsList, setPlantingsList] = useState([]);
  const [cropsList, setCropsList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [cropFilter, setCropFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedHarvest, setSelectedHarvest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    planting_id: '',
    harvest_date: '',
    yield_quantity_kg: '',
    quality_grade: 'A',
    market_value_usd: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const loadReferences = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        plantingService.getAll({ limit: 100 }),
        cropService.getAll({ limit: 100 }),
      ]);
      setPlantingsList(pRes.data);
      setCropsList(cRes.data);
    } catch {
      // ignore
    }
  };

  const fetchHarvests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        crop_id: cropFilter || undefined,
      };
      const res = await harvestService.getAll(params);
      setHarvests(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, cropFilter]);

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    fetchHarvests();
  }, [fetchHarvests]);

  const handleOpenCreate = () => {
    setSelectedHarvest(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      planting_id: plantingsList[0]?.planting_id || '',
      harvest_date: today,
      yield_quantity_kg: '1500',
      quality_grade: 'A',
      market_value_usd: '3200',
      notes: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (h) => {
    setSelectedHarvest(h);
    setFormData({
      planting_id: h.planting_id,
      harvest_date: h.harvest_date ? h.harvest_date.substring(0, 10) : '',
      yield_quantity_kg: h.yield_quantity_kg,
      quality_grade: h.quality_grade,
      market_value_usd: h.market_value_usd || '',
      notes: h.notes || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDelete = (h) => {
    setSelectedHarvest(h);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.planting_id) errs.planting_id = 'Planting cycle is required';
    if (!formData.harvest_date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.harvest_date)) {
      errs.harvest_date = 'Harvest date is required (YYYY-MM-DD)';
    }
    if (formData.yield_quantity_kg === '' || Number(formData.yield_quantity_kg) < 0) {
      errs.yield_quantity_kg = 'Yield quantity cannot be negative';
    }
    if (formData.market_value_usd !== '' && Number(formData.market_value_usd) < 0) {
      errs.market_value_usd = 'Market revenue cannot be negative';
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
        planting_id: Number(formData.planting_id),
        harvest_date: formData.harvest_date,
        yield_quantity_kg: Number(formData.yield_quantity_kg),
        quality_grade: formData.quality_grade,
        market_value_usd: formData.market_value_usd ? Number(formData.market_value_usd) : null,
        notes: formData.notes.trim() || null,
      };

      if (selectedHarvest) {
        await harvestService.update(selectedHarvest.harvest_id, payload);
        showToast('Harvest record updated successfully', 'success');
      } else {
        await harvestService.create(payload);
        showToast('Harvest record logged successfully', 'success');
      }
      setIsFormOpen(false);
      fetchHarvests();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedHarvest) return;
    setIsSubmitting(true);
    try {
      await harvestService.delete(selectedHarvest.harvest_id);
      showToast('Harvest record deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchHarvests();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const gradeBadgeVariant = (grade) => {
    switch (grade) {
      case 'A': return 'success';
      case 'B': return 'info';
      case 'C': return 'warning';
      case 'REJECTED': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Crop Harvest Records</h2>
          <p className="text-xs text-slate-500 mt-1">
            Recorded agricultural yields, produce grade classifications, and realized market revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Log Harvest Record
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-64">
          <select
            value={cropFilter}
            onChange={(e) => {
              setCropFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
          >
            <option value="">All Crop Types (Filter)</option>
            {cropsList.map((c) => (
              <option key={c.crop_id} value={c.crop_id}>
                {c.crop_name} ({c.variety})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchHarvests} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading && !harvests.length ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState title="Failed to Load Harvest Records" message={error.message} onRetry={fetchHarvests} />
      ) : harvests.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No harvest records found"
          message={cropFilter ? 'No harvests match this crop filter.' : 'Log produce harvests to calculate agricultural yields and revenue.'}
          actionLabel={cropFilter ? undefined : 'Log Harvest Record'}
          onAction={cropFilter ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Harvest ID</th>
                  <th className="py-3 px-4">Crop & Variety</th>
                  <th className="py-3 px-4">Field Location</th>
                  <th className="py-3 px-4">Harvest Date</th>
                  <th className="py-3 px-4">Yield Weight</th>
                  <th className="py-3 px-4">Quality Grade</th>
                  <th className="py-3 px-4">Market Value</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {harvests.map((h) => (
                  <tr key={h.harvest_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{h.harvest_id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{h.crop_name}</span>
                      <span className="text-slate-500 text-[11px]">{h.crop_variety}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium">{h.field_name}</span>
                      <span className="text-slate-400 text-[11px] block">{h.farm_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(h.harvest_date)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatKg(h.yield_quantity_kg)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={gradeBadgeVariant(h.quality_grade)}>Grade {h.quality_grade}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {formatCurrency(h.market_value_usd)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(h)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Harvest"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(h)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Harvest"
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
        title={selectedHarvest ? `Edit Harvest #${selectedHarvest.harvest_id}` : 'Log Harvest Produce'}
        subtitle="Record yield weight, quality grade assessment, and gross market value"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Planting Cycle Association"
            name="planting_id"
            value={formData.planting_id}
            onChange={(e) => setFormData({ ...formData, planting_id: e.target.value })}
            options={plantingsList.map((p) => ({
              value: p.planting_id,
              label: `#${p.planting_id} • ${p.crop_name} (${p.field_name})`,
            }))}
            placeholder="Select Planting Cycle"
            error={formErrors.planting_id}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Harvest Date (YYYY-MM-DD)"
              name="harvest_date"
              type="date"
              value={formData.harvest_date}
              onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
              error={formErrors.harvest_date}
              required
            />
            <Input
              label="Yield Quantity (kg)"
              name="yield_quantity_kg"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 1500.0"
              value={formData.yield_quantity_kg}
              onChange={(e) => setFormData({ ...formData, yield_quantity_kg: e.target.value })}
              error={formErrors.yield_quantity_kg}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Produce Quality Grade"
              name="quality_grade"
              value={formData.quality_grade}
              onChange={(e) => setFormData({ ...formData, quality_grade: e.target.value })}
              options={['A', 'B', 'C', 'REJECTED']}
              required
            />
            <Input
              label="Market Value (USD)"
              name="market_value_usd"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 3200.00"
              value={formData.market_value_usd}
              onChange={(e) => setFormData({ ...formData, market_value_usd: e.target.value })}
              error={formErrors.market_value_usd}
            />
          </div>

          <Textarea
            label="Harvest Notes (Optional)"
            name="notes"
            placeholder="Moisture at harvest, storage silo number, etc."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedHarvest ? 'Update Harvest' : 'Save Harvest Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Harvest Deletion"
        message="Are you sure you want to delete this harvest record?"
        confirmText="Delete Harvest"
        isLoading={isSubmitting}
      />
    </div>
  );
}
