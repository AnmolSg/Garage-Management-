import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getAllVehicles,
  getVehicleDetailsById,
  createVehicleRecord,
  updateVehicleRecord,
  deleteVehicleRecord,
  getAllBookingsWithVehicles,
  getBookingById,
  createBookingRecord,
  updateBookingRecord,
  deleteBookingRecord,
  getMaintenanceForVehicle,
  createMaintenanceForVehicle,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  getRepairsForVehicle,
  createRepairForVehicle,
  updateRepairRecord,
  deleteRepairRecord,
  getAllNotifications,
  markNotificationAsRead,
  dismissNotificationById,
  dismissAllActiveNotifications,
  getDashboardSummaryData,
} from './src/db/fleetRepository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth user sync endpoint
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      res.json({
        uid: req.user?.uid,
        email: req.user?.email,
        name: req.user?.name || 'Fleet Operations Manager',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to verify user' });
    }
  });

  // Dashboard Summary
  app.get('/api/dashboard/summary', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const summary = await getDashboardSummaryData();
      res.json(summary);
    } catch (error: any) {
      console.error('Error in GET /api/dashboard/summary:', error);
      res.status(500).json({ error: error.message || 'Failed to load dashboard summary' });
    }
  });

  // Vehicles Endpoints
  app.get('/api/vehicles', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const list = await getAllVehicles();
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/vehicles:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch vehicles' });
    }
  });

  app.get('/api/vehicles/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const vehicle = await getVehicleDetailsById(id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error: any) {
      console.error('Error in GET /api/vehicles/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch vehicle details' });
    }
  });

  app.post('/api/vehicles', requireAuth, async (req: AuthRequest, res) => {
    try {
      const created = await createVehicleRecord(req.body);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error in POST /api/vehicles:', error);
      res.status(400).json({ error: error.message || 'Failed to create vehicle' });
    }
  });

  app.put('/api/vehicles/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await updateVehicleRecord(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/vehicles/:id:', error);
      res.status(400).json({ error: error.message || 'Failed to update vehicle' });
    }
  });

  app.delete('/api/vehicles/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await deleteVehicleRecord(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Error in DELETE /api/vehicles/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete vehicle' });
    }
  });

  // Bookings Endpoints
  app.get('/api/bookings', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const list = await getAllBookingsWithVehicles();
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/bookings:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch bookings' });
    }
  });

  app.get('/api/bookings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const booking = await getBookingById(id);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      res.json(booking);
    } catch (error: any) {
      console.error('Error in GET /api/bookings/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch booking' });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const created = await createBookingRecord(req.body);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error in POST /api/bookings:', error);
      res.status(400).json({ error: error.message || 'Failed to create booking' });
    }
  });

  app.put('/api/bookings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await updateBookingRecord(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/bookings/:id:', error);
      res.status(400).json({ error: error.message || 'Failed to update booking' });
    }
  });

  app.delete('/api/bookings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await deleteBookingRecord(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Error in DELETE /api/bookings/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete booking' });
    }
  });

  // Maintenance Endpoints
  app.get('/api/vehicles/:id/maintenance', requireAuth, async (req: AuthRequest, res) => {
    try {
      const vehicleId = Number(req.params.id);
      const list = await getMaintenanceForVehicle(vehicleId);
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/vehicles/:id/maintenance:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch maintenance activities' });
    }
  });

  app.post('/api/vehicles/:id/maintenance', requireAuth, async (req: AuthRequest, res) => {
    try {
      const vehicleId = Number(req.params.id);
      const created = await createMaintenanceForVehicle(vehicleId, req.body);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error in POST /api/vehicles/:id/maintenance:', error);
      res.status(400).json({ error: error.message || 'Failed to create maintenance activity' });
    }
  });

  app.put('/api/maintenance/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await updateMaintenanceRecord(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/maintenance/:id:', error);
      res.status(400).json({ error: error.message || 'Failed to update maintenance activity' });
    }
  });

  app.delete('/api/maintenance/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await deleteMaintenanceRecord(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Maintenance activity not found' });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Error in DELETE /api/maintenance/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete maintenance activity' });
    }
  });

  // Repairs Endpoints
  app.get('/api/vehicles/:id/repairs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const vehicleId = Number(req.params.id);
      const list = await getRepairsForVehicle(vehicleId);
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/vehicles/:id/repairs:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch repair activities' });
    }
  });

  app.post('/api/vehicles/:id/repairs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const vehicleId = Number(req.params.id);
      const created = await createRepairForVehicle(vehicleId, req.body);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error in POST /api/vehicles/:id/repairs:', error);
      res.status(400).json({ error: error.message || 'Failed to create repair activity' });
    }
  });

  app.put('/api/repairs/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await updateRepairRecord(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/repairs/:id:', error);
      res.status(400).json({ error: error.message || 'Failed to update repair activity' });
    }
  });

  app.delete('/api/repairs/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await deleteRepairRecord(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Repair activity not found' });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Error in DELETE /api/repairs/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete repair activity' });
    }
  });

  // Calendar Endpoints
  app.get('/api/calendar/events', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const events = await getAllBookingsWithVehicles();
      res.json(events);
    } catch (error: any) {
      console.error('Error in GET /api/calendar/events:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch calendar events' });
    }
  });

  app.post('/api/calendar/events', requireAuth, async (req: AuthRequest, res) => {
    try {
      const created = await createBookingRecord(req.body);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error in POST /api/calendar/events:', error);
      res.status(400).json({ error: error.message || 'Failed to create calendar event' });
    }
  });

  app.put('/api/calendar/events/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await updateBookingRecord(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/calendar/events/:id:', error);
      res.status(400).json({ error: error.message || 'Failed to update calendar event' });
    }
  });

  app.delete('/api/calendar/events/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await deleteBookingRecord(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Calendar event not found' });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Error in DELETE /api/calendar/events/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete calendar event' });
    }
  });

  // Notifications Endpoints
  app.get('/api/notifications', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const list = await getAllNotifications();
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/notifications:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
    }
  });

  app.put('/api/notifications/dismiss-all', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const result = await dismissAllActiveNotifications();
      res.json(result);
    } catch (error: any) {
      console.error('Error in PUT /api/notifications/dismiss-all:', error);
      res.status(500).json({ error: error.message || 'Failed to dismiss notifications' });
    }
  });

  app.put('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await markNotificationAsRead(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/notifications/:id/read:', error);
      res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
    }
  });

  app.put('/api/notifications/:id/dismiss', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await dismissNotificationById(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/notifications/:id/dismiss:', error);
      res.status(500).json({ error: error.message || 'Failed to dismiss notification' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fleet Service Planning Server running on http://localhost:${PORT}`);
  });
}

startServer();
