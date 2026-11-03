import { db } from './index.ts';
import {
  vehicles,
  bookings,
  maintenanceActivities,
  repairActivities,
  notifications,
  serviceHistory,
} from './schema.ts';
import { eq, desc, and, ne } from 'drizzle-orm';

export async function getAllVehicles() {
  try {
    return await db.select().from(vehicles).orderBy(desc(vehicles.id));
  } catch (error) {
    console.error('Database query failed in getAllVehicles:', error);
    throw new Error('Failed to fetch vehicles from database.', { cause: error });
  }
}

export async function getVehicleDetailsById(id: number) {
  try {
    const vehicleRows = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));
    if (!vehicleRows.length) return null;
    const vehicle = vehicleRows[0];

    const [vehicleBookings, vehicleMaintenance, vehicleRepairs, vehicleHistory] =
      await Promise.all([
        db
          .select()
          .from(bookings)
          .where(eq(bookings.vehicleId, id))
          .orderBy(desc(bookings.appointmentDate)),
        db
          .select()
          .from(maintenanceActivities)
          .where(eq(maintenanceActivities.vehicleId, id))
          .orderBy(desc(maintenanceActivities.scheduledDate)),
        db
          .select()
          .from(repairActivities)
          .where(eq(repairActivities.vehicleId, id))
          .orderBy(desc(repairActivities.scheduledDate)),
        db
          .select()
          .from(serviceHistory)
          .where(eq(serviceHistory.vehicleId, id))
          .orderBy(desc(serviceHistory.serviceDate)),
      ]);

    return {
      ...vehicle,
      bookings: vehicleBookings,
      maintenanceActivities: vehicleMaintenance,
      repairActivities: vehicleRepairs,
      serviceHistory: vehicleHistory,
    };
  } catch (error) {
    console.error('Database query failed in getVehicleDetailsById:', error);
    throw new Error('Failed to fetch vehicle profile details.', { cause: error });
  }
}

export async function createVehicleRecord(data: {
  registrationNumber: string;
  vehicleType: string;
  equipmentGroup?: string;
  manufacturer: string;
  model: string;
  manufacturingYear: number;
  odometer: number;
  engineRunningHours: number;
  imagePath: string;
  maintenancePlan: string;
  nextServiceDate: string;
  assignedGarage: string;
  notes?: string;
}) {
  try {
    const normalizedReg = data.registrationNumber.trim().toUpperCase();
    const existing = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.registrationNumber, normalizedReg));
    if (existing.length > 0) {
      throw new Error(`Vehicle with registration number ${normalizedReg} already exists.`);
    }

    const inserted = await db
      .insert(vehicles)
      .values({
        registrationNumber: normalizedReg,
        vehicleType: data.vehicleType,
        equipmentGroup: data.equipmentGroup || 'Heavy Haulage',
        manufacturer: data.manufacturer,
        model: data.model,
        manufacturingYear: Number(data.manufacturingYear),
        odometer: Number(data.odometer),
        engineRunningHours: Number(data.engineRunningHours),
        imagePath: data.imagePath,
        maintenancePlan: data.maintenancePlan,
        nextServiceDate: data.nextServiceDate,
        assignedGarage: data.assignedGarage || 'Scania Sverige AB / Jordbro',
        notes: data.notes || '',
      })
      .returning();

    const newVehicle = inserted[0];

    // Create an initial scheduled maintenance activity and unbooked service event so it appears on dashboard & calendar
    const initialBooking = await db
      .insert(bookings)
      .values({
        vehicleId: newVehicle.id,
        serviceType: 'Scheduled Maintenance',
        serviceDescription: data.maintenancePlan,
        bookingStatus: 'Due',
        appointmentDate: data.nextServiceDate,
        startTime: '08:00',
        endTime: '11:30',
        serviceCentre: data.assignedGarage || 'Scania Sverige AB / Jordbro',
        priority: 'Normal',
        notes: data.notes || 'Initial scheduled maintenance plan.',
      })
      .returning();

    await db.insert(maintenanceActivities).values({
      vehicleId: newVehicle.id,
      activityName: data.maintenancePlan,
      description: `Scheduled ${data.maintenancePlan}`,
      scheduledDate: data.nextServiceDate,
      status: 'Due',
      notes: 'Automatically scheduled upon fleet registration',
    });

    await db.insert(notifications).values({
      notificationType: 'Maintenance due',
      message: `Vehicle ${newVehicle.registrationNumber} (${newVehicle.manufacturer} ${newVehicle.model}) registered with next service on ${newVehicle.nextServiceDate}.`,
      vehicleId: newVehicle.id,
      bookingId: initialBooking[0]?.id ?? null,
      serviceCentre: newVehicle.assignedGarage,
      serviceDate: `${newVehicle.nextServiceDate} 08:00`,
      isRead: false,
      isDismissed: false,
    });

    return newVehicle;
  } catch (error: any) {
    console.error('Database query failed in createVehicleRecord:', error);
    throw new Error(error.message || 'Failed to register vehicle.', { cause: error });
  }
}

export async function updateVehicleRecord(
  id: number,
  data: Partial<{
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
  }>
) {
  try {
    if (data.registrationNumber) {
      const normalized = data.registrationNumber.trim().toUpperCase();
      const conflict = await db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.registrationNumber, normalized),
            ne(vehicles.id, id)
          )
        );
      if (conflict.length > 0) {
        throw new Error(`Registration number ${normalized} is already assigned to another vehicle.`);
      }
      data.registrationNumber = normalized;
    }

    const updated = await db
      .update(vehicles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id))
      .returning();

    return updated[0] || null;
  } catch (error: any) {
    console.error('Database query failed in updateVehicleRecord:', error);
    throw new Error(error.message || 'Failed to update vehicle.', { cause: error });
  }
}

export async function deleteVehicleRecord(id: number) {
  try {
    const deleted = await db
      .delete(vehicles)
      .where(eq(vehicles.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database query failed in deleteVehicleRecord:', error);
    throw new Error('Failed to delete vehicle.', { cause: error });
  }
}

export async function checkAppointmentConflict(
  vehicleId: number,
  appointmentDate: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: number
) {
  try {
    const existing = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.vehicleId, vehicleId),
          eq(bookings.appointmentDate, appointmentDate),
          ne(bookings.bookingStatus, 'Cancelled')
        )
      );

    for (const b of existing) {
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (startTime < b.endTime && endTime > b.startTime) {
        return b;
      }
    }
    return null;
  } catch (error) {
    console.error('Database query failed in checkAppointmentConflict:', error);
    throw new Error('Failed to check booking conflicts.', { cause: error });
  }
}

export async function getAllBookingsWithVehicles() {
  try {
    const rows = await db
      .select({
        booking: bookings,
        vehicle: vehicles,
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .orderBy(desc(bookings.appointmentDate));

    return rows.map(({ booking, vehicle }) => ({
      ...booking,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      equipmentGroup: vehicle.equipmentGroup,
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      imagePath: vehicle.imagePath,
      maintenancePlan: vehicle.maintenancePlan,
      odometer: vehicle.odometer,
    }));
  } catch (error) {
    console.error('Database query failed in getAllBookingsWithVehicles:', error);
    throw new Error('Failed to fetch service bookings.', { cause: error });
  }
}

export async function getBookingById(id: number) {
  try {
    const rows = await db
      .select({
        booking: bookings,
        vehicle: vehicles,
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .where(eq(bookings.id, id));

    if (!rows.length) return null;
    const { booking, vehicle } = rows[0];
    return {
      ...booking,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      equipmentGroup: vehicle.equipmentGroup,
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      imagePath: vehicle.imagePath,
      maintenancePlan: vehicle.maintenancePlan,
    };
  } catch (error) {
    console.error('Database query failed in getBookingById:', error);
    throw new Error('Failed to fetch booking record.', { cause: error });
  }
}

export async function createBookingRecord(data: {
  vehicleId: number;
  serviceType: string;
  serviceDescription: string;
  bookingStatus?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  serviceCentre: string;
  priority?: string;
  notes?: string;
}) {
  try {
    const conflict = await checkAppointmentConflict(
      Number(data.vehicleId),
      data.appointmentDate,
      data.startTime,
      data.endTime
    );
    if (conflict) {
      throw new Error(
        `Booking conflict detected: Vehicle already has a ${conflict.bookingStatus} appointment on ${data.appointmentDate} from ${conflict.startTime} to ${conflict.endTime}.`
      );
    }

    const status = data.bookingStatus || 'Preliminary';
    const inserted = await db
      .insert(bookings)
      .values({
        vehicleId: Number(data.vehicleId),
        serviceType: data.serviceType,
        serviceDescription: data.serviceDescription,
        bookingStatus: status,
        appointmentDate: data.appointmentDate,
        startTime: data.startTime || '08:00',
        endTime: data.endTime || '11:30',
        serviceCentre: data.serviceCentre || 'Scania Sverige AB / Jordbro',
        priority: data.priority || 'Normal',
        notes: data.notes || '',
      })
      .returning();

    const created = inserted[0];
    const vehRows = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, Number(data.vehicleId)));
    const veh = vehRows[0];

    if (veh) {
      const notifType =
        status === 'Preliminary'
          ? 'Proposal'
          : status === 'Confirmed'
          ? 'Confirmed booking'
          : 'Maintenance due';
      await db.insert(notifications).values({
        notificationType: notifType,
        message: `${created.serviceCentre} has created a ${status.toLowerCase()} booking for ${veh.registrationNumber}. The booked time is ${created.appointmentDate} ${created.startTime}.`,
        vehicleId: veh.id,
        bookingId: created.id,
        serviceCentre: created.serviceCentre,
        serviceDate: `${created.appointmentDate} ${created.startTime}`,
        isRead: false,
        isDismissed: false,
      });
    }

    return created;
  } catch (error: any) {
    console.error('Database query failed in createBookingRecord:', error);
    throw new Error(error.message || 'Failed to create booking.', { cause: error });
  }
}

export async function updateBookingRecord(
  id: number,
  data: Partial<{
    serviceType: string;
    serviceDescription: string;
    bookingStatus: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    serviceCentre: string;
    priority: string;
    notes: string;
  }>
) {
  try {
    const existingRows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    if (!existingRows.length) {
      throw new Error('Booking not found.');
    }
    const existing = existingRows[0];

    const targetDate = data.appointmentDate ?? existing.appointmentDate;
    const targetStart = data.startTime ?? existing.startTime;
    const targetEnd = data.endTime ?? existing.endTime;

    if (
      data.appointmentDate !== undefined ||
      data.startTime !== undefined ||
      data.endTime !== undefined
    ) {
      const conflict = await checkAppointmentConflict(
        existing.vehicleId,
        targetDate,
        targetStart,
        targetEnd,
        id
      );
      if (conflict) {
        throw new Error(
          `Booking conflict detected: Vehicle already has an appointment on ${targetDate} (${conflict.startTime} - ${conflict.endTime}).`
        );
      }
    }

    const updatedRows = await db
      .update(bookings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    const updated = updatedRows[0];

    const vehRows = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, existing.vehicleId));
    const veh = vehRows[0];

    if (data.bookingStatus && data.bookingStatus !== existing.bookingStatus && veh) {
      if (data.bookingStatus === 'Confirmed') {
        await db.insert(notifications).values({
          notificationType: 'Confirmed booking',
          message: `${updated.serviceCentre} has confirmed a booking for ${veh.registrationNumber}. The booked time is ${updated.appointmentDate} ${updated.startTime}.`,
          vehicleId: veh.id,
          bookingId: updated.id,
          serviceCentre: updated.serviceCentre,
          serviceDate: `${updated.appointmentDate} ${updated.startTime}`,
          isRead: false,
          isDismissed: false,
        });
      } else if (data.bookingStatus === 'Performed') {
        await db.insert(serviceHistory).values({
          vehicleId: veh.id,
          bookingId: updated.id,
          serviceType: updated.serviceType,
          description: updated.serviceDescription,
          serviceDate: updated.appointmentDate,
          odometerReading: veh.odometer,
          serviceCentre: updated.serviceCentre,
          status: 'Performed',
        });

        await db.insert(notifications).values({
          notificationType: 'Performed',
          message: `${updated.serviceCentre} has reported that a service event has been performed for ${veh.registrationNumber}.`,
          vehicleId: veh.id,
          bookingId: updated.id,
          serviceCentre: updated.serviceCentre,
          serviceDate: `${updated.appointmentDate} ${updated.endTime}`,
          isRead: false,
          isDismissed: false,
        });
      } else if (data.bookingStatus === 'Cancelled') {
        await db.insert(notifications).values({
          notificationType: 'Booking cancelled',
          message: `Booking for ${veh.registrationNumber} on ${updated.appointmentDate} at ${updated.serviceCentre} was cancelled.`,
          vehicleId: veh.id,
          bookingId: updated.id,
          serviceCentre: updated.serviceCentre,
          serviceDate: `${updated.appointmentDate} ${updated.startTime}`,
          isRead: false,
          isDismissed: false,
        });
      }
    }

    return updated;
  } catch (error: any) {
    console.error('Database query failed in updateBookingRecord:', error);
    throw new Error(error.message || 'Failed to update booking.', { cause: error });
  }
}

export async function deleteBookingRecord(id: number) {
  try {
    const deleted = await db
      .delete(bookings)
      .where(eq(bookings.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database query failed in deleteBookingRecord:', error);
    throw new Error('Failed to delete booking.', { cause: error });
  }
}

// Maintenance Activities
export async function getMaintenanceForVehicle(vehicleId: number) {
  try {
    return await db
      .select()
      .from(maintenanceActivities)
      .where(eq(maintenanceActivities.vehicleId, vehicleId))
      .orderBy(desc(maintenanceActivities.scheduledDate));
  } catch (error) {
    console.error('Database query failed in getMaintenanceForVehicle:', error);
    throw new Error('Failed to fetch maintenance activities.', { cause: error });
  }
}

export async function createMaintenanceForVehicle(
  vehicleId: number,
  data: {
    activityName: string;
    description?: string;
    scheduledDate: string;
    status?: string;
    notes?: string;
  }
) {
  try {
    const inserted = await db
      .insert(maintenanceActivities)
      .values({
        vehicleId,
        activityName: data.activityName,
        description: data.description || data.activityName,
        scheduledDate: data.scheduledDate,
        status: data.status || 'Due',
        notes: data.notes || '',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createMaintenanceForVehicle:', error);
    throw new Error('Failed to create maintenance activity.', { cause: error });
  }
}

export async function updateMaintenanceRecord(
  id: number,
  data: Partial<{
    activityName: string;
    description: string;
    scheduledDate: string;
    status: string;
    completionDate: string | null;
    notes: string;
  }>
) {
  try {
    const existingRows = await db
      .select()
      .from(maintenanceActivities)
      .where(eq(maintenanceActivities.id, id));
    if (!existingRows.length) throw new Error('Maintenance activity not found.');
    const existing = existingRows[0];

    const completionDate =
      data.status === 'Performed'
        ? new Date().toISOString().split('T')[0]
        : data.completionDate ?? existing.completionDate;

    const updatedRows = await db
      .update(maintenanceActivities)
      .set({
        ...data,
        completionDate,
      })
      .where(eq(maintenanceActivities.id, id))
      .returning();

    const updated = updatedRows[0];

    if (data.status === 'Performed' && existing.status !== 'Performed') {
      const vehRows = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, existing.vehicleId));
      const veh = vehRows[0];
      if (veh) {
        await db.insert(serviceHistory).values({
          vehicleId: veh.id,
          serviceType: 'Maintenance',
          description: `${updated.activityName} — ${updated.description}`,
          serviceDate: completionDate || new Date().toISOString().split('T')[0],
          odometerReading: veh.odometer,
          serviceCentre: veh.assignedGarage,
          status: 'Performed',
        });
      }
    }

    return updated;
  } catch (error: any) {
    console.error('Database query failed in updateMaintenanceRecord:', error);
    throw new Error(error.message || 'Failed to update maintenance activity.', {
      cause: error,
    });
  }
}

export async function deleteMaintenanceRecord(id: number) {
  try {
    const deleted = await db
      .delete(maintenanceActivities)
      .where(eq(maintenanceActivities.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database query failed in deleteMaintenanceRecord:', error);
    throw new Error('Failed to delete maintenance activity.', { cause: error });
  }
}

// Repair Activities
export async function getRepairsForVehicle(vehicleId: number) {
  try {
    return await db
      .select()
      .from(repairActivities)
      .where(eq(repairActivities.vehicleId, vehicleId))
      .orderBy(desc(repairActivities.scheduledDate));
  } catch (error) {
    console.error('Database query failed in getRepairsForVehicle:', error);
    throw new Error('Failed to fetch repair activities.', { cause: error });
  }
}

export async function createRepairForVehicle(
  vehicleId: number,
  data: {
    repairName: string;
    description?: string;
    priority?: string;
    scheduledDate: string;
    status?: string;
    notes?: string;
  }
) {
  try {
    const inserted = await db
      .insert(repairActivities)
      .values({
        vehicleId,
        repairName: data.repairName,
        description: data.description || data.repairName,
        priority: data.priority || 'Major',
        scheduledDate: data.scheduledDate,
        status: data.status || 'Due',
        notes: data.notes || '',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createRepairForVehicle:', error);
    throw new Error('Failed to create repair activity.', { cause: error });
  }
}

export async function updateRepairRecord(
  id: number,
  data: Partial<{
    repairName: string;
    description: string;
    priority: string;
    scheduledDate: string;
    status: string;
    completionDate: string | null;
    notes: string;
  }>
) {
  try {
    const existingRows = await db
      .select()
      .from(repairActivities)
      .where(eq(repairActivities.id, id));
    if (!existingRows.length) throw new Error('Repair activity not found.');
    const existing = existingRows[0];

    const completionDate =
      data.status === 'Performed'
        ? new Date().toISOString().split('T')[0]
        : data.completionDate ?? existing.completionDate;

    const updatedRows = await db
      .update(repairActivities)
      .set({
        ...data,
        completionDate,
      })
      .where(eq(repairActivities.id, id))
      .returning();

    const updated = updatedRows[0];

    if (data.status === 'Performed' && existing.status !== 'Performed') {
      const vehRows = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, existing.vehicleId));
      const veh = vehRows[0];
      if (veh) {
        await db.insert(serviceHistory).values({
          vehicleId: veh.id,
          serviceType: 'Repair',
          description: `${updated.repairName} (${updated.priority}) — ${updated.description}`,
          serviceDate: completionDate || new Date().toISOString().split('T')[0],
          odometerReading: veh.odometer,
          serviceCentre: veh.assignedGarage,
          status: 'Performed',
        });
      }
    }

    return updated;
  } catch (error: any) {
    console.error('Database query failed in updateRepairRecord:', error);
    throw new Error(error.message || 'Failed to update repair activity.', {
      cause: error,
    });
  }
}

export async function deleteRepairRecord(id: number) {
  try {
    const deleted = await db
      .delete(repairActivities)
      .where(eq(repairActivities.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database query failed in deleteRepairRecord:', error);
    throw new Error('Failed to delete repair activity.', { cause: error });
  }
}

// Notifications
export async function getAllNotifications() {
  try {
    const rows = await db
      .select({
        notification: notifications,
        vehicle: vehicles,
      })
      .from(notifications)
      .leftJoin(vehicles, eq(notifications.vehicleId, vehicles.id))
      .orderBy(desc(notifications.createdAt));

    return rows.map(({ notification, vehicle }) => ({
      ...notification,
      registrationNumber: vehicle?.registrationNumber || 'FLEET',
      vehicleModel: vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : '',
    }));
  } catch (error) {
    console.error('Database query failed in getAllNotifications:', error);
    throw new Error('Failed to fetch notifications.', { cause: error });
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    const updated = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Database query failed in markNotificationAsRead:', error);
    throw new Error('Failed to mark notification as read.', { cause: error });
  }
}

export async function dismissNotificationById(id: number) {
  try {
    const updated = await db
      .update(notifications)
      .set({ isDismissed: true, isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Database query failed in dismissNotificationById:', error);
    throw new Error('Failed to dismiss notification.', { cause: error });
  }
}

export async function dismissAllActiveNotifications() {
  try {
    await db
      .update(notifications)
      .set({ isDismissed: true, isRead: true })
      .where(eq(notifications.isDismissed, false));
    return { success: true };
  } catch (error) {
    console.error('Database query failed in dismissAllActiveNotifications:', error);
    throw new Error('Failed to dismiss all notifications.', { cause: error });
  }
}

// Dashboard Summary
export async function getDashboardSummaryData() {
  try {
    const [allBookings, allNotifications, allVehicles] = await Promise.all([
      getAllBookingsWithVehicles(),
      getAllNotifications(),
      getAllVehicles(),
    ]);

    const serviceEventsToBook = allBookings.filter((b) =>
      ['Delayed', 'Due', 'Planned'].includes(b.bookingStatus)
    );
    const preliminaryBookings = allBookings.filter(
      (b) => b.bookingStatus === 'Preliminary'
    );
    const confirmedBookings = allBookings.filter(
      (b) => b.bookingStatus === 'Confirmed'
    );
    const inProgressBookings = allBookings.filter(
      (b) => b.bookingStatus === 'In Progress'
    );

    const equipmentGroups = Array.from(
      new Set(allVehicles.map((v) => v.equipmentGroup).filter(Boolean))
    );

    return {
      counts: {
        serviceEventsToBook: serviceEventsToBook.length,
        preliminaryBookings: preliminaryBookings.length,
        confirmedBookings: confirmedBookings.length,
        inProgress: inProgressBookings.length,
        unreadNotifications: allNotifications.filter(
          (n) => !n.isRead && !n.isDismissed
        ).length,
      },
      columns: {
        serviceEventsToBook,
        preliminaryBookings,
        confirmedBookings,
        inProgressBookings,
      },
      notifications: allNotifications,
      equipmentGroups,
      totalVehicles: allVehicles.length,
    };
  } catch (error) {
    console.error('Database query failed in getDashboardSummaryData:', error);
    throw new Error('Failed to load dashboard summary.', { cause: error });
  }
}
