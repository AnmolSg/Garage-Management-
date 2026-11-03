import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Truck,
  FileText,
  Trash2,
  Edit3,
  Check,
  Clock,
  History,
  AlertCircle,
} from 'lucide-react';
import {
  VehicleDetails,
  Booking,
  MaintenanceActivity,
  RepairActivity,
  SERVICE_CENTRES,
  resolveVehicleImage,
} from '../types/fleet.ts';
import { fleetApi } from '../services/api.ts';

interface VehicleDetailsDrawerProps {
  vehicleId: number | null;
  onClose: () => void;
  onDataChanged: () => void;
  onEditVehicle?: (vehicle: VehicleDetails) => void;
}

function formatSlashDate(dateStr?: string) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatBadgeDate(dateStr?: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const m = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[m] || parts[1]} ${parts[0]}, 09:00`;
}

export const VehicleDetailsDrawer: React.FC<VehicleDetailsDrawerProps> = ({
  vehicleId,
  onClose,
  onDataChanged,
  onEditVehicle,
}) => {
  const [details, setDetails] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion / Section states
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [expandedRepairId, setExpandedRepairId] = useState<number | null>(null);

  // Add Maintenance Form
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [newMaint, setNewMaint] = useState({
    activityName: '',
    description: '',
    scheduledDate: '2026-11-10',
    status: 'Due',
    notes: '',
  });

  // Edit Maintenance state
  const [editingMaintId, setEditingMaintId] = useState<number | null>(null);
  const [editMaintForm, setEditMaintForm] = useState<Partial<MaintenanceActivity>>({});
  const [confirmDeleteMaintId, setConfirmDeleteMaintId] = useState<number | null>(null);

  // Add Repair Form
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [newRepair, setNewRepair] = useState({
    repairName: '',
    description: '',
    priority: 'Major',
    scheduledDate: '2026-11-06',
    status: 'Due',
    notes: '',
  });

  // Edit Booking inline
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [editBookingForm, setEditBookingForm] = useState<Partial<Booking>>({});

  const loadVehicleDetails = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetApi.getVehicleById(id);
      setDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId !== null) {
      loadVehicleDetails(vehicleId);
    } else {
      setDetails(null);
    }
  }, [vehicleId]);

  if (vehicleId === null) return null;

  const handleToggleMaintenanceComplete = async (act: MaintenanceActivity) => {
    const nextStatus = act.status === 'Performed' ? 'Due' : 'Performed';
    try {
      await fleetApi.updateMaintenance(act.id, { status: nextStatus });
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaint.activityName.trim()) return;
    try {
      await fleetApi.createMaintenance(vehicleId, {
        activityName: newMaint.activityName,
        description: newMaint.description || newMaint.activityName,
        scheduledDate: newMaint.scheduledDate,
        status: newMaint.status,
        notes: newMaint.notes,
      });
      setNewMaint({
        activityName: '',
        description: '',
        scheduledDate: '2026-11-10',
        status: 'Due',
        notes: '',
      });
      setShowAddMaintenance(false);
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveEditMaint = async (id: number) => {
    try {
      await fleetApi.updateMaintenance(id, editMaintForm);
      setEditingMaintId(null);
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMaint = async (id: number) => {
    try {
      await fleetApi.deleteMaintenance(id);
      setConfirmDeleteMaintId(null);
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleRepairComplete = async (rep: RepairActivity) => {
    const nextStatus = rep.status === 'Performed' ? 'Due' : 'Performed';
    try {
      await fleetApi.updateRepair(rep.id, { status: nextStatus });
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepair.repairName.trim()) return;
    try {
      await fleetApi.createRepair(vehicleId, {
        repairName: newRepair.repairName,
        description: newRepair.description || newRepair.repairName,
        priority: newRepair.priority,
        scheduledDate: newRepair.scheduledDate,
        status: newRepair.status,
        notes: newRepair.notes,
      });
      setNewRepair({
        repairName: '',
        description: '',
        priority: 'Major',
        scheduledDate: '2026-11-06',
        status: 'Due',
        notes: '',
      });
      setShowAddRepair(false);
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateRepairField = async (
    id: number,
    payload: Partial<RepairActivity>
  ) => {
    try {
      await fleetApi.updateRepair(id, payload);
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveBookingEdit = async (bookingId: number) => {
    try {
      await fleetApi.updateBooking(bookingId, editBookingForm);
      setEditingBookingId(null);
      await loadVehicleDetails(vehicleId);
      onDataChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 flex justify-end">
      <div className="bg-white w-full max-w-3xl h-full overflow-y-auto shadow-2xl border-l border-slate-200 flex flex-col">
        {loading && !details ? (
          <div className="p-8 space-y-6">
            <div className="h-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-14 bg-slate-100 rounded animate-pulse" />
            <div className="h-48 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : details ? (
          <div className="p-6 md:p-8 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </span>
                <button onClick={() => setError(null)} className="text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Top Summary Header matching 3rd Scania Screenshot */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-200">
              {/* Left Column: Image + Reg + Make/Year */}
              <div className="md:col-span-4 space-y-2">
                <div className="w-40 h-24 flex items-center justify-start">
                  <img
                    src={resolveVehicleImage(
                      details.imagePath,
                      details.vehicleType
                    )}
                    alt={details.vehicleType}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="pt-1">
                  <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                    {details.registrationNumber}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {details.manufacturer} {details.manufacturingYear} ·{' '}
                    {details.model}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                    {details.vehicleType} · {details.equipmentGroup}
                  </p>
                </div>
              </div>

              {/* Middle Column: Odometer, Maintenance Plan, Next service */}
              <div className="md:col-span-4 space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Odometer</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {details.odometer.toLocaleString()} km
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Maintenance Plan</span>
                  <div className="mt-0.5 space-y-0.5">
                    <span className="text-[#1D4ED8] underline font-medium block cursor-pointer">
                      {details.maintenancePlan}
                    </span>
                    <span className="text-[#1D4ED8] underline font-medium block cursor-pointer">
                      Scania maintenance plan
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">Next service</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {formatSlashDate(details.nextServiceDate)}
                  </span>
                </div>
              </div>

              {/* Right Column: Engine Running Time, Other Service Activities & Top-Right Buttons */}
              <div className="md:col-span-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">
                        Engine Running Time
                      </span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums mt-0.5 block">
                        {details.engineRunningHours} hours
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">
                        Other Service Activities
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {details.assignedGarage || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Top-Right Truck Action & Close Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {onEditVehicle && (
                      <button
                        onClick={() => onEditVehicle(details)}
                        className="p-2 border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
                        title="Edit Vehicle Details"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-2 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                      aria-label="Close Vehicle Profile"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Bookings Section */}
            <div className="border-b border-slate-200 pb-4">
              <button
                onClick={() => setBookingsOpen(!bookingsOpen)}
                className="w-full flex items-center justify-between py-2 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Bookings
                  </span>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    ({details.bookings.length})
                  </span>
                </div>
                {bookingsOpen ? (
                  <ChevronUp className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </button>

              {bookingsOpen && (
                <div className="mt-3 space-y-2.5">
                  {details.bookings.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">
                      No service bookings recorded for this vehicle.
                    </p>
                  ) : (
                    details.bookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-slate-50 border border-slate-200 rounded p-3 text-xs"
                      >
                        {editingBookingId === b.id ? (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[11px] text-slate-500 mb-0.5">
                                  Status
                                </label>
                                <select
                                  value={editBookingForm.bookingStatus}
                                  onChange={(e) =>
                                    setEditBookingForm({
                                      ...editBookingForm,
                                      bookingStatus:
                                        e.target.value as Booking['bookingStatus'],
                                    })
                                  }
                                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                                >
                                  <option value="Preliminary">Preliminary</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Delayed">Delayed</option>
                                  <option value="Due">Due</option>
                                  <option value="Planned">Planned</option>
                                  <option value="Performed">Performed</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-500 mb-0.5">
                                  Date
                                </label>
                                <input
                                  type="date"
                                  value={editBookingForm.appointmentDate || ''}
                                  onChange={(e) =>
                                    setEditBookingForm({
                                      ...editBookingForm,
                                      appointmentDate: e.target.value,
                                    })
                                  }
                                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-500 mb-0.5">
                                  Time
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="time"
                                    value={editBookingForm.startTime || ''}
                                    onChange={(e) =>
                                      setEditBookingForm({
                                        ...editBookingForm,
                                        startTime: e.target.value,
                                      })
                                    }
                                    className="w-full border border-slate-300 rounded px-1 py-1 bg-white"
                                  />
                                  <span>-</span>
                                  <input
                                    type="time"
                                    value={editBookingForm.endTime || ''}
                                    onChange={(e) =>
                                      setEditBookingForm({
                                        ...editBookingForm,
                                        endTime: e.target.value,
                                      })
                                    }
                                    className="w-full border border-slate-300 rounded px-1 py-1 bg-white"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editBookingForm.serviceDescription || ''}
                                onChange={(e) =>
                                  setEditBookingForm({
                                    ...editBookingForm,
                                    serviceDescription: e.target.value,
                                  })
                                }
                                className="border border-slate-300 rounded px-2 py-1 bg-white"
                                placeholder="Service description"
                              />
                              <select
                                value={editBookingForm.serviceCentre || ''}
                                onChange={(e) =>
                                  setEditBookingForm({
                                    ...editBookingForm,
                                    serviceCentre: e.target.value,
                                  })
                                }
                                className="border border-slate-300 rounded px-2 py-1 bg-white"
                              >
                                {SERVICE_CENTRES.map((sc) => (
                                  <option key={sc} value={sc}>
                                    {sc}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingBookingId(null)}
                                className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveBookingEdit(b.id)}
                                className="px-3 py-1 bg-[#0A3264] text-white font-semibold rounded"
                              >
                                Save Booking
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900">
                                <span className="font-mono text-slate-500 mr-2">
                                  #{b.id}
                                </span>
                                {b.serviceType} — {b.serviceDescription}
                              </div>
                              <div className="text-slate-600 mt-0.5 tabular-nums">
                                {b.appointmentDate} ({b.startTime} - {b.endTime}) ·{' '}
                                {b.serviceCentre}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800">
                                {b.bookingStatus}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingBookingId(b.id);
                                  setEditBookingForm({
                                    serviceType: b.serviceType,
                                    serviceDescription: b.serviceDescription,
                                    bookingStatus: b.bookingStatus,
                                    appointmentDate: b.appointmentDate,
                                    startTime: b.startTime,
                                    endTime: b.endTime,
                                    serviceCentre: b.serviceCentre,
                                  });
                                }}
                                className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200"
                                title="Edit booking"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Maintenance Checklist Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Maintenance
                </h3>
                <button
                  onClick={() => setShowAddMaintenance(!showAddMaintenance)}
                  className="inline-flex items-center gap-3 border border-slate-400 hover:border-slate-700 text-slate-800 text-xs font-medium px-4 py-2 rounded transition-colors cursor-pointer"
                >
                  <span>Add an unplanned activity</span>
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showAddMaintenance && (
                <form
                  onSubmit={handleCreateMaintenance}
                  className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3 text-xs"
                >
                  <div className="font-bold text-slate-800">
                    New Maintenance Activity
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Activity description (e.g. VBG koppling 795V-2)"
                      value={newMaint.activityName}
                      onChange={(e) =>
                        setNewMaint({ ...newMaint, activityName: e.target.value })
                      }
                      className="sm:col-span-2 bg-white border border-slate-300 rounded px-3 py-1.5"
                    />
                    <input
                      type="date"
                      required
                      value={newMaint.scheduledDate}
                      onChange={(e) =>
                        setNewMaint({
                          ...newMaint,
                          scheduledDate: e.target.value,
                        })
                      }
                      className="bg-white border border-slate-300 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <select
                      value={newMaint.status}
                      onChange={(e) =>
                        setNewMaint({ ...newMaint, status: e.target.value })
                      }
                      className="bg-white border border-slate-300 rounded px-3 py-1.5"
                    >
                      <option value="Delayed">Delayed</option>
                      <option value="Due">Due</option>
                      <option value="Planned">Planned</option>
                      <option value="Performed">Performed</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddMaintenance(false)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#0A3264] text-white font-semibold rounded"
                      >
                        Add Activity
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="divide-y divide-slate-200 border-b border-slate-200">
                {details.maintenanceActivities.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500">
                    No maintenance activities scheduled.
                  </p>
                ) : (
                  details.maintenanceActivities.map((act) => {
                    const isCompleted = act.status === 'Performed';
                    const isDelayed = act.status === 'Delayed';
                    return (
                      <div key={act.id} className="py-3.5">
                        {editingMaintId === act.id ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <input
                              type="text"
                              value={editMaintForm.activityName || ''}
                              onChange={(e) =>
                                setEditMaintForm({
                                  ...editMaintForm,
                                  activityName: e.target.value,
                                })
                              }
                              className="flex-1 border border-slate-300 rounded px-2.5 py-1"
                            />
                            <input
                              type="date"
                              value={editMaintForm.scheduledDate || ''}
                              onChange={(e) =>
                                setEditMaintForm({
                                  ...editMaintForm,
                                  scheduledDate: e.target.value,
                                })
                              }
                              className="border border-slate-300 rounded px-2.5 py-1"
                            />
                            <select
                              value={editMaintForm.status || 'Due'}
                              onChange={(e) =>
                                setEditMaintForm({
                                  ...editMaintForm,
                                  status: e.target.value,
                                })
                              }
                              className="border border-slate-300 rounded px-2 py-1"
                            >
                              <option value="Delayed">Delayed</option>
                              <option value="Due">Due</option>
                              <option value="Planned">Planned</option>
                              <option value="Performed">Performed</option>
                            </select>
                            <button
                              onClick={() => handleSaveEditMaint(act.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingMaintId(null)}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4">
                            <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() =>
                                  handleToggleMaintenanceComplete(act)
                                }
                                className="w-4 h-4 rounded border-slate-400 text-[#0A3264] focus:ring-[#0A3264]"
                              />
                              <span
                                className={`text-sm ${
                                  isCompleted
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-800'
                                }`}
                              >
                                {act.activityName}
                              </span>
                            </label>

                            <div className="flex items-center gap-2 shrink-0">
                              <div
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs tabular-nums ${
                                  isCompleted
                                    ? 'bg-slate-100 text-slate-700'
                                    : isDelayed
                                    ? 'bg-red-50 text-red-900'
                                    : 'bg-blue-50 text-blue-900'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isCompleted
                                      ? 'bg-slate-600'
                                      : isDelayed
                                      ? 'bg-red-600'
                                      : 'bg-blue-600'
                                  }`}
                                />
                                <span className="font-bold">{act.status}</span>
                                <span>{formatBadgeDate(act.scheduledDate)}</span>
                              </div>

                              <button
                                onClick={() => {
                                  setEditingMaintId(act.id);
                                  setEditMaintForm({
                                    activityName: act.activityName,
                                    scheduledDate: act.scheduledDate,
                                    status: act.status,
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                title="Edit activity"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {confirmDeleteMaintId === act.id ? (
                                <button
                                  onClick={() => handleDeleteMaint(act.id)}
                                  className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded"
                                >
                                  Confirm Delete
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteMaintId(act.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                                  title="Delete activity"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="text-[11px] font-semibold text-slate-600">
                Required
              </div>
            </div>

            {/* Repair Checklist Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Repair
                </h3>
                <button
                  onClick={() => setShowAddRepair(!showAddRepair)}
                  className="inline-flex items-center gap-3 border border-slate-400 hover:border-slate-700 text-slate-800 text-xs font-medium px-4 py-2 rounded transition-colors cursor-pointer"
                >
                  <span>Add an unplanned repair</span>
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showAddRepair && (
                <form
                  onSubmit={handleCreateRepair}
                  className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3 text-xs"
                >
                  <div className="font-bold text-slate-800">
                    New Unplanned Repair
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Repair description (e.g. Black smoke)"
                      value={newRepair.repairName}
                      onChange={(e) =>
                        setNewRepair({ ...newRepair, repairName: e.target.value })
                      }
                      className="sm:col-span-2 bg-white border border-slate-300 rounded px-3 py-1.5"
                    />
                    <input
                      type="date"
                      required
                      value={newRepair.scheduledDate}
                      onChange={(e) =>
                        setNewRepair({
                          ...newRepair,
                          scheduledDate: e.target.value,
                        })
                      }
                      className="bg-white border border-slate-300 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={newRepair.priority}
                      onChange={(e) =>
                        setNewRepair({ ...newRepair, priority: e.target.value })
                      }
                      className="bg-white border border-slate-300 rounded px-3 py-1.5"
                    >
                      <option value="Minor">Priority: Minor</option>
                      <option value="Normal">Priority: Normal</option>
                      <option value="Major">Priority: Major</option>
                      <option value="Critical">Priority: Critical</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Additional workshop notes..."
                      value={newRepair.notes}
                      onChange={(e) =>
                        setNewRepair({ ...newRepair, notes: e.target.value })
                      }
                      className="bg-white border border-slate-300 rounded px-3 py-1.5"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddRepair(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#0A3264] text-white font-semibold rounded"
                    >
                      Add Repair
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-slate-200 border-b border-slate-200">
                {details.repairActivities.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500">
                    No active repair requests for this vehicle.
                  </p>
                ) : (
                  details.repairActivities.map((rep) => {
                    const isCompleted = rep.status === 'Performed';
                    const isExpanded = expandedRepairId === rep.id;
                    return (
                      <div key={rep.id} className="py-3.5">
                        <div className="flex items-center justify-between gap-4">
                          <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => handleToggleRepairComplete(rep)}
                              className="w-4 h-4 rounded border-slate-400 text-[#0A3264]"
                            />
                            <span
                              className={`text-sm ${
                                isCompleted
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800'
                              }`}
                            >
                              {rep.repairName}
                            </span>
                          </label>

                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />

                          <div className="flex items-center gap-2 shrink-0">
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs tabular-nums ${
                                isCompleted
                                  ? 'bg-slate-100 text-slate-700'
                                  : rep.priority === 'Critical'
                                  ? 'bg-red-50 text-red-900'
                                  : 'bg-amber-50 text-amber-900'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isCompleted
                                    ? 'bg-slate-600'
                                    : rep.priority === 'Critical'
                                    ? 'bg-red-600'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span className="font-bold">
                                {isCompleted ? 'Performed' : rep.priority}
                              </span>
                              <span>{formatBadgeDate(rep.scheduledDate)}</span>
                            </div>

                            <button
                              onClick={() =>
                                setExpandedRepairId(isExpanded ? null : rep.id)
                              }
                              className="p-1 text-slate-500 hover:text-slate-900"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pl-7 pr-2 py-2.5 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
                            <div className="text-slate-700">
                              <span className="font-semibold">Description: </span>
                              {rep.description}
                            </div>
                            {rep.notes && (
                              <div className="text-slate-600">
                                <span className="font-semibold">Notes: </span>
                                {rep.notes}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">Priority:</span>
                                <select
                                  value={rep.priority}
                                  onChange={(e) =>
                                    handleUpdateRepairField(rep.id, {
                                      priority: e.target.value,
                                    })
                                  }
                                  className="border border-slate-300 rounded px-2 py-0.5 bg-white"
                                >
                                  <option value="Minor">Minor</option>
                                  <option value="Normal">Normal</option>
                                  <option value="Major">Major</option>
                                  <option value="Critical">Critical</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">Status:</span>
                                <select
                                  value={rep.status}
                                  onChange={(e) =>
                                    handleUpdateRepairField(rep.id, {
                                      status: e.target.value,
                                    })
                                  }
                                  className="border border-slate-300 rounded px-2 py-0.5 bg-white"
                                >
                                  <option value="Due">Due</option>
                                  <option value="Delayed">Delayed</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Performed">Performed</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Service History Section */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Service History
                </h3>
              </div>

              {details.serviceHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  No completed service history records yet.
                </p>
              ) : (
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2.5 px-3 font-semibold">Date</th>
                        <th className="py-2.5 px-3 font-semibold">Activity Description</th>
                        <th className="py-2.5 px-3 font-semibold">Service Centre</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Odometer</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {details.serviceHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 tabular-nums font-medium text-slate-900 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {h.serviceDate}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="font-semibold text-slate-900">
                              {h.serviceType}:
                            </span>{' '}
                            {h.description}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {h.serviceCentre}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                            {h.odometerReading.toLocaleString()} km
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                            {h.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
