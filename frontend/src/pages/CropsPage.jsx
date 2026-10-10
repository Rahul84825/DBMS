import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Sprout, Search, RefreshCw, Thermometer, Droplets, Clock } from 'lucide-react';
import { cropService } from '../services/cropService.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Input from '../components/common/Input.jsx';
import Badge from '../components/common/Badge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatDate } from '../utils/formatters.js';

export default function CropsPage() {
  const { showToast } = useToast();
  const [crops, setCrops] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [cropDetails, setCropDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    crop_name: '',
    variety: '',
    optimal_soil_moisture_min: '',
    optimal_soil_moisture_max: '',
    optimal_temp_celsius_min: '',
    optimal_temp_celsius_max: '',
    growth_duration_days: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchCrops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cropService.getAll({ page, limit: 10, search: search.trim() || undefined });
      setCrops(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCrops();
  }, [fetchCrops]);

  const handleOpenCreate = () => {
    setSelectedCrop(null);
    setFormData({
      crop_name: '',
      variety: 'Standard',
      optimal_soil_moisture_min: '40',
      optimal_soil_moisture_max: '70',
      optimal_temp_celsius_min: '18',
      optimal_temp_celsius_max: '28',
      growth_duration_days: '90',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c) => {
    setSelectedCrop(c);
    setFormData({
      crop_name: c.crop_name,
      variety: c.variety,
      optimal_soil_moisture_min: c.optimal_soil_moisture_min,
      optimal_soil_moisture_max: c.optimal_soil_moisture_max,
      optimal_temp_celsius_min: c.optimal_temp_celsius_min,
      optimal_temp_celsius_max: c.optimal_temp_celsius_max,
      growth_duration_days: c.growth_duration_days,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenView = async (c) => {
    try {
      const details = await cropService.getById(c.crop_id);
      setCropDetails(details);
      setIsDetailOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDelete = (c) => {
    setSelectedCrop(c);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.crop_name.trim()) errs.crop_name = 'Crop name is required';
    const moistureMin = Number(formData.optimal_soil_moisture_min);
    const moistureMax = Number(formData.optimal_soil_moisture_max);
    if (isNaN(moistureMin) || moistureMin < 0 || moistureMin > 100) {
      errs.optimal_soil_moisture_min = 'Min moisture must be between 0 and 100%';
    }
    if (isNaN(moistureMax) || moistureMax < 0 || moistureMax > 100) {
      errs.optimal_soil_moisture_max = 'Max moisture must be between 0 and 100%';
    }
    if (moistureMax < moistureMin) {
      errs.optimal_soil_moisture_max = 'Max moisture must be ≥ Min moisture';
    }

    const tempMin = Number(formData.optimal_temp_celsius_min);
    const tempMax = Number(formData.optimal_temp_celsius_max);
    if (isNaN(tempMin)) errs.optimal_temp_celsius_min = 'Min temperature required';
    if (isNaN(tempMax)) errs.optimal_temp_celsius_max = 'Max temperature required';
    if (tempMax < tempMin) {
      errs.optimal_temp_celsius_max = 'Max temperature must be ≥ Min temperature';
    }

    const duration = Number(formData.growth_duration_days);
    if (isNaN(duration) || duration <= 0) {
      errs.growth_duration_days = 'Growth duration must be a positive integer';
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
        crop_name: formData.crop_name.trim(),
        variety: formData.variety.trim() || 'Standard',
        optimal_soil_moisture_min: Number(formData.optimal_soil_moisture_min),
        optimal_soil_moisture_max: Number(formData.optimal_soil_moisture_max),
        optimal_temp_celsius_min: Number(formData.optimal_temp_celsius_min),
        optimal_temp_celsius_max: Number(formData.optimal_temp_celsius_max),
        growth_duration_days: Math.round(Number(formData.growth_duration_days)),
      };

      if (selectedCrop) {
        await cropService.update(selectedCrop.crop_id, payload);
        showToast(`Crop '${payload.crop_name}' updated successfully`, 'success');
      } else {
        await cropService.create(payload);
        showToast(`Crop '${payload.crop_name}' registered in catalog`, 'success');
      }
      setIsFormOpen(false);
      fetchCrops();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCrop) return;
    setIsSubmitting(true);
    try {
      await cropService.delete(selectedCrop.crop_id);
      showToast(`Crop '${selectedCrop.crop_name}' removed from catalog`, 'success');
      setIsDeleteOpen(false);
      fetchCrops();
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Crop Botanical Catalog</h2>
          <p className="text-xs text-slate-500 mt-1">
            Agronomic guidelines, optimal moisture bounds, thermal ranges, and maturity cycles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Register New Crop
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search crop name or variety..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f]"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchCrops} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading && !crops.length ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Crops"
          message={error.message}
          onRetry={fetchCrops}
          isNetworkError={error.isNetworkError}
        />
      ) : crops.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No crop varieties registered"
          message={search ? 'No crops match your search query.' : 'Register crop varieties and their agronomic requirements to link plantings.'}
          actionLabel={search ? undefined : 'Register New Crop'}
          onAction={search ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Crop Name & Variety</th>
                  <th className="py-3 px-4">Optimal Moisture Range</th>
                  <th className="py-3 px-4">Thermal Range</th>
                  <th className="py-3 px-4">Cycle Duration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crops.map((c) => (
                  <tr key={c.crop_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{c.crop_id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{c.crop_name}</span>
                      <span className="text-slate-500 text-[11px]">{c.variety}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Droplets className="w-3 h-3 text-emerald-600" />
                        {c.optimal_soil_moisture_min}% – {c.optimal_soil_moisture_max}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Thermometer className="w-3 h-3 text-amber-600" />
                        {c.optimal_temp_celsius_min}°C – {c.optimal_temp_celsius_max}°C
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {c.growth_duration_days} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          title="View Crop & Plantings"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Crop"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Crop"
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
        title={selectedCrop ? `Edit Crop #${selectedCrop.crop_id}` : 'Register Crop Variety'}
        subtitle="Specify botanical thresholds and growing requirements"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Crop Name"
              name="crop_name"
              placeholder="e.g. Tomato"
              value={formData.crop_name}
              onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
              error={formErrors.crop_name}
              required
            />
            <Input
              label="Cultivar / Variety"
              name="variety"
              placeholder="e.g. Roma VF"
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
              error={formErrors.variety}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Optimal Soil Moisture Min (%)"
              name="optimal_soil_moisture_min"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="40"
              value={formData.optimal_soil_moisture_min}
              onChange={(e) => setFormData({ ...formData, optimal_soil_moisture_min: e.target.value })}
              error={formErrors.optimal_soil_moisture_min}
              required
            />
            <Input
              label="Optimal Soil Moisture Max (%)"
              name="optimal_soil_moisture_max"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="70"
              value={formData.optimal_soil_moisture_max}
              onChange={(e) => setFormData({ ...formData, optimal_soil_moisture_max: e.target.value })}
              error={formErrors.optimal_soil_moisture_max}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Optimal Temp Min (°C)"
              name="optimal_temp_celsius_min"
              type="number"
              step="0.1"
              placeholder="18"
              value={formData.optimal_temp_celsius_min}
              onChange={(e) => setFormData({ ...formData, optimal_temp_celsius_min: e.target.value })}
              error={formErrors.optimal_temp_celsius_min}
              required
            />
            <Input
              label="Optimal Temp Max (°C)"
              name="optimal_temp_celsius_max"
              type="number"
              step="0.1"
              placeholder="28"
              value={formData.optimal_temp_celsius_max}
              onChange={(e) => setFormData({ ...formData, optimal_temp_celsius_max: e.target.value })}
              error={formErrors.optimal_temp_celsius_max}
              required
            />
          </div>

          <Input
            label="Growth Maturity Duration (Days)"
            name="growth_duration_days"
            type="number"
            min="1"
            placeholder="90"
            value={formData.growth_duration_days}
            onChange={(e) => setFormData({ ...formData, growth_duration_days: e.target.value })}
            error={formErrors.growth_duration_days}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedCrop ? 'Update Crop' : 'Save Crop Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Crop Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={cropDetails ? `${cropDetails.crop_name} (${cropDetails.variety})` : 'Crop Details'}
        subtitle="Agronomic requirements and cultivation plantings"
        maxWidth="max-w-2xl"
      >
        {cropDetails && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Crop ID</span>
                <span className="font-bold font-mono text-slate-800">#{cropDetails.crop_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Moisture Range</span>
                <span className="font-bold text-emerald-800">
                  {cropDetails.optimal_soil_moisture_min}% – {cropDetails.optimal_soil_moisture_max}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Thermal Range</span>
                <span className="font-bold text-amber-800">
                  {cropDetails.optimal_temp_celsius_min}°C – {cropDetails.optimal_temp_celsius_max}°C
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Growth Cycle</span>
                <span className="font-bold text-slate-800">{cropDetails.growth_duration_days} days</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Active & Historical Plantings ({cropDetails.plantings?.length || 0})
              </h4>
              {cropDetails.plantings && cropDetails.plantings.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Farm</th>
                        <th className="py-2 px-3">Date Planted</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cropDetails.plantings.map((p) => (
                        <tr key={p.planting_id}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{p.field_name}</td>
                          <td className="py-2 px-3 text-slate-600">{p.farm_name}</td>
                          <td className="py-2 px-3 text-slate-600">{formatDate(p.planting_date)}</td>
                          <td className="py-2 px-3">
                            <Badge size="sm" variant={p.status === 'GROWING' ? 'success' : 'neutral'}>
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">No planting records currently reference this crop.</p>
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
        title="Confirm Crop Deletion"
        message={`Are you sure you want to remove '${selectedCrop?.crop_name}' from the botanical catalog? If linked planting records exist, the database will safeguard referential integrity.`}
        confirmText="Delete Crop"
        isLoading={isSubmitting}
      />
    </div>
  );
}
