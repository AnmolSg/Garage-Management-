import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  Calendar as CalendarIcon,
  CheckSquare,
  Truck,
  Bell,
  Settings as SettingsIcon,
  User as UserIcon,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { fleetApi } from './services/api.ts';
import {
  DashboardSummary,
  Vehicle,
  Booking,
  SERVICE_CENTRES,
  resolveVehicleImage,
} from './types/fleet.ts';
import { OverviewDashboard } from './components/OverviewDashboard.tsx';
import { ServiceCalendar } from './components/ServiceCalendar.tsx';
import { VehicleManagement } from './components/VehicleManagement.tsx';
import { VehicleDetailsDrawer } from './components/VehicleDetailsDrawer.tsx';
import { BookServiceWizard } from './components/BookServiceWizard.tsx';

type NavTab =
  | 'overview'
  | 'calendar'
  | 'events'
  | 'vehicles'
  | 'notifications'
  | 'settings';

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

function FleetAppContent() {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Vehicle Details Drawer
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  // Book a Service Wizard Modal
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);
  const [wizardPrefillVehicleId, setWizardPrefillVehicleId] = useState<
    number | undefined
  >(undefined);

  // User Profile Dropdown
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Settings state
  const [defaultGarage, setDefaultGarage] = useState<string>(
    SERVICE_CENTRES[0]
  );
  const [autoConflictCheck, setAutoConflictCheck] = useState<boolean>(true);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const [sumData, vehList, bookList] = await Promise.all([
        fleetApi.getDashboardSummary(),
        fleetApi.getVehicles(),
        fleetApi.getBookings(),
      ]);
      setSummary(sumData);
      setVehicles(vehList);
      setBookings(bookList);
    } catch (err: any) {
      console.error('Error loading fleet data:', err);
      showToast('error', err.message || 'Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handlers
  const handleUpdateBookingStatus = async (
    bookingId: number,
    status: Booking['bookingStatus']
  ) => {
    try {
      await fleetApi.updateBooking(bookingId, { bookingStatus: status });
      await refreshAllData();
      showToast('success', `Booking #${bookingId} updated to ${status}.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update booking status');
    }
  };

  const handleDismissNotification = async (id: number) => {
    try {
      await fleetApi.dismissNotification(id);
      await refreshAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to dismiss notification');
    }
  };

  const handleDismissAllNotifications = async () => {
    try {
      await fleetApi.dismissAllNotifications();
      await refreshAllData();
      showToast('success', 'All active notifications dismissed.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to dismiss notifications');
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await fleetApi.markNotificationRead(id);
      await refreshAllData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateBooking = async (payload: Partial<Booking>) => {
    await fleetApi.createBooking(payload);
    await refreshAllData();
    showToast('success', 'Service booking created and added to schedule.');
  };

  const handleUpdateBooking = async (id: number, payload: Partial<Booking>) => {
    await fleetApi.updateBooking(id, payload);
    await refreshAllData();
    showToast('success', 'Service event updated.');
  };

  const handleDeleteBooking = async (id: number) => {
    await fleetApi.deleteBooking(id);
    await refreshAllData();
    showToast('success', 'Service event deleted.');
  };

  const handleCreateVehicle = async (payload: Partial<Vehicle>) => {
    await fleetApi.createVehicle(payload);
    await refreshAllData();
    showToast(
      'success',
      `Vehicle ${payload.registrationNumber} registered in PostgreSQL.`
    );
  };

  const handleUpdateVehicle = async (id: number, payload: Partial<Vehicle>) => {
    await fleetApi.updateVehicle(id, payload);
    await refreshAllData();
    showToast('success', 'Vehicle profile updated.');
  };

  const handleDeleteVehicle = async (id: number) => {
    await fleetApi.deleteVehicle(id);
    await refreshAllData();
    showToast('success', 'Vehicle removed from fleet.');
  };

  const unreadCount = summary?.counts.unreadNotifications || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-slate-900">
      {/* Top Dark Navy Navigation Bar (3-zone Top Bar Contract) */}
      <header className="h-14 bg-[#041E42] text-white flex items-center justify-between gap-8 px-5 border-b border-slate-800 sticky top-0 z-30">
        {/* Zone 1: Brand Title */}
        <button
          onClick={() => setActiveTab('overview')}
          className="text-sm font-bold tracking-widest uppercase text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          FLEET SERVICE PLANNING
        </button>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'overview'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-sky-400'
                : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'calendar'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-sky-400'
                : ''
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'events'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-sky-400'
                : ''
            }`}
          >
            Service Events
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'vehicles'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-sky-400'
                : ''
            }`}
          >
            Vehicles
          </button>
        </nav>

        {/* Zone 3: User Profile & Notification Controls */}
        <div className="flex items-center gap-3 shrink-0 relative">
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative p-2 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-sky-700 flex items-center justify-center text-white text-xs font-bold">
              {user?.displayName
                ? user.displayName[0].toUpperCase()
                : user?.email
                ? user.email[0].toUpperCase()
                : 'F'}
            </div>
            <span className="hidden sm:inline max-w-[140px] truncate">
              {user ? user.displayName || user.email : 'Fleet Manager'}
            </span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-60 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="font-bold text-slate-900 truncate">
                  {user ? user.displayName || 'Authenticated Operator' : 'Scania Fleet Portal'}
                </div>
                <div className="text-slate-500 text-[11px] truncate">
                  {user ? user.email : 'fleet.manager@scania-service.se'}
                </div>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setActiveTab('settings');
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Garage & Fleet Settings</span>
              </button>
              {user ? (
                <button
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await signOutUser();
                    showToast('success', 'Signed out successfully.');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-700"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setUserMenuOpen(false);
                    try {
                      await signInWithGoogle();
                      showToast('success', 'Signed in with Google.');
                    } catch (err: any) {
                      showToast(
                        'error',
                        err.message || 'Google Sign-In cancelled'
                      );
                    }
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-[#0A3264] font-semibold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Container with Fixed Left Vertical Sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Left Navigation Sidebar matching Scania Screenshot */}
        <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-2 shrink-0 select-none">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
            { id: 'events', label: 'Service Events', icon: CheckSquare },
            { id: 'vehicles', label: 'Vehicle Management', icon: Truck },
            {
              id: 'notifications',
              label: 'Notifications',
              icon: Bell,
              badge: unreadCount,
            },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavTab)}
                title={item.label}
                className={`relative w-full h-14 flex items-center justify-center border-b border-slate-100 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-200/80 text-[#041E42]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.badge ? (
                  <span className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-5 md:p-7 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewDashboard
              summary={summary}
              loading={loading}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              onOpenBookService={(prefillId) => {
                setWizardPrefillVehicleId(prefillId);
                setWizardOpen(true);
              }}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onDismissNotification={handleDismissNotification}
              onDismissAllNotifications={handleDismissAllNotifications}
              onMarkNotificationRead={handleMarkNotificationRead}
            />
          )}

          {activeTab === 'calendar' && (
            <ServiceCalendar
              events={bookings}
              vehicles={vehicles}
              equipmentGroups={summary?.equipmentGroups || []}
              onCreateEvent={handleCreateBooking}
              onUpdateEvent={handleUpdateBooking}
              onDeleteEvent={handleDeleteBooking}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehicleManagement
              vehicles={vehicles}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              onCreateVehicle={handleCreateVehicle}
              onUpdateVehicle={handleUpdateVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onOpenBookService={(id) => {
                setWizardPrefillVehicleId(id);
                setWizardOpen(true);
              }}
              externalEditVehicle={vehicleToEdit}
              onClearExternalEdit={() => setVehicleToEdit(null)}
            />
          )}

          {/* Service Events Checklist Module */}
          {activeTab === 'events' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Service Events & Bookings Registry
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Complete registry of all scheduled maintenance, repairs, and workshop appointments.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setWizardPrefillVehicleId(undefined);
                    setWizardOpen(true);
                  }}
                  className="inline-flex items-center gap-2 bg-[#0A3264] hover:bg-[#041E42] text-white text-xs font-semibold px-4 py-2.5 rounded cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Book a Service</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-3 px-4 font-semibold">Vehicle</th>
                      <th className="py-3 px-4 font-semibold">Service Type & Scope</th>
                      <th className="py-3 px-4 font-semibold">Service Centre</th>
                      <th className="py-3 px-4 font-semibold">Appointment</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Workflow Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bookings.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedVehicleId(b.vehicleId)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveVehicleImage(b.imagePath, b.vehicleType)}
                              alt={b.vehicleType}
                              referrerPolicy="no-referrer"
                              className="w-12 h-9 object-contain bg-slate-100 rounded p-1"
                            />
                            <div>
                              <div className="font-bold font-mono text-slate-900">
                                {b.registrationNumber}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {b.vehicleType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {b.serviceType}
                          </div>
                          <div className="text-slate-600">
                            {b.serviceDescription}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {b.serviceCentre}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-slate-800">
                          {b.appointmentDate} ({b.startTime} – {b.endTime})
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {b.bookingStatus}
                        </td>
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={b.bookingStatus}
                            onChange={(e) =>
                              handleUpdateBookingStatus(
                                b.id,
                                e.target.value as Booking['bookingStatus']
                              )
                            }
                            className="border border-slate-300 rounded px-2.5 py-1 bg-white text-xs font-medium"
                          >
                            <option value="Delayed">Delayed</option>
                            <option value="Due">Due</option>
                            <option value="Planned">Planned</option>
                            <option value="Preliminary">Preliminary</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Performed">Performed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notifications Full View */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Notifications & Workshop Alerts
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Real-time booking proposals, confirmations, and maintenance alerts across your fleet.
                  </p>
                </div>
                <button
                  onClick={handleDismissAllNotifications}
                  className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 rounded"
                >
                  Dismiss All Active
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
                {(summary?.notifications || []).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkNotificationRead(n.id);
                      if (n.vehicleId) setSelectedVehicleId(n.vehicleId);
                    }}
                    className={`p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 ${
                      !n.isRead ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900">
                          {n.notificationType}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {n.registrationNumber}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{n.serviceCentre}</span>
                      </div>
                      <p className="text-xs text-slate-700">{n.message}</p>
                    </div>
                    {!n.isDismissed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissNotification(n.id);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Fleet & Garage Settings
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Configure default workshop preferences, conflict validation, and account access.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-md p-6 space-y-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Default Assigned Service Centre
                  </label>
                  <select
                    value={defaultGarage}
                    onChange={(e) => {
                      setDefaultGarage(e.target.value);
                      showToast(
                        'success',
                        `Default garage updated to ${e.target.value}`
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  >
                    {SERVICE_CENTRES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">
                      Strict Appointment Conflict Validation
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Prevent overlapping maintenance or repair bookings for the same vehicle registration.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoConflictCheck}
                    onChange={(e) => setAutoConflictCheck(e.target.checked)}
                    className="w-4 h-4 accent-[#0A3264]"
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Slide-Over Vehicle Details Drawer (Screenshot 3) */}
      <VehicleDetailsDrawer
        vehicleId={selectedVehicleId}
        onClose={() => setSelectedVehicleId(null)}
        onDataChanged={refreshAllData}
        onEditVehicle={(v) => {
          setSelectedVehicleId(null);
          setVehicleToEdit(v);
          setActiveTab('vehicles');
        }}
      />

      {/* Multi-Step Book a Service Wizard Modal */}
      <BookServiceWizard
        isOpen={wizardOpen}
        vehicles={vehicles}
        existingBookings={bookings}
        prefillVehicleId={wizardPrefillVehicleId}
        onClose={() => setWizardOpen(false)}
        onSubmitBooking={handleCreateBooking}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded shadow-lg border text-xs font-medium ${
              t.type === 'success'
                ? 'bg-[#041E42] text-white border-slate-700'
                : 'bg-red-600 text-white border-red-700'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span className="flex-1">{t.text}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item.id !== t.id))
              }
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FleetAppContent />
    </AuthProvider>
  );
}
