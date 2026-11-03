import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  Ban,
  Save,
  AlertCircle,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  Booking,
  Vehicle,
  SERVICE_CENTRES,
  resolveVehicleImage,
} from '../types/fleet.ts';

interface ServiceCalendarProps {
  events: Booking[];
  vehicles: Vehicle[];
  equipmentGroups: string[];
  onCreateEvent: (payload: Partial<Booking>) => Promise<void>;
  onUpdateEvent: (id: number, payload: Partial<Booking>) => Promise<void>;
  onDeleteEvent: (id: number) => Promise<void>;
  onSelectVehicle: (vehicleId: number) => void;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    borderTop: string;
    text: string;
    filterPillBg: string;
    filterPillText: string;
  }
> = {
  Delayed: {
    label: 'Delayed',
    bg: '#FEE2E2',
    borderTop: '#EF4444',
    text: '#7F1D1D',
    filterPillBg: 'bg-red-200',
    filterPillText: 'text-red-950',
  },
  Due: {
    label: 'Due',
    bg: '#E0E7FF',
    borderTop: '#3B82F6',
    text: '#1E3A8A',
    filterPillBg: 'bg-blue-200',
    filterPillText: 'text-blue-950',
  },
  Preliminary: {
    label: 'Preliminary',
    bg: '#FEF9C3',
    borderTop: '#EAB308',
    text: '#713F12',
    filterPillBg: 'bg-amber-200',
    filterPillText: 'text-amber-950',
  },
  Performed: {
    label: 'Performed',
    bg: '#D1D5DB',
    borderTop: '#4B5563',
    text: '#111827',
    filterPillBg: 'bg-slate-700',
    filterPillText: 'text-white',
  },
  Confirmed: {
    label: 'Confirmed',
    bg: '#D1FAE5',
    borderTop: '#10B981',
    text: '#064E3B',
    filterPillBg: 'bg-emerald-200',
    filterPillText: 'text-emerald-950',
  },
  Planned: {
    label: 'Planned',
    bg: '#E2E8F0',
    borderTop: '#94A3B8',
    text: '#1E293B',
    filterPillBg: 'bg-slate-200',
    filterPillText: 'text-slate-800',
  },
  'In Progress': {
    label: 'In Progress',
    bg: '#DBEAFE',
    borderTop: '#0284C7',
    text: '#0C4A6E',
    filterPillBg: 'bg-sky-200',
    filterPillText: 'text-sky-950',
  },
};

const MAINTENANCE_ACTIVITIES = [
  'Preventive maintenance',
  'Flexible maintenance',
  'Oil changes',
  'Periodic inspections',
  'Engine servicing',
  'Other scheduled maintenance',
];

const REPAIR_ACTIVITIES = [
  'Engine repair',
  'Brake repair',
  'Electrical repair',
  'Transmission repair',
  'Tyre-related repairs',
  'Unplanned repairs',
  'Other repair activities',
];

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const HOUR_HEIGHT = 76; // px per hour slot

function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseMinutes(timeStr: string): number {
  const [hStr, mStr] = (timeStr || '08:00').split(':');
  const h = parseInt(hStr, 10) || 8;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

export const ServiceCalendar: React.FC<ServiceCalendarProps> = ({
  events,
  vehicles,
  equipmentGroups,
  onCreateEvent,
  onUpdateEvent,
  onSelectVehicle,
}) => {
  // Base reference date: 2026-11-03 (Sunday Nov 1 – Saturday Nov 7)
  const [anchorDate, setAnchorDate] = useState<Date>(new Date(2026, 10, 3));
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchReg, setSearchReg] = useState<string>('');
  const [activeStatuses, setActiveStatuses] = useState<string[]>([
    'Delayed',
    'Due',
    'Preliminary',
    'Performed',
    'Confirmed',
    'Planned',
    'In Progress',
  ]);

  // Event Details Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Booking>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create Event Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCategoryType, setCreateCategoryType] = useState<
    'Maintenance' | 'Repair'
  >('Maintenance');
  const [createForm, setCreateForm] = useState({
    vehicleId: vehicles[0]?.id || 1,
    serviceType: 'Flexible maintenance',
    serviceDescription: 'Flexible Maintenance, 250,000 km',
    bookingStatus: 'Preliminary' as Booking['bookingStatus'],
    appointmentDate: '2026-11-04',
    startTime: '08:00',
    endTime: '11:30',
    serviceCentre: SERVICE_CENTRES[0],
    priority: 'Normal',
    notes: '',
  });

  const toggleStatusFilter = (status: string) => {
    setActiveStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Compute 7 days of current week (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(anchorDate);
    startOfWeek.setDate(anchorDate.getDate() - anchorDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        date: d,
        ymd: formatYMD(d),
        dayNum: d.getDate(),
        weekdayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
      };
    });
  }, [anchorDate]);

  // Compute days for Monthly view
  const monthDays = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return {
        date: d,
        ymd: formatYMD(d),
        dayNum: d.getDate(),
        inCurrentMonth: d.getMonth() === month,
      };
    });
  }, [anchorDate]);

  const headerTitle = useMemo(() => {
    const monthName = anchorDate.toLocaleString('en-US', { month: 'long' });
    const year = anchorDate.getFullYear();
    const week = getISOWeekNumber(anchorDate);
    return viewMode === 'week'
      ? `${monthName} ${year}, Week ${week}`
      : `${monthName} ${year}`;
  }, [anchorDate, viewMode]);

  const filteredBookings = useMemo(() => {
    return events.filter((ev) => {
      if (ev.bookingStatus === 'Cancelled') return false;
      if (!activeStatuses.includes(ev.bookingStatus)) return false;
      if (selectedGroup !== 'ALL' && ev.equipmentGroup !== selectedGroup) {
        return false;
      }
      if (searchReg.trim()) {
        const q = searchReg.toLowerCase();
        if (
          !(ev.registrationNumber || '').toLowerCase().includes(q) &&
          !(ev.serviceDescription || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [events, activeStatuses, selectedGroup, searchReg]);

  const handlePrev = () => {
    const next = new Date(anchorDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setAnchorDate(next);
  };

  const handleNext = () => {
    const next = new Date(anchorDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setAnchorDate(next);
  };

  const handleToday = () => {
    setAnchorDate(new Date(2026, 10, 3));
  };

  const openBookingDetails = (b: Booking) => {
    setSelectedBooking(b);
    setEditForm({
      serviceType: b.serviceType,
      serviceDescription: b.serviceDescription,
      bookingStatus: b.bookingStatus,
      appointmentDate: b.appointmentDate,
      startTime: b.startTime,
      endTime: b.endTime,
      serviceCentre: b.serviceCentre,
      priority: b.priority,
      notes: b.notes || '',
    });
    setEditMode(false);
    setModalError(null);
  };

  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setSaving(true);
    setModalError(null);
    try {
      await onUpdateEvent(selectedBooking.id, editForm);
      setSelectedBooking(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusUpdate = async (status: Booking['bookingStatus']) => {
    if (!selectedBooking) return;
    setSaving(true);
    setModalError(null);
    try {
      await onUpdateEvent(selectedBooking.id, { bookingStatus: status });
      setSelectedBooking(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to update event status');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      await onCreateEvent(createForm);
      setShowCreateModal(false);
    } catch (err: any) {
      setModalError(
        err.message || 'Booking conflict or invalid schedule parameters'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header & Filters matching Screenshot 2 */}
      <div className="bg-white border border-slate-200 rounded-md p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
            Calendar
          </h1>

          <button
            onClick={() => {
              setCreateForm((prev) => ({
                ...prev,
                vehicleId: vehicles[0]?.id || 1,
              }));
              setModalError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 bg-[#0A3264] hover:bg-[#041E42] text-white text-xs font-semibold px-4 py-2.5 rounded transition-colors cursor-pointer self-start lg:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Service Event</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* All Groups Dropdown */}
            <div className="min-w-[175px]">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-[#041E42] px-3 py-2 text-xs font-medium text-slate-700 outline-none"
                aria-label="Equipment Group Filter"
              >
                <option value="ALL">All Groups</option>
                {equipmentGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Status Colour Filter Strip matching Scania Screenshot */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border-b-2 border-slate-300 px-3 py-1.5 rounded-t">
              {(
                [
                  'Delayed',
                  'Due',
                  'Preliminary',
                  'Performed',
                  'Confirmed',
                  'Planned',
                ] as const
              ).map((st) => {
                const cfg = STATUS_CONFIG[st];
                const isActive = activeStatuses.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleStatusFilter(st)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      cfg.filterPillBg
                    } ${cfg.filterPillText} ${
                      isActive
                        ? 'opacity-100 ring-1 ring-slate-400/50'
                        : 'opacity-35'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
            <span title="Click any status to toggle visibility on the calendar">
              <Info className="w-4 h-4 text-slate-500" />
            </span>
          </div>

          {/* Search by Registration Number */}
          <div className="relative min-w-[230px]">
            <input
              type="text"
              value={searchReg}
              onChange={(e) => setSearchReg(e.target.value)}
              placeholder="Search"
              className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-[#041E42] pl-3 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Week Navigation Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-900 min-w-[195px] text-center tabular-nums">
              {headerTitle}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="ml-2 px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Week / Month View Switch */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded border border-slate-200">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-1 text-xs font-semibold rounded-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-1 text-xs font-semibold rounded-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid View */}
      {viewMode === 'week' ? (
        <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
          <div className="min-w-[980px]">
            {/* 7-Day Column Headers matching "24 Sunday | 25 Monday | ..." */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/70">
              <div className="py-3 px-2 border-r border-slate-200" />
              {weekDays.map((day) => {
                const isToday = day.ymd === '2026-11-03';
                return (
                  <div
                    key={day.ymd}
                    className={`py-3 px-2 text-center border-r last:border-r-0 border-slate-200 text-xs ${
                      isToday ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <span className="font-bold text-slate-900 tabular-nums">
                      {day.dayNum}
                    </span>{' '}
                    <span className="text-slate-600 font-medium">
                      {day.weekdayName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Vertical Time Slots Grid (07:00 to 17:00) */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
              {/* Left Hour Axis */}
              <div className="border-r border-slate-200 bg-white select-none">
                {HOURS.map((hr) => (
                  <div
                    key={hr}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-slate-100 pr-2 pt-1 text-right text-[11px] font-mono text-slate-500 tabular-nums"
                  >
                    {hr}
                  </div>
                ))}
              </div>

              {/* 7 Day Columns */}
              {weekDays.map((day) => {
                const dayEvents = filteredBookings.filter(
                  (ev) => ev.appointmentDate === day.ymd
                );
                return (
                  <div
                    key={day.ymd}
                    onClick={() => {
                      setCreateForm((prev) => ({
                        ...prev,
                        vehicleId: vehicles[0]?.id || 1,
                        appointmentDate: day.ymd,
                      }));
                      setModalError(null);
                      setShowCreateModal(true);
                    }}
                    className="relative border-r last:border-r-0 border-slate-200 hover:bg-slate-50/30 transition-colors"
                    style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
                  >
                    {/* Background Horizontal Hour Lines */}
                    {HOURS.map((hr) => (
                      <div
                        key={hr}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                        className="border-b border-slate-100 pointer-events-none"
                      />
                    ))}

                    {/* Positioned Coloured Event Blocks */}
                    {dayEvents.map((ev, idx) => {
                      const cfg =
                        STATUS_CONFIG[ev.bookingStatus] ||
                        STATUS_CONFIG.Planned;
                      const startMins = parseMinutes(ev.startTime);
                      const endMins = parseMinutes(ev.endTime);
                      const baseMins = 7 * 60; // 07:00
                      const topPx = Math.max(
                        0,
                        ((startMins - baseMins) / 60) * HOUR_HEIGHT
                      );
                      const durationMins = Math.max(90, endMins - startMins);
                      const heightPx = (durationMins / 60) * HOUR_HEIGHT;

                      // Slight horizontal offset if multiple events on same day
                      const overlapCount = dayEvents.length;
                      const widthPct = overlapCount > 1 ? 92 : 96;
                      const leftPct = overlapCount > 1 ? idx * 4 + 2 : 2;

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openBookingDetails(ev);
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: cfg.bg,
                            borderTop: `3px solid ${cfg.borderTop}`,
                            color: cfg.text,
                          }}
                          className="absolute z-10 p-2.5 rounded-b-xs shadow-2xs overflow-hidden flex flex-col justify-between text-xs cursor-pointer hover:brightness-95 transition-all"
                        >
                          <div>
                            <div className="font-bold tracking-tight text-[11.5px]">
                              <span>{ev.bookingStatus}</span>{' '}
                              <span className="font-mono font-normal">
                                {ev.registrationNumber}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] leading-snug opacity-90 line-clamp-2">
                              {ev.serviceDescription}
                            </div>
                            <div className="mt-0.5 text-[10.5px] opacity-80 truncate">
                              {ev.serviceCentre}
                            </div>
                          </div>

                          <div className="mt-1 font-mono text-[10.5px] font-medium tabular-nums opacity-90">
                            {ev.startTime} - {ev.endTime}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Monthly Calendar View */
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-700">
            {[
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
            {monthDays.map((cell) => {
              const dayEvs = filteredBookings.filter(
                (e) => e.appointmentDate === cell.ymd
              );
              return (
                <div
                  key={cell.ymd}
                  onClick={() => {
                    setCreateForm((prev) => ({
                      ...prev,
                      appointmentDate: cell.ymd,
                    }));
                    setModalError(null);
                    setShowCreateModal(true);
                  }}
                  className={`min-h-[120px] p-2 transition-colors cursor-pointer hover:bg-slate-50/60 ${
                    cell.inCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold tabular-nums mb-1.5">
                    {cell.dayNum}
                  </div>
                  <div className="space-y-1">
                    {dayEvs.map((ev) => {
                      const cfg =
                        STATUS_CONFIG[ev.bookingStatus] ||
                        STATUS_CONFIG.Planned;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openBookingDetails(ev);
                          }}
                          style={{
                            backgroundColor: cfg.bg,
                            borderLeft: `3px solid ${cfg.borderTop}`,
                            color: cfg.text,
                          }}
                          className="px-2 py-1 rounded-xs text-[10.5px] truncate font-medium"
                        >
                          <span className="font-bold">{ev.bookingStatus}</span>{' '}
                          <span className="font-mono">
                            {ev.registrationNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Details / Reschedule Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#041E42] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold tracking-wide">
                  Service Event Details — {selectedBooking.registrationNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Vehicle Summary Strip */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={resolveVehicleImage(
                      selectedBooking.imagePath,
                      selectedBooking.vehicleType
                    )}
                    alt={selectedBooking.vehicleType}
                    referrerPolicy="no-referrer"
                    className="w-14 h-10 object-contain bg-white rounded p-1 border border-slate-200"
                  />
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900">
                      {selectedBooking.registrationNumber}
                    </div>
                    <div className="text-xs text-slate-600">
                      {selectedBooking.manufacturer} {selectedBooking.model} ·{' '}
                      {selectedBooking.vehicleType}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const vId = selectedBooking.vehicleId;
                    setSelectedBooking(null);
                    onSelectVehicle(vId);
                  }}
                  className="text-xs font-semibold text-[#0A3264] hover:underline inline-flex items-center gap-1"
                >
                  <span>Vehicle Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {!editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block">Status</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {selectedBooking.bookingStatus}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block">Category</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {selectedBooking.serviceType}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Date & Time
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block tabular-nums">
                        {selectedBooking.appointmentDate} (
                        {selectedBooking.startTime} - {selectedBooking.endTime})
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Service Centre
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block truncate">
                        {selectedBooking.serviceCentre}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <span className="text-slate-500 font-medium">
                      Service Description
                    </span>
                    <p className="text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {selectedBooking.serviceDescription}
                    </p>
                  </div>

                  {selectedBooking.notes && (
                    <div className="text-xs space-y-1">
                      <span className="text-slate-500 font-medium">Notes</span>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                        {selectedBooking.notes}
                      </p>
                    </div>
                  )}

                  {/* Quick Workflow Actions */}
                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        Edit / Reschedule
                      </button>
                      {selectedBooking.bookingStatus !== 'Confirmed' && (
                        <button
                          disabled={saving}
                          onClick={() => handleQuickStatusUpdate('Confirmed')}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                      {selectedBooking.bookingStatus !== 'Performed' && (
                        <button
                          disabled={saving}
                          onClick={() => handleQuickStatusUpdate('Performed')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0A3264] hover:bg-[#041E42] rounded transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark as Performed
                        </button>
                      )}
                    </div>

                    <button
                      disabled={saving}
                      onClick={() => handleQuickStatusUpdate('Cancelled')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancel Event
                    </button>
                  </div>
                </>
              ) : (
                <form
                  onSubmit={handleSaveBookingEdit}
                  className="space-y-3 text-xs"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Booking Status
                      </label>
                      <select
                        value={editForm.bookingStatus}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            bookingStatus:
                              e.target.value as Booking['bookingStatus'],
                          })
                        }
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      >
                        <option value="Preliminary">Preliminary</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Due">Due</option>
                        <option value="Planned">Planned</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Performed">Performed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Scheduled Date
                      </label>
                      <input
                        type="date"
                        required
                        value={editForm.appointmentDate || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            appointmentDate: e.target.value,
                          })
                        }
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        required
                        value={editForm.startTime || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            startTime: e.target.value,
                          })
                        }
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        required
                        value={editForm.endTime || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, endTime: e.target.value })
                        }
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Service Centre
                    </label>
                    <select
                      value={editForm.serviceCentre || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          serviceCentre: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    >
                      {SERVICE_CENTRES.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Service Description
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.serviceDescription || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          serviceDescription: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.notes || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, notes: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0A3264] hover:bg-[#041E42] rounded"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Calendar Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#041E42] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold">
                  Schedule Maintenance or Repair Event
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateSubmit}
              className="p-5 space-y-3.5 text-xs"
            >
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Vehicle
                </label>
                <select
                  value={createForm.vehicleId}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      vehicleId: Number(e.target.value),
                    })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.manufacturer} {v.model} (
                      {v.vehicleType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Event Category
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateCategoryType('Maintenance');
                        setCreateForm({
                          ...createForm,
                          serviceType: MAINTENANCE_ACTIVITIES[0],
                        });
                      }}
                      className={`py-1 rounded text-xs font-semibold ${
                        createCategoryType === 'Maintenance'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Maintenance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateCategoryType('Repair');
                        setCreateForm({
                          ...createForm,
                          serviceType: REPAIR_ACTIVITIES[0],
                        });
                      }}
                      className={`py-1 rounded text-xs font-semibold ${
                        createCategoryType === 'Repair'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Repair
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Activity Type
                  </label>
                  <select
                    value={createForm.serviceType}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        serviceType: e.target.value,
                        serviceDescription: `${e.target.value}, 250,000 km`,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {(createCategoryType === 'Maintenance'
                      ? MAINTENANCE_ACTIVITIES
                      : REPAIR_ACTIVITIES
                    ).map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Service Description
                </label>
                <input
                  type="text"
                  required
                  value={createForm.serviceDescription}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      serviceDescription: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.appointmentDate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        appointmentDate: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={createForm.startTime}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={createForm.endTime}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, endTime: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Initial Status
                  </label>
                  <select
                    value={createForm.bookingStatus}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        bookingStatus:
                          e.target.value as Booking['bookingStatus'],
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="Preliminary">Preliminary</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Planned">Planned</option>
                    <option value="Due">Due</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Service Centre
                  </label>
                  <select
                    value={createForm.serviceCentre}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        serviceCentre: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {SERVICE_CENTRES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0A3264] hover:bg-[#041E42] rounded"
                >
                  {saving ? 'Checking Conflicts...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
