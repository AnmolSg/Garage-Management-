import {
  DashboardSummary,
  Vehicle,
  VehicleDetails,
  Booking,
  MaintenanceActivity,
  RepairActivity,
  FleetNotification,
} from '../types/fleet.ts';

let memoryAuthToken: string | null = null;

export function setMemoryAuthToken(token: string | null) {
  memoryAuthToken = token;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (memoryAuthToken) {
    headers['Authorization'] = `Bearer ${memoryAuthToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export const fleetApi = {
  // Dashboard
  getDashboardSummary: () => apiFetch<DashboardSummary>('/api/dashboard/summary'),

  // Vehicles
  getVehicles: () => apiFetch<Vehicle[]>('/api/vehicles'),
  getVehicleById: (id: number) => apiFetch<VehicleDetails>(`/api/vehicles/${id}`),
  createVehicle: (payload: Partial<Vehicle>) =>
    apiFetch<Vehicle>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateVehicle: (id: number, payload: Partial<Vehicle>) =>
    apiFetch<Vehicle>(`/api/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteVehicle: (id: number) =>
    apiFetch<{ success: boolean }>(`/api/vehicles/${id}`, {
      method: 'DELETE',
    }),

  // Bookings
  getBookings: () => apiFetch<Booking[]>('/api/bookings'),
  getBookingById: (id: number) => apiFetch<Booking>(`/api/bookings/${id}`),
  createBooking: (payload: Partial<Booking>) =>
    apiFetch<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBooking: (id: number, payload: Partial<Booking>) =>
    apiFetch<Booking>(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteBooking: (id: number) =>
    apiFetch<{ success: boolean }>(`/api/bookings/${id}`, {
      method: 'DELETE',
    }),

  // Maintenance
  getVehicleMaintenance: (vehicleId: number) =>
    apiFetch<MaintenanceActivity[]>(`/api/vehicles/${vehicleId}/maintenance`),
  createMaintenance: (vehicleId: number, payload: Partial<MaintenanceActivity>) =>
    apiFetch<MaintenanceActivity>(`/api/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMaintenance: (id: number, payload: Partial<MaintenanceActivity>) =>
    apiFetch<MaintenanceActivity>(`/api/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteMaintenance: (id: number) =>
    apiFetch<{ success: boolean }>(`/api/maintenance/${id}`, {
      method: 'DELETE',
    }),

  // Repairs
  getVehicleRepairs: (vehicleId: number) =>
    apiFetch<RepairActivity[]>(`/api/vehicles/${vehicleId}/repairs`),
  createRepair: (vehicleId: number, payload: Partial<RepairActivity>) =>
    apiFetch<RepairActivity>(`/api/vehicles/${vehicleId}/repairs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateRepair: (id: number, payload: Partial<RepairActivity>) =>
    apiFetch<RepairActivity>(`/api/repairs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteRepair: (id: number) =>
    apiFetch<{ success: boolean }>(`/api/repairs/${id}`, {
      method: 'DELETE',
    }),

  // Calendar
  getCalendarEvents: () => apiFetch<Booking[]>('/api/calendar/events'),
  createCalendarEvent: (payload: Partial<Booking>) =>
    apiFetch<Booking>('/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCalendarEvent: (id: number, payload: Partial<Booking>) =>
    apiFetch<Booking>(`/api/calendar/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCalendarEvent: (id: number) =>
    apiFetch<{ success: boolean }>(`/api/calendar/events/${id}`, {
      method: 'DELETE',
    }),

  // Notifications
  getNotifications: () => apiFetch<FleetNotification[]>('/api/notifications'),
  markNotificationRead: (id: number) =>
    apiFetch<FleetNotification>(`/api/notifications/${id}/read`, {
      method: 'PUT',
    }),
  dismissNotification: (id: number) =>
    apiFetch<FleetNotification>(`/api/notifications/${id}/dismiss`, {
      method: 'PUT',
    }),
  dismissAllNotifications: () =>
    apiFetch<{ success: boolean }>('/api/notifications/dismiss-all', {
      method: 'PUT',
    }),
};
