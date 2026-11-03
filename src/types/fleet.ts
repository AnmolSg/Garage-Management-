export type VehicleCategory =
  | 'Container Truck'
  | 'Dump Truck'
  | 'Box Truck'
  | 'Concrete Mixer'
  | 'Tanker Truck'
  | 'Flatbed Trailer';

export interface VehicleCategoryInfo {
  id: VehicleCategory;
  label: string;
  fileName: string;
  imagePath: string;
  defaultGroup: string;
}

export const VEHICLE_CATEGORIES: VehicleCategoryInfo[] = [
  {
    id: 'Container Truck',
    label: 'Container Truck',
    fileName: 'container_truck.png',
    imagePath: '/assets/aistudio/container_truck_fc97f6bb.png',
    defaultGroup: 'Heavy Haulage',
  },
  {
    id: 'Dump Truck',
    label: 'Dump Truck',
    fileName: 'dump_truck.png',
    imagePath: '/assets/aistudio/dump_truck_aef58392.png',
    defaultGroup: 'Construction Fleet',
  },
  {
    id: 'Box Truck',
    label: 'Box Truck',
    fileName: 'box_truck.png',
    imagePath: '/assets/aistudio/box_truck_71d6ae96.png',
    defaultGroup: 'Regional Distribution',
  },
  {
    id: 'Concrete Mixer',
    label: 'Concrete Mixer',
    fileName: 'concrete_mixer.png',
    imagePath: '/assets/aistudio/concrete_mixer_dd133043.png',
    defaultGroup: 'Construction Fleet',
  },
  {
    id: 'Tanker Truck',
    label: 'Tanker Truck',
    fileName: 'tanker_truck.png',
    imagePath: '/assets/aistudio/tanker_truck_eaa93d96.png',
    defaultGroup: 'Hazmat & Tanker',
  },
  {
    id: 'Flatbed Trailer',
    label: 'Flatbed Trailer',
    fileName: 'flatbed_trailer.png',
    imagePath: '/assets/aistudio/flatbed_trailer_e293059c.png',
    defaultGroup: 'Heavy Haulage',
  },
];

export function resolveVehicleImage(imagePath?: string, vehicleType?: string): string {
  if (imagePath && imagePath.startsWith('/assets/aistudio/')) {
    return imagePath;
  }
  if (imagePath) {
    const byFile = VEHICLE_CATEGORIES.find((c) => imagePath.includes(c.fileName.replace('.png', '')));
    if (byFile) return byFile.imagePath;
  }
  if (vehicleType) {
    const byCategory = VEHICLE_CATEGORIES.find(
      (c) => c.id.toLowerCase() === vehicleType.toLowerCase()
    );
    if (byCategory) return byCategory.imagePath;
  }
  return VEHICLE_CATEGORIES[0].imagePath;
}

export interface Vehicle {
  id: number;
  registrationNumber: string;
  vehicleType: string;
  equipmentGroup: string;
  manufacturer: string;
  model: string;
  manufacturingYear: number;
  odometer: number;
  engineRunningHours: number;
  imagePath: string;
  maintenancePlan: string;
  nextServiceDate: string;
  assignedGarage: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  id: number;
  vehicleId: number;
  serviceType: string;
  serviceDescription: string;
  bookingStatus:
    | 'Delayed'
    | 'Due'
    | 'Preliminary'
    | 'Performed'
    | 'Confirmed'
    | 'Planned'
    | 'In Progress'
    | 'Cancelled';
  appointmentDate: string;
  startTime: string;
  endTime: string;
  serviceCentre: string;
  priority: string;
  notes: string;
  registrationNumber?: string;
  vehicleType?: string;
  equipmentGroup?: string;
  manufacturer?: string;
  model?: string;
  imagePath?: string;
  maintenancePlan?: string;
  odometer?: number;
}

export interface MaintenanceActivity {
  id: number;
  vehicleId: number;
  activityName: string;
  description: string;
  scheduledDate: string;
  status: string;
  completionDate: string | null;
  notes: string;
}

export interface RepairActivity {
  id: number;
  vehicleId: number;
  repairName: string;
  description: string;
  priority: string;
  scheduledDate: string;
  status: string;
  completionDate: string | null;
  notes: string;
}

export interface ServiceHistoryItem {
  id: number;
  vehicleId: number;
  bookingId: number | null;
  serviceType: string;
  description: string;
  serviceDate: string;
  odometerReading: number;
  serviceCentre: string;
  status: string;
}

export interface VehicleDetails extends Vehicle {
  bookings: Booking[];
  maintenanceActivities: MaintenanceActivity[];
  repairActivities: RepairActivity[];
  serviceHistory: ServiceHistoryItem[];
}

export interface FleetNotification {
  id: number;
  notificationType: string;
  message: string;
  vehicleId: number | null;
  bookingId: number | null;
  serviceCentre: string;
  serviceDate: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  registrationNumber?: string;
  vehicleModel?: string;
}

export interface DashboardSummary {
  counts: {
    serviceEventsToBook: number;
    preliminaryBookings: number;
    confirmedBookings: number;
    inProgress: number;
    unreadNotifications: number;
  };
  columns: {
    serviceEventsToBook: Booking[];
    preliminaryBookings: Booking[];
    confirmedBookings: Booking[];
    inProgressBookings: Booking[];
  };
  notifications: FleetNotification[];
  equipmentGroups: string[];
  totalVehicles: number;
}

export const SERVICE_CENTRES = [
  'Scania Sverige AB / Jordbro',
  'Scania Sverige AB / Södertälje Hovsjö',
  'Scania Sverige AB / Kungens Kurva',
  'Scania Latvia SIA Liepaja',
  'Scania Göteborg / Hisings Backa',
];
