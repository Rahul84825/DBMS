import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Receipt, RefreshCw, DollarSign, Tag } from 'lucide-react';
import { expenseService } from '../services/expenseService.js';
import { farmService } from '../services/farmService.js';
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
import { formatDate, formatCurrency } from '../utils/formatters.js';

const EXPENSE_CATEGORIES = [
  'SEEDS',
  'FERTILIZER',
  'IRRIGATION_WATER',
  'LABOR',
  'EQUIPMENT_MAINTENANCE',
  'SENSOR_HARDWARE',
  'OTHER',
];

export default function ExpensesPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [farmsList, setFarmsList] = useState([]);
  const [fieldsList, setFieldsList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [farmFilter, setFarmFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    farm_id: '',
    field_id: '',
    expense_date: '',
    category: 'FERTILIZER',
    amount_usd: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const loadReferences = async () => {
    try {
      const [fmRes, fldRes] = await Promise.all([
        farmService.getAll({ limit: 100 }),
        fieldService.getAll({ limit: 100 }),
      ]);
      setFarmsList(fmRes.data);
      setFieldsList(fldRes.data);
    } catch {
      // ignore
    }
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        farm_id: farmFilter || undefined,
        category: categoryFilter || undefined,
      };
      const res = await expenseService.getAll(params);
      setExpenses(res.data);
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, farmFilter, categoryFilter]);

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenCreate = () => {
    setSelectedExpense(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      farm_id: farmsList[0]?.farm_id || '',
      field_id: '',
      expense_date: today,
      category: 'FERTILIZER',
      amount_usd: '450.00',
      description: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (eItem) => {
    setSelectedExpense(eItem);
    setFormData({
      farm_id: eItem.farm_id,
      field_id: eItem.field_id || '',
      expense_date: eItem.expense_date ? eItem.expense_date.substring(0, 10) : '',
      category: eItem.category,
      amount_usd: eItem.amount_usd,
      description: eItem.description || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDelete = (eItem) => {
    setSelectedExpense(eItem);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.farm_id) errs.farm_id = 'Farm selection is required';
    if (!formData.expense_date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.expense_date)) {
      errs.expense_date = 'Expense date is required (YYYY-MM-DD)';
    }
    if (!formData.category) errs.category = 'Expense category is required';
    if (!formData.amount_usd || Number(formData.amount_usd) <= 0) {
      errs.amount_usd = 'Amount must be greater than 0';
    }
    if (!formData.description.trim()) {
      errs.description = 'Description is required';
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
        farm_id: Number(formData.farm_id),
        field_id: formData.field_id ? Number(formData.field_id) : null,
        expense_date: formData.expense_date,
        category: formData.category,
        amount_usd: Number(formData.amount_usd),
        description: formData.description.trim(),
      };

      if (selectedExpense) {
        await expenseService.update(selectedExpense.expense_id, payload);
        showToast('Expense record updated successfully', 'success');
      } else {
        await expenseService.create(payload);
        showToast('Expense transaction recorded successfully', 'success');
      }
      setIsFormOpen(false);
      fetchExpenses();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    setIsSubmitting(true);
    try {
      await expenseService.delete(selectedExpense.expense_id);
      showToast('Expense record deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchExpenses();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter fields belonging to the selected farm in modal
  const availableFields = formData.farm_id
    ? fieldsList.filter((f) => f.farm_id === Number(formData.farm_id))
    : fieldsList;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agricultural Expenditures</h2>
          <p className="text-xs text-slate-500 mt-1">
            Operational expenses, seed procurement, fertilizer, irrigation water, and maintenance costs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} icon={Plus}>
            Record New Expense
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="w-full sm:w-56">
            <select
              value={farmFilter}
              onChange={(e) => {
                setFarmFilter(e.target.value);
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

          <div className="w-full sm:w-56">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d8f3dc] focus:border-[#2d6a4f] bg-white text-slate-700"
            >
              <option value="">All Categories (Filter)</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchExpenses} icon={RefreshCw} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading && !expenses.length ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState title="Failed to Load Expenses" message={error.message} onRetry={fetchExpenses} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expense transactions found"
          message={farmFilter || categoryFilter ? 'No expenses match the selected filters.' : 'Log input expenditures to calculate farm profit margins.'}
          actionLabel={farmFilter || categoryFilter ? undefined : 'Record New Expense'}
          onAction={farmFilter || categoryFilter ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Transaction</th>
                  <th className="py-3 px-4">Farm & Field</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Expense Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount (USD)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((eItem) => (
                  <tr key={eItem.expense_id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{eItem.expense_id}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold text-slate-900 block">{eItem.farm_name}</span>
                      <span className="text-slate-400 text-[11px]">{eItem.field_name || 'General Farm-Level'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="purple">{eItem.category}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(eItem.expense_date)}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{eItem.description}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-700 text-sm">
                      {formatCurrency(eItem.amount_usd)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(eItem)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(eItem)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Expense"
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
        title={selectedExpense ? `Edit Expense #${selectedExpense.expense_id}` : 'Record Farm Expenditure'}
        subtitle="Log operational costs and link to specific field parcels when applicable"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Farm Property"
              name="farm_id"
              value={formData.farm_id}
              onChange={(e) => setFormData({ ...formData, farm_id: e.target.value, field_id: '' })}
              options={farmsList.map((f) => ({ value: f.farm_id, label: f.farm_name }))}
              placeholder="Select Farm"
              error={formErrors.farm_id}
              required
            />
            <Select
              label="Field Plot (Optional)"
              name="field_id"
              value={formData.field_id}
              onChange={(e) => setFormData({ ...formData, field_id: e.target.value })}
              options={availableFields.map((f) => ({ value: f.field_id, label: f.field_name }))}
              placeholder="All Farm / Unspecified"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Expense Date (YYYY-MM-DD)"
              name="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              error={formErrors.expense_date}
              required
            />
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={EXPENSE_CATEGORIES}
              required
            />
          </div>

          <Input
            label="Expenditure Amount (USD)"
            name="amount_usd"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 450.00"
            value={formData.amount_usd}
            onChange={(e) => setFormData({ ...formData, amount_usd: e.target.value })}
            error={formErrors.amount_usd}
            required
          />

          <Textarea
            label="Transaction Description"
            name="description"
            placeholder="e.g. NPK balanced fertilizer batch delivery"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={formErrors.description}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedExpense ? 'Update Expense' : 'Save Expense Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Expense Deletion"
        message="Are you sure you want to delete this expense transaction record?"
        confirmText="Delete Expense"
        isLoading={isSubmitting}
      />
    </div>
  );
}
