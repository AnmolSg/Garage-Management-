import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  registrationNumber: text('registration_number').notNull().unique(),
  vehicleType: text('vehicle_type').notNull(), // Container Truck | Dump Truck | Box Truck | Concrete Mixer | Tanker Truck | Flatbed Trailer
  equipmentGroup: text('equipment_group').notNull().default('Heavy Haulage'),
  manufacturer: text('manufacturer').notNull(),
  model: text('model').notNull(),
  manufacturingYear: integer('manufacturing_year').notNull(),
  odometer: integer('odometer').notNull().default(0),
  engineRunningHours: integer('engine_running_hours').notNull().default(0),
  imagePath: text('image_path').notNull(),
  maintenancePlan: text('maintenance_plan').notNull(),
  nextServiceDate: text('next_service_date').notNull(), // YYYY-MM-DD
  assignedGarage: text('assigned_garage').notNull().default('Scania Sverige AB / Jordbro'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  serviceType: text('service_type').notNull(),
  serviceDescription: text('service_description').notNull(),
  bookingStatus: text('booking_status').notNull().default('Preliminary'), // Preliminary | Confirmed | In Progress | Performed | Delayed | Due | Planned | Cancelled
  appointmentDate: text('appointment_date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').notNull().default('08:00'), // HH:MM
  endTime: text('end_time').notNull().default('11:30'), // HH:MM
  serviceCentre: text('service_centre').notNull().default('Scania Sverige AB / Jordbro'),
  priority: text('priority').notNull().default('Normal'), // Normal | High | Major | Critical
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const maintenanceActivities = pgTable('maintenance_activities', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  activityName: text('activity_name').notNull(),
  description: text('description').notNull(),
  scheduledDate: text('scheduled_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('Due'), // Delayed | Due | Planned | Performed
  completionDate: text('completion_date'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const repairActivities = pgTable('repair_activities', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  repairName: text('repair_name').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('Major'), // Minor | Normal | Major | Critical
  scheduledDate: text('scheduled_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('Due'), // Delayed | Due | In Progress | Performed
  completionDate: text('completion_date'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  notificationType: text('notification_type').notNull(), // Proposal | Confirmed booking | Service delayed | Maintenance due | Repair required | Performed | Booking cancelled
  message: text('message').notNull(),
  vehicleId: integer('vehicle_id').references(() => vehicles.id, {
    onDelete: 'set null',
  }),
  bookingId: integer('booking_id').references(() => bookings.id, {
    onDelete: 'set null',
  }),
  serviceCentre: text('service_centre').default('Scania Sverige AB / Jordbro'),
  serviceDate: text('service_date').default(''),
  isRead: boolean('is_read').notNull().default(false),
  isDismissed: boolean('is_dismissed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const serviceHistory = pgTable('service_history', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  bookingId: integer('booking_id').references(() => bookings.id, {
    onDelete: 'set null',
  }),
  serviceType: text('service_type').notNull(),
  description: text('description').notNull(),
  serviceDate: text('service_date').notNull(),
  odometerReading: integer('odometer_reading').notNull(),
  serviceCentre: text('service_centre').notNull(),
  status: text('status').notNull().default('Performed'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  bookings: many(bookings),
  maintenanceActivities: many(maintenanceActivities),
  repairActivities: many(repairActivities),
  notifications: many(notifications),
  serviceHistory: many(serviceHistory),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [bookings.vehicleId],
    references: [vehicles.id],
  }),
}));

export const maintenanceActivitiesRelations = relations(
  maintenanceActivities,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [maintenanceActivities.vehicleId],
      references: [vehicles.id],
    }),
  })
);

export const repairActivitiesRelations = relations(
  repairActivities,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [repairActivities.vehicleId],
      references: [vehicles.id],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [notifications.vehicleId],
    references: [vehicles.id],
  }),
  booking: one(bookings, {
    fields: [notifications.bookingId],
    references: [bookings.id],
  }),
}));

export const serviceHistoryRelations = relations(serviceHistory, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [serviceHistory.vehicleId],
    references: [vehicles.id],
  }),
  booking: one(bookings, {
    fields: [serviceHistory.bookingId],
    references: [bookings.id],
  }),
}));
