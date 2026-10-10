import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Building2, Search, RefreshCw, MapPin } from 'lucide-react';
import { farmService } from '../services/farmService.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Input from '../components/common/Input.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatNumber, formatHectares } from '../utils/formatters.js';

export default function FarmsPage() {
  const { showToast } = useToast();
  const [farms, setFarms] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [farmDetails, setFarmDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    farm_name: '',
    owner_name: '',
    location: '',
    total_area_hectares: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchFarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await farmService.getAll({ page, limit: 10, search: search.trim() || undefined });
      setFarms(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  const handleOpenCreate = () => {
    setSelectedFarm(null);
    setFormData({
      farm_name: '',
      owner_name: '',
      location: '',
      total_area_hectares: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (farm) => {
    setSelectedFarm(farm);
    setFormData({
      farm_name: farm.farm_name,
      owner_name: farm.owner_name,
      location: farm.location,
      total_area_hectares: farm.total_area_hectares,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenView = async (farm) => {
    try {
      const details = await farmService.getById(farm.farm_id);
      setFarmDetails(details);
      setIsDetailOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDelete = (farm) => {
    setSelectedFarm(farm);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.farm_name.trim()) errs.farm_name = 'Farm name is required';
    if (!formData.owner_name.trim()) errs.owner_name = 'Owner name is required';
    if (!formData.location.trim()) errs.location = 'Location is required';
    if (!formData.total_area_hectares || Number(formData.total_area_hectares) <= 0) {
      errs.total_area_hectares = 'Total area must be a positive number';
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
        farm_name: formData.farm_name.trim(),
        owner_name: formData.owner_name.trim(),
        location: formData.location.trim(),
        total_area_hectares: Number(formData.total_area_hectares),
      };

      if (selectedFarm) {
        await farmService.update(selectedFarm.farm_id, payload);
        showToast(`Farm '${payload.farm_name}' updated successfully`, 'success');
      } else {
        await farmService.create(payload);
        showToast(`Farm '${payload.farm_name}' registered successfully`, 'success');
      }
      setIsFormOpen(false);
      fetchFarms();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFarm) return;
    setIsSubmitting(true);
    try {
      await farmService.delete(selectedFarm.farm_id);
      showToast(`Farm '${selectedFarm.farm_name}' deleted successfully`, 'success');
      setIsDeleteOpen(false);
      fetchFarms();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Farm Properties</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage agricultural sites, ownership, boundary sizes, and regional locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Register New Farm
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by farm, owner, or location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f]"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchFarms} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && !farms.length ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Farm Records"
          message={error.message}
          onRetry={fetchFarms}
          isNetworkError={error.isNetworkError}
        />
      ) : farms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No farm properties registered"
          message={search ? 'No farms match your search query.' : 'Register your first agricultural farm property to get started.'}
          actionLabel={search ? undefined : 'Register New Farm'}
          onAction={search ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Farm ID</th>
                  <th className="py-3 px-4">Farm Name</th>
                  <th className="py-3 px-4">Owner / Operator</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Total Area</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farms.map((farm) => (
                  <tr key={farm.farm_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{farm.farm_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{farm.farm_name}</td>
                    <td className="py-3 px-4 text-slate-700">{farm.owner_name}</td>
                    <td className="py-3 px-4 text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{farm.location}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900">{formatHectares(farm.total_area_hectares)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(farm)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          title="View Details & Fields"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(farm)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Farm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(farm)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Farm"
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
        title={selectedFarm ? `Edit Farm #${selectedFarm.farm_id}` : 'Register New Farm'}
        subtitle="Specify farm property attributes, owner contact, and acreage size"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Farm Name"
            name="farm_name"
            placeholder="e.g. Green Valley Agro"
            value={formData.farm_name}
            onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
            error={formErrors.farm_name}
            required
          />
          <Input
            label="Owner / Operator Name"
            name="owner_name"
            placeholder="e.g. Robert Green"
            value={formData.owner_name}
            onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
            error={formErrors.owner_name}
            required
          />
          <Input
            label="Geographic Location"
            name="location"
            placeholder="e.g. Salinas Valley, California"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            error={formErrors.location}
            required
          />
          <Input
            label="Total Area (Hectares)"
            name="total_area_hectares"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 120.50"
            value={formData.total_area_hectares}
            onChange={(e) => setFormData({ ...formData, total_area_hectares: e.target.value })}
            error={formErrors.total_area_hectares}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedFarm ? 'Update Farm' : 'Save Farm Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={farmDetails ? farmDetails.farm_name : 'Farm Details'}
        subtitle="Comprehensive site profile and associated field divisions"
        maxWidth="max-w-2xl"
      >
        {farmDetails && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Farm ID</span>
                <span className="font-bold font-mono text-slate-800">#{farmDetails.farm_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Owner</span>
                <span className="font-semibold text-slate-800">{farmDetails.owner_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Location</span>
                <span className="font-semibold text-slate-800">{farmDetails.location}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Area</span>
                <span className="font-bold text-emerald-800">{formatHectares(farmDetails.total_area_hectares)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Associated Field Subdivisions ({farmDetails.fields?.length || 0})
              </h4>
              {farmDetails.fields && farmDetails.fields.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Field ID</th>
                        <th className="py-2.5 px-3">Field Name</th>
                        <th className="py-2.5 px-3">Area (ha)</th>
                        <th className="py-2.5 px-3">Soil Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {farmDetails.fields.map((f) => (
                        <tr key={f.field_id}>
                          <td className="py-2 px-3 font-mono">#{f.field_id}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{f.field_name}</td>
                          <td className="py-2 px-3 font-mono">{formatHectares(f.area_hectares)}</td>
                          <td className="py-2 px-3">{f.soil_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">No fields currently divided on this farm.</p>
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
        title="Confirm Farm Deletion"
        message={`Are you sure you want to delete '${selectedFarm?.farm_name}'? If this farm contains active fields or expenses, the database will safeguard referential integrity and return a conflict notice.`}
        confirmText="Delete Farm"
        isLoading={isSubmitting}
      />
    </div>
  );
}
