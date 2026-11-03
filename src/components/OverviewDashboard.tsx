import React, { useState, useMemo } from 'react';
import {
  Search,
  Wrench,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  Check,
  Ban,
  Play,
  CheckCircle2,
  CalendarPlus,
  FileText,
} from 'lucide-react';
import {
  DashboardSummary,
  Booking,
  FleetNotification,
  resolveVehicleImage,
} from '../types/fleet.ts';

interface OverviewDashboardProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onSelectVehicle: (vehicleId: number) => void;
  onOpenBookService: (prefillVehicleId?: number) => void;
  onUpdateBookingStatus: (bookingId: number, status: Booking['bookingStatus']) => Promise<void>;
  onDismissNotification: (id: number) => Promise<void>;
  onDismissAllNotifications: () => Promise<void>;
  onMarkNotificationRead: (id: number) => Promise<void>;
}

function formatDisplayDateTime(dateStr: string, timeStr?: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return `${dateStr} ${timeStr || ''}`.trim();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  return `${day} ${months[monthIdx] || parts[1]} ${year}, ${timeStr || '09:00'}`;
}

function formatRelativeTime(createdAt?: string, index?: number) {
  if (!createdAt) return '3 days ago';
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffHours = Math.max(1, Math.floor((now - created) / (1000 * 60 * 60)));
  if (diffHours < 24) {
    if (index !== undefined && index >= 2) return `${index + 1} days ago`;
    return `${diffHours}h ago`;
  }
  const days = Math.floor(diffHours / 24);
  return `${days} days ago`;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  summary,
  loading,
  onSelectVehicle,
  onOpenBookService,
  onUpdateBookingStatus,
  onDismissNotification,
  onDismissAllNotifications,
  onMarkNotificationRead,
}) => {
  const [notifTab, setNotifTab] = useState<'new' | 'all' | 'dismissed'>('all');
  const [notifPage, setNotifPage] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);

  const filteredNotifications = useMemo(() => {
    if (!summary) return [];
    return summary.notifications.filter((n) => {
      if (notifTab === 'new') return !n.isRead && !n.isDismissed;
      if (notifTab === 'dismissed') return n.isDismissed;
      return !n.isDismissed;
    });
  }, [summary, notifTab]);

  const pageSize = 5;
  const totalNotifs = filteredNotifications.length;
  const pagedNotifications = filteredNotifications.slice(
    notifPage * pageSize,
    notifPage * pageSize + pageSize
  );

  const filterCard = (b: Booking) => {
    if (selectedGroup !== 'ALL' && b.equipmentGroup !== selectedGroup) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.registrationNumber || '').toLowerCase().includes(q) ||
      (b.model || '').toLowerCase().includes(q) ||
      (b.vehicleType || '').toLowerCase().includes(q) ||
      (b.serviceDescription || '').toLowerCase().includes(q) ||
      (b.serviceCentre || '').toLowerCase().includes(q)
    );
  };

  const col1 = useMemo(
    () => (summary?.columns.serviceEventsToBook || []).filter(filterCard),
    [summary, selectedGroup, searchQuery]
  );
  const col2 = useMemo(
    () => (summary?.columns.preliminaryBookings || []).filter(filterCard),
    [summary, selectedGroup, searchQuery]
  );
  const col3 = useMemo(
    () => (summary?.columns.confirmedBookings || []).filter(filterCard),
    [summary, selectedGroup, searchQuery]
  );
  const col4 = useMemo(
    () => (summary?.columns.inProgressBookings || []).filter(filterCard),
    [summary, selectedGroup, searchQuery]
  );

  const handleStatusChange = async (
    e: React.MouseEvent,
    bookingId: number,
    status: Booking['bookingStatus']
  ) => {
    e.stopPropagation();
    setBusyBookingId(bookingId);
    try {
      await onUpdateBookingStatus(bookingId, status);
    } finally {
      setBusyBookingId(null);
    }
  };

  const renderNotificationSegments = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('proposal') || t.includes('preliminary')) {
      return (
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-1 rounded-sm bg-amber-400" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
        </div>
      );
    }
    if (t.includes('confirmed')) {
      return (
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-1 rounded-sm bg-emerald-500" />
          <span className="w-3.5 h-1 rounded-sm bg-emerald-500" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
        </div>
      );
    }
    if (t.includes('performed') || t.includes('completed')) {
      return (
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-1 rounded-sm bg-slate-700" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-700" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-700" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-700" />
        </div>
      );
    }
    if (t.includes('delayed') || t.includes('repair') || t.includes('cancel')) {
      return (
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-1 rounded-sm bg-red-600" />
          <span className="w-3.5 h-1 rounded-sm bg-red-600" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
          <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <span className="w-3.5 h-1 rounded-sm bg-blue-600" />
        <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
        <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
        <span className="w-3.5 h-1 rounded-sm bg-slate-200" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Notifications & Updates Section */}
      <section className="bg-white border border-slate-200 rounded-md p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNotifTab('new');
                setNotifPage(0);
              }}
              className={`px-3 py-1 text-xs font-semibold tracking-wide rounded transition-colors whitespace-nowrap shrink-0 ${
                notifTab === 'new'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'text-slate-700 hover:bg-slate-100 uppercase'
              }`}
            >
              New Updates
              {summary?.counts.unreadNotifications ? (
                <span className="ml-1.5 tabular-nums">
                  ({summary.counts.unreadNotifications})
                </span>
              ) : null}
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setNotifTab('all');
                setNotifPage(0);
              }}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 ${
                notifTab === 'all'
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Updates
            </button>
            <button
              onClick={() => {
                setNotifTab('dismissed');
                setNotifPage(0);
              }}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 ${
                notifTab === 'dismissed'
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Dismissed
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            {notifTab !== 'dismissed' && totalNotifs > 0 && (
              <button
                onClick={onDismissAllNotifications}
                className="px-3 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Dismiss all
              </button>
            )}
            <span className="tabular-nums font-medium">
              {totalNotifs === 0
                ? '0 Updates'
                : `${notifPage * pageSize + 1} - ${Math.min(
                    (notifPage + 1) * pageSize,
                    totalNotifs
                  )} of ${totalNotifs} Updates`}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={notifPage === 0}
                onClick={() => setNotifPage((p) => Math.max(0, p - 1))}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                aria-label="Previous updates"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={(notifPage + 1) * pageSize >= totalNotifs}
                onClick={() => setNotifPage((p) => p + 1)}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                aria-label="Next updates"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {pagedNotifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200">
            No {notifTab === 'dismissed' ? 'dismissed' : notifTab === 'new' ? 'unread' : ''} service updates to display.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {pagedNotifications.map((notif: FleetNotification, idx: number) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) onMarkNotificationRead(notif.id);
                  if (notif.vehicleId) onSelectVehicle(notif.vehicleId);
                }}
                className={`relative group border rounded-md p-3.5 transition-all cursor-pointer flex flex-col justify-between min-h-[132px] ${
                  !notif.isRead
                    ? 'bg-white border-slate-300 shadow-xs hover:border-slate-400'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {renderNotificationSegments(notif.notificationType)}
                      <span className="text-[11px] font-semibold text-slate-700 truncate">
                        {notif.notificationType}
                      </span>
                    </div>
                    {!notif.isDismissed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissNotification(notif.id);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                    {notif.message}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="tabular-nums">
                    {formatRelativeTime(notif.createdAt, idx)}
                  </span>
                  {!notif.isRead && (
                    <span className="text-[10px] font-semibold text-blue-700">
                      Unread
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Overview Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
          Overview
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Equipment Group Dropdown */}
          <div className="relative min-w-[210px]">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-white border-b-2 border-slate-300 focus:border-[#041E42] px-3 py-2 text-sm text-slate-700 font-medium outline-none transition-colors"
              aria-label="Equipment Group Filter"
            >
              <option value="ALL">All equipment groups</option>
              {(summary?.equipmentGroups || []).map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registration, model, type..."
              className="w-full bg-white border-b-2 border-slate-300 focus:border-[#041E42] pl-3 pr-9 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Book a Service CTA */}
          <button
            onClick={() => onOpenBookService()}
            className="inline-flex items-center gap-2.5 bg-[#0A3264] hover:bg-[#041E42] text-white text-sm font-semibold px-4 py-2.5 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Book a service</span>
            <Wrench className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Four Main Dashboard Kanban Columns */}
      {loading && !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="space-y-3">
              <div className="h-11 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-36 bg-white border border-slate-200 rounded p-4 animate-pulse" />
              <div className="h-36 bg-white border border-slate-200 rounded p-4 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {/* COLUMN 1: Service events to book */}
          <div className="space-y-3">
            <div className="bg-[#E2E6EC] px-3.5 py-2.5 rounded-t border-b-2 border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-800">
                  Service events to book
                </h2>
                <span className="bg-white text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {col1.length}
                </span>
              </div>
              <span title="Vehicles requiring maintenance or repair that have not yet been booked">
                <Info className="w-4 h-4 text-slate-600" />
              </span>
            </div>

            {col1.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded p-6 text-center text-xs text-slate-500">
                No unbooked service events matching current filter.
              </div>
            ) : (
              col1.map((item) => {
                const isDelayed = item.bookingStatus === 'Delayed';
                const isMajor =
                  item.priority === 'Major' || item.priority === 'Critical';
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectVehicle(item.vehicleId)}
                    className="bg-white border border-slate-200 hover:border-slate-400 rounded p-4 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center p-1 shrink-0">
                        <img
                          src={resolveVehicleImage(item.imagePath, item.vehicleType)}
                          alt={item.vehicleType || 'Vehicle'}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                          {item.registrationNumber}
                        </div>
                        <p className="text-xs text-slate-700 leading-snug mt-0.5 line-clamp-2">
                          {item.serviceDescription}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-slate-500">
                      {item.serviceType} · {item.vehicleType}
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium tabular-nums ${
                          isDelayed
                            ? 'bg-red-50 text-red-800'
                            : isMajor
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isDelayed
                              ? 'bg-red-600'
                              : isMajor
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                        />
                        <span className="font-bold">
                          {isDelayed
                            ? 'Delayed'
                            : isMajor
                            ? 'Major'
                            : item.bookingStatus}
                        </span>
                        <span>
                          {formatDisplayDateTime(
                            item.appointmentDate,
                            item.startTime
                          )}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenBookService(item.vehicleId);
                        }}
                        className="text-[11px] font-semibold text-[#0A3264] hover:underline inline-flex items-center gap-1 shrink-0"
                        title="Book service for this vehicle"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Book
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* COLUMN 2: Preliminary Bookings */}
          <div className="space-y-3">
            <div className="bg-[#E2E6EC] px-3.5 py-2.5 rounded-t border-b-2 border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-800">
                  Preliminary Bookings
                </h2>
                <span className="bg-white text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {col2.length}
                </span>
              </div>
              <span title="Booking requests awaiting approval or confirmation">
                <Info className="w-4 h-4 text-slate-600" />
              </span>
            </div>

            {col2.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded p-6 text-center text-xs text-slate-500">
                No preliminary booking requests pending approval.
              </div>
            ) : (
              col2.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectVehicle(item.vehicleId)}
                  className="bg-white border border-slate-200 hover:border-slate-400 rounded p-4 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center p-1 shrink-0">
                      <img
                        src={resolveVehicleImage(item.imagePath, item.vehicleType)}
                        alt={item.vehicleType || 'Vehicle'}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                        {item.registrationNumber}
                      </div>
                      <p className="text-xs text-slate-700 leading-snug mt-0.5 line-clamp-2">
                        {item.serviceDescription}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 truncate">
                    {item.serviceCentre}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2 py-0.5 rounded text-[11px] font-medium tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-bold">Proposal</span>
                      <span>
                        {formatDisplayDateTime(
                          item.appointmentDate,
                          item.startTime
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      disabled={busyBookingId === item.id}
                      onClick={(e) =>
                        handleStatusChange(e, item.id, 'Cancelled')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded transition-colors"
                    >
                      <Ban className="w-3 h-3" />
                      Reject
                    </button>
                    <button
                      disabled={busyBookingId === item.id}
                      onClick={(e) =>
                        handleStatusChange(e, item.id, 'Confirmed')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* COLUMN 3: Confirmed Bookings */}
          <div className="space-y-3">
            <div className="bg-[#E2E6EC] px-3.5 py-2.5 rounded-t border-b-2 border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-800">
                  Confirmed Bookings
                </h2>
                <span className="bg-white text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {col3.length}
                </span>
              </div>
              <span title="Approved service appointments">
                <Info className="w-4 h-4 text-slate-600" />
              </span>
            </div>

            {col3.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded p-6 text-center text-xs text-slate-500">
                No confirmed bookings found.
              </div>
            ) : (
              col3.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectVehicle(item.vehicleId)}
                  className="bg-white border border-slate-200 hover:border-slate-400 rounded p-4 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center p-1 shrink-0">
                      <img
                        src={resolveVehicleImage(item.imagePath, item.vehicleType)}
                        alt={item.vehicleType || 'Vehicle'}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                        {item.registrationNumber}
                      </div>
                      <p className="text-xs text-slate-700 leading-snug mt-0.5 line-clamp-2">
                        {item.serviceDescription}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 truncate">
                    {item.serviceCentre}
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded text-[11px] font-medium tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="font-bold">Drop off</span>
                      <span>
                        {formatDisplayDateTime(
                          item.appointmentDate,
                          item.startTime
                        )}
                      </span>
                    </div>

                    <button
                      disabled={busyBookingId === item.id}
                      onClick={(e) =>
                        handleStatusChange(e, item.id, 'In Progress')
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#0A3264] hover:bg-slate-100 rounded transition-colors shrink-0"
                      title="Begin workshop service"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* COLUMN 4: In Progress */}
          <div className="space-y-3">
            <div className="bg-[#E2E6EC] px-3.5 py-2.5 rounded-t border-b-2 border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-800">
                  In Progress
                </h2>
                <span className="bg-white text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {col4.length}
                </span>
              </div>
              <span title="Vehicles currently undergoing maintenance or repair">
                <Info className="w-4 h-4 text-slate-600" />
              </span>
            </div>

            {col4.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded p-6 text-center text-xs text-slate-500">
                No vehicles currently in workshop bay.
              </div>
            ) : (
              col4.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectVehicle(item.vehicleId)}
                  className="bg-white border border-slate-200 hover:border-slate-400 rounded p-4 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center p-1 shrink-0">
                      <img
                        src={resolveVehicleImage(item.imagePath, item.vehicleType)}
                        alt={item.vehicleType || 'Vehicle'}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                        {item.registrationNumber}
                      </div>
                      <p className="text-xs text-slate-700 leading-snug mt-0.5 line-clamp-2">
                        {item.serviceDescription}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 truncate">
                    {item.serviceCentre}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 px-2 py-0.5 rounded text-[11px] font-medium tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="font-bold">Pick up</span>
                      <span>
                        {formatDisplayDateTime(
                          item.appointmentDate,
                          item.endTime
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {item.serviceType}
                    </span>
                    <button
                      disabled={busyBookingId === item.id}
                      onClick={(e) =>
                        handleStatusChange(e, item.id, 'Performed')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#0A3264] hover:bg-[#041E42] rounded transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark as Completed
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
