import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
  Eye,
  CalendarPlus,
} from 'lucide-react';
import {
  Vehicle,
  VEHICLE_CATEGORIES,
  SERVICE_CENTRES,
  resolveVehicleImage,
  VehicleCategory,
} from '../types/fleet.ts';

interface VehicleManagementProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: number) => void;
  onCreateVehicle: (payload: Partial<Vehicle>) => Promise<void>;
  onUpdateVehicle: (id: number, payload: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: number) => Promise<void>;
  onOpenBookService: (vehicleId: number) => void;
  externalEditVehicle?: Vehicle | null;
  onClearExternalEdit?: () => void;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({
  vehicles,
  onSelectVehicle,
  onCreateVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onOpenBookService,
  externalEditVehicle,
  onClearExternalEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Add / Edit Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    registrationNumber: '',
    vehicleType: 'Container Truck' as VehicleCategory,
    equipmentGroup: 'Heavy Haulage',
    manufacturer: 'Scania',
    model: 'R 500 A6x2NA',
    manufacturingYear: 2024,
    odometer: 45000,
    engineRunningHours: 1120,
    imagePath: VEHICLE_CATEGORIES[0].imagePath,
    maintenancePlan: 'Flexible Maintenance, M inspection, X inspection',
    nextServiceDate: '2026-11-18',
    assignedGarage: SERVICE_CENTRES[0],
    notes: '',
  });

  useEffect(() => {
    if (externalEditVehicle) {
      openEditModal(externalEditVehicle);
      if (onClearExternalEdit) onClearExternalEdit();
    }
  }, [externalEditVehicle]);

  const openAddModal = (preselectedCategory?: VehicleCategory) => {
    const cat =
      VEHICLE_CATEGORIES.find((c) => c.id === preselectedCategory) ||
      VEHICLE_CATEGORIES[0];
    setEditingVehicle(null);
    setForm({
      registrationNumber: '',
      vehicleType: cat.id,
      equipmentGroup: cat.defaultGroup,
      manufacturer: 'Scania',
      model: 'R 500 A6x2NA',
      manufacturingYear: 2024,
      odometer: 25000,
      engineRunningHours: 640,
      imagePath: cat.imagePath,
      maintenancePlan: 'Flexible Maintenance, M inspection, X inspection',
      nextServiceDate: '2026-11-15',
      assignedGarage: SERVICE_CENTRES[0],
      notes: '',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setForm({
      registrationNumber: v.registrationNumber,
      vehicleType: v.vehicleType as VehicleCategory,
      equipmentGroup: v.equipmentGroup || 'Heavy Haulage',
      manufacturer: v.manufacturer,
      model: v.model,
      manufacturingYear: v.manufacturingYear,
      odometer: v.odometer,
      engineRunningHours: v.engineRunningHours,
      imagePath: resolveVehicleImage(v.imagePath, v.vehicleType),
      maintenancePlan: v.maintenancePlan,
      nextServiceDate: v.nextServiceDate,
      assignedGarage: v.assignedGarage || SERVICE_CENTRES[0],
      notes: v.notes || '',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  const handleSelectCategoryInForm = (catId: VehicleCategory) => {
    const cat = VEHICLE_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    setForm((prev) => ({
      ...prev,
      vehicleType: cat.id,
      equipmentGroup: cat.defaultGroup,
      imagePath: cat.imagePath,
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const reg = form.registrationNumber.trim().toUpperCase();
    if (!reg) {
      setFormError('Registration number is required.');
      return;
    }
    if (form.odometer < 0 || isNaN(Number(form.odometer))) {
      setFormError('Odometer reading must be a non-negative number.');
      return;
    }
    if (form.engineRunningHours < 0 || isNaN(Number(form.engineRunningHours))) {
      setFormError('Engine running hours must be a non-negative number.');
      return;
    }
    if (!form.nextServiceDate) {
      setFormError('Next scheduled service date is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingVehicle) {
        await onUpdateVehicle(editingVehicle.id, {
          ...form,
          registrationNumber: reg,
        });
      } else {
        await onCreateVehicle({
          ...form,
          registrationNumber: reg,
        });
      }
      setShowFormModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (categoryFilter !== 'ALL' && v.vehicleType !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.registrationNumber.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.vehicleType.toLowerCase().includes(q) ||
        v.assignedGarage.toLowerCase().includes(q)
      );
    });
  }, [vehicles, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
            Vehicle Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Register, maintain, and inspect commercial fleet vehicles across all garage locations.
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="inline-flex items-center gap-2 bg-[#0A3264] hover:bg-[#041E42] text-white text-sm font-semibold px-4 py-2.5 rounded transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register Vehicle</span>
        </button>
      </div>

      {/* Six Supplied Vehicle Category Cards */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Fleet Categories (Click to Filter or Register)
          </span>
          {categoryFilter !== 'ALL' && (
            <button
              onClick={() => setCategoryFilter('ALL')}
              className="text-xs font-semibold text-[#1D4ED8] hover:underline"
            >
              Show All Categories ({vehicles.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VEHICLE_CATEGORIES.map((cat) => {
            const count = vehicles.filter((v) => v.vehicleType === cat.id).length;
            const isSelected = categoryFilter === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() =>
                  setCategoryFilter(isSelected ? 'ALL' : cat.id)
                }
                className={`border rounded p-3 transition-all cursor-pointer flex flex-col items-center text-center ${
                  isSelected
                    ? 'border-[#0A3264] bg-blue-50/40 ring-1 ring-[#0A3264]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="h-14 w-full flex items-center justify-center p-1">
                  <img
                    src={cat.imagePath}
                    alt={cat.label}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="mt-2 text-xs font-bold text-slate-900">
                  {cat.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {count} {count === 1 ? 'unit' : 'units'} · {cat.fileName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Fleet Directory Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-bold text-slate-900">
            Registered Fleet Units{' '}
            <span className="text-slate-500 font-normal tabular-nums">
              ({filteredVehicles.length})
            </span>
          </div>

          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registration, model, garage..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-[#041E42] rounded pl-3 pr-9 py-1.5 text-xs text-slate-800 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Vehicle</th>
                <th className="py-3 px-4 font-semibold">Category & Group</th>
                <th className="py-3 px-4 font-semibold">Maintenance Plan</th>
                <th className="py-3 px-4 font-semibold text-right">Odometer</th>
                <th className="py-3 px-4 font-semibold text-right">Engine Hrs</th>
                <th className="py-3 px-4 font-semibold">Next Service</th>
                <th className="py-3 px-4 font-semibold">Assigned Garage</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVehicles.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => onSelectVehicle(v.id)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-10 bg-slate-100 rounded p-1 flex items-center justify-center shrink-0">
                        <img
                          src={resolveVehicleImage(v.imagePath, v.vehicleType)}
                          alt={v.vehicleType}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-bold font-mono text-slate-900">
                          {v.registrationNumber}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {v.manufacturer} {v.model} ({v.manufacturingYear})
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">
                      {v.vehicleType}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {v.equipmentGroup}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-[220px] truncate">
                    {v.maintenancePlan}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                    {v.odometer.toLocaleString()} km
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {v.engineRunningHours.toLocaleString()} h
                  </td>
                  <td className="py-3 px-4 tabular-nums font-medium text-slate-900">
                    {v.nextServiceDate}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {v.assignedGarage}
                  </td>
                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onSelectVehicle(v.id)}
                        className="p-1.5 text-slate-600 hover:text-[#0A3264] hover:bg-slate-100 rounded"
                        title="View Vehicle Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenBookService(v.id)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        title="Book Service"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                        title="Edit Vehicle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === v.id ? (
                        <button
                          onClick={async () => {
                            await onDeleteVehicle(v.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(v.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Vehicle Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8">
            <div className="bg-[#041E42] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wide">
                {editingVehicle
                  ? `Edit Vehicle — ${editingVehicle.registrationNumber}`
                  : 'Register New Commercial Vehicle'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitForm}
              className="p-6 space-y-5 max-h-[82vh] overflow-y-auto text-xs"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Selectable Six Vehicle Category Image Cards */}
              <div>
                <label className="block text-slate-700 font-bold mb-2">
                  1. Select Vehicle Category (Determines Default Vehicle Asset) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {VEHICLE_CATEGORIES.map((cat) => {
                    const selected = form.vehicleType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategoryInForm(cat.id)}
                        className={`p-3 rounded border text-left transition-all flex items-center gap-3 cursor-pointer ${
                          selected
                            ? 'border-[#0A3264] bg-blue-50/50 ring-1 ring-[#0A3264]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <img
                          src={cat.imagePath}
                          alt={cat.label}
                          referrerPolicy="no-referrer"
                          className="w-14 h-10 object-contain shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {cat.label}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {cat.fileName}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Identification Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Registration Number (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BVDH839DFM"
                    value={form.registrationNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        registrationNumber: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.manufacturer}
                    onChange={(e) =>
                      setForm({ ...form, manufacturer: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Vehicle Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. R 500 A6x2NA"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              {/* Technical Telemetry & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Manufacturing Year *
                  </label>
                  <input
                    type="number"
                    required
                    min={1995}
                    max={2030}
                    value={form.manufacturingYear}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        manufacturingYear: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Odometer (km) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.odometer}
                    onChange={(e) =>
                      setForm({ ...form, odometer: Number(e.target.value) })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Engine Running Hours *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.engineRunningHours}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        engineRunningHours: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Equipment Group
                  </label>
                  <select
                    value={form.equipmentGroup}
                    onChange={(e) =>
                      setForm({ ...form, equipmentGroup: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  >
                    <option value="Heavy Haulage">Heavy Haulage</option>
                    <option value="Regional Distribution">
                      Regional Distribution
                    </option>
                    <option value="Construction Fleet">Construction Fleet</option>
                    <option value="Hazmat & Tanker">Hazmat & Tanker</option>
                  </select>
                </div>
              </div>

              {/* Service Planning Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Maintenance Plan *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.maintenancePlan}
                    onChange={(e) =>
                      setForm({ ...form, maintenancePlan: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Next Scheduled Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.nextServiceDate}
                    onChange={(e) =>
                      setForm({ ...form, nextServiceDate: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Assigned Garage / Service Centre *
                  </label>
                  <select
                    value={form.assignedGarage}
                    onChange={(e) =>
                      setForm({ ...form, assignedGarage: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  >
                    {SERVICE_CENTRES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional chassis notes, telemetry module IDs, or special instructions..."
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0A3264] hover:bg-[#041E42] rounded cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {saving
                      ? 'Saving...'
                      : editingVehicle
                      ? 'Update Vehicle'
                      : 'Save Vehicle'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
