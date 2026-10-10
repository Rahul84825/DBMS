import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Map, Search, RefreshCw, Filter, Layers } from 'lucide-react';
import { fieldService } from '../services/fieldService.js';
import { farmService } from '../services/farmService.js';
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
import { formatHectares, formatDate } from '../utils/formatters.js';

export default function FieldsPage() {
  const { showToast } = useToast();
  const [fields, setFields] = useState([]);
  const [farmsList, setFarmsList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedFarmFilter, setSelectedFarmFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [fieldDetails, setFieldDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    farm_id: '',
    field_name: '',
    area_hectares: '',
    soil_type: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch parent farms for dropdown
  const loadFarmsList = async () => {
    try {
      const res = await farmService.getAll({ limit: 100 });
      setFarmsList(res.data);
    } catch {
      // ignore
    }
  };

  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        farm_id: selectedFarmFilter || undefined,
      };
      const res = await fieldService.getAll(params);
      setFields(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedFarmFilter]);

  useEffect(() => {
    loadFarmsList();
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleOpenCreate = () => {
    setSelectedField(null);
    setFormData({
      farm_id: farmsList[0]?.farm_id || '',
      field_name: '',
      area_hectares: '',
      soil_type: 'Loam',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (f) => {
    setSelectedField(f);
    setFormData({
      farm_id: f.farm_id,
      field_name: f.field_name,
      area_hectares: f.area_hectares,
      soil_type: f.soil_type,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenView = async (f) => {
    try {
      const details = await fieldService.getById(f.field_id);
      setFieldDetails(details);
      setIsDetailOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDelete = (f) => {
    setSelectedField(f);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.farm_id) errs.farm_id = 'Parent farm selection is required';
    if (!formData.field_name.trim()) errs.field_name = 'Field name is required';
    if (!formData.area_hectares || Number(formData.area_hectares) <= 0) {
      errs.area_hectares = 'Area must be greater than 0';
    }
    if (!formData.soil_type.trim()) errs.soil_type = 'Soil type is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        farm_id: Number(formData.farm_id),
        field_name: formData.field_name.trim(),
        area_hectares: Number(formData.area_hectares),
        soil_type: formData.soil_type.trim(),
      };

      if (selectedField) {
        await fieldService.update(selectedField.field_id, payload);
        showToast(`Field '${payload.field_name}' updated successfully`, 'success');
      } else {
        await fieldService.create(payload);
        showToast(`Field '${payload.field_name}' created successfully`, 'success');
      }
      setIsFormOpen(false);
      fetchFields();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedField) return;
    setIsSubmitting(true);
    try {
      await fieldService.delete(selectedField.field_id);
      showToast(`Field '${selectedField.field_name}' deleted successfully`, 'success');
      setIsDeleteOpen(false);
      fetchFields();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const farmOptions = farmsList.map((f) => ({
    value: f.farm_id,
    label: `${f.farm_name} (#${f.farm_id})`,
  }));

  const soilOptions = [
    'Loam',
    'Clay Loam',
    'Sandy Loam',
    'Silt Loam',
    'Clay',
    'Sandy Clay',
    'Silty Clay',
    'Peat',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agricultural Fields</h2>
          <p className="text-xs text-slate-500 mt-1">
            Soil zones, cultivation subdivisions, and parent farm associations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Add New Field
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search field or soil..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f]"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedFarmFilter}
              onChange={(e) => {
                setSelectedFarmFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
            >
              <option value="">All Farms (Filter)</option>
              {farmsList.map((f) => (
                <option key={f.farm_id} value={f.farm_id}>
                  {f.farm_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchFields} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading && !fields.length ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Fields"
          message={error.message}
          onRetry={fetchFields}
          isNetworkError={error.isNetworkError}
        />
      ) : fields.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No field parcels found"
          message={search || selectedFarmFilter ? 'No fields match your filter criteria.' : 'Create field subdivisions to track soil zones.'}
          actionLabel={search || selectedFarmFilter ? undefined : 'Add New Field'}
          onAction={search || selectedFarmFilter ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Field ID</th>
                  <th className="py-3 px-4">Field Name</th>
                  <th className="py-3 px-4">Parent Farm</th>
                  <th className="py-3 px-4">Area (Hectares)</th>
                  <th className="py-3 px-4">Soil Type</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f) => (
                  <tr key={f.field_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{f.field_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{f.field_name}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium">{f.farm_name}</span>
                      <span className="text-slate-400 text-[11px] block">{f.owner_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900">{formatHectares(f.area_hectares)}</td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral">{f.soil_type}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(f)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          title="View Field Sensors & Plantings"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Field"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(f)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Field"
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
        title={selectedField ? `Edit Field #${selectedField.field_id}` : 'Create New Field Subdivision'}
        subtitle="Associate plot to a parent farm and define physical soil parameters"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Parent Farm"
            name="farm_id"
            value={formData.farm_id}
            onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })}
            options={farmOptions}
            placeholder="Select Parent Farm"
            error={formErrors.farm_id}
            required
          />
          <Input
            label="Field Subdivision Name"
            name="field_name"
            placeholder="e.g. North Plot A"
            value={formData.field_name}
            onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
            error={formErrors.field_name}
            required
          />
          <Input
            label="Plot Area (Hectares)"
            name="area_hectares"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 25.50"
            value={formData.area_hectares}
            onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
            error={formErrors.area_hectares}
            required
          />
          <Select
            label="Soil Composition / Type"
            name="soil_type"
            value={formData.soil_type}
            onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
            options={soilOptions}
            placeholder="Select Soil Type"
            error={formErrors.soil_type}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedField ? 'Update Field' : 'Save Field Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Field Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={fieldDetails ? fieldDetails.field_name : 'Field Profile'}
        subtitle="Hardware sensors deployed and crop planting history"
        maxWidth="max-w-2xl"
      >
        {fieldDetails && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Field ID</span>
                <span className="font-bold font-mono text-slate-800">#{fieldDetails.field_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Parent Farm</span>
                <span className="font-semibold text-slate-800">{fieldDetails.farm_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Area</span>
                <span className="font-bold text-emerald-800">{formatHectares(fieldDetails.area_hectares)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Soil Type</span>
                <span className="font-semibold text-slate-800">{fieldDetails.soil_type}</span>
              </div>
            </div>

            {/* Sensors list */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Deployed Sensors ({fieldDetails.sensors?.length || 0})
              </h4>
              {fieldDetails.sensors && fieldDetails.sensors.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fieldDetails.sensors.map((s) => (
                        <tr key={s.sensor_id}>
                          <td className="py-2 px-3 font-mono font-semibold">{s.sensor_code}</td>
                          <td className="py-2 px-3">{s.sensor_type}</td>
                          <td className="py-2 px-3">{s.unit_of_measurement}</td>
                          <td className="py-2 px-3">
                            <Badge size="sm" variant={s.status === 'ACTIVE' ? 'success' : 'neutral'}>
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">No sensors installed in this field.</p>
              )}
            </div>

            {/* Plantings history */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Planting History ({fieldDetails.plantings?.length || 0})
              </h4>
              {fieldDetails.plantings && fieldDetails.plantings.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Crop</th>
                        <th className="py-2 px-3">Date Planted</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Area (ha)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fieldDetails.plantings.map((p) => (
                        <tr key={p.planting_id}>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {p.crop_name} ({p.variety})
                          </td>
                          <td className="py-2 px-3 text-slate-600">{formatDate(p.planting_date)}</td>
                          <td className="py-2 px-3">
                            <Badge size="sm" variant={p.status === 'GROWING' ? 'success' : 'neutral'}>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-mono">{formatHectares(p.planted_area_hectares)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">No planting records for this field.</p>
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
        title="Confirm Field Deletion"
        message={`Are you sure you want to delete field '${selectedField?.field_name}'? The backend checks for child sensor units, plantings, and irrigation records.`}
        confirmText="Delete Field"
        isLoading={isSubmitting}
      />
    </div>
  );
}
