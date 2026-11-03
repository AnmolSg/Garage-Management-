import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Wrench,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  Vehicle,
  Booking,
  VEHICLE_CATEGORIES,
  SERVICE_CENTRES,
  VehicleCategory,
  resolveVehicleImage,
} from '../types/fleet.ts';

interface BookServiceWizardProps {
  isOpen: boolean;
  vehicles: Vehicle[];
  existingBookings: Booking[];
  prefillVehicleId?: number;
  onClose: () => void;
  onSubmitBooking: (payload: Partial<Booking>) => Promise<void>;
}

const SERVICE_TYPES = [
  {
    id: 'Preventive Maintenance',
    desc: 'Proactive scheduled chassis, driveline, and fluid preventive care',
  },
  {
    id: 'Scheduled Maintenance',
    desc: 'Flexible maintenance plan interval (S, M, or X inspection)',
  },
  {
    id: 'General Repair',
    desc: 'Mechanical, electrical, or auxiliary system fault resolution',
  },
  {
    id: 'Emergency Repair',
    desc: 'Urgent workshop bay allocation for critical operational faults',
  },
  {
    id: 'Inspection',
    desc: 'Statutory roadworthiness, ADR, tachograph, or tail-lift inspection',
  },
  {
    id: 'Other',
    desc: 'Custom bodywork, tyre service, or fleet accessory installation',
  },
];

export const BookServiceWizard: React.FC<BookServiceWizardProps> = ({
  isOpen,
  vehicles,
  existingBookings,
  prefillVehicleId,
  onClose,
  onSubmitBooking,
}) => {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] =
    useState<VehicleCategory>('Container Truck');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );
  const [serviceType, setServiceType] = useState<string>(
    'Preventive Maintenance'
  );
  const [serviceDescription, setServiceDescription] = useState<string>(
    'Flexible maintenance, M inspection, X inspection'
  );
  const [priority, setPriority] = useState<string>('Normal');
  const [serviceCentre, setServiceCentre] = useState<string>(
    SERVICE_CENTRES[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>('2026-11-05');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (prefillVehicleId) {
        const v = vehicles.find((item) => item.id === prefillVehicleId);
        if (v) {
          setSelectedCategory(v.vehicleType as VehicleCategory);
          setSelectedVehicleId(v.id);
          setServiceDescription(v.maintenancePlan);
          setServiceCentre(v.assignedGarage || SERVICE_CENTRES[0]);
          setStep(3);
          return;
        }
      }
      setStep(1);
      const firstCat = VEHICLE_CATEGORIES[0].id;
      setSelectedCategory(firstCat);
      const matching = vehicles.filter((v) => v.vehicleType === firstCat);
      setSelectedVehicleId(matching[0]?.id || vehicles[0]?.id || null);
    }
  }, [isOpen, prefillVehicleId, vehicles]);

  const categoryVehicles = useMemo(
    () => vehicles.filter((v) => v.vehicleType === selectedCategory),
    [vehicles, selectedCategory]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const detectedConflict = useMemo(() => {
    if (!selectedVehicleId || !appointmentDate) return null;
    return existingBookings.find((b) => {
      if (b.vehicleId !== selectedVehicleId) return false;
      if (b.bookingStatus === 'Cancelled') return false;
      if (b.appointmentDate !== appointmentDate) return false;
      return startTime < b.endTime && endTime > b.startTime;
    });
  }, [
    existingBookings,
    selectedVehicleId,
    appointmentDate,
    startTime,
    endTime,
  ]);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: VehicleCategory) => {
    setSelectedCategory(cat);
    const matching = vehicles.filter((v) => v.vehicleType === cat);
    if (matching.length > 0) {
      setSelectedVehicleId(matching[0].id);
      setServiceDescription(matching[0].maintenancePlan);
      setServiceCentre(matching[0].assignedGarage || SERVICE_CENTRES[0]);
    } else {
      setSelectedVehicleId(null);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedVehicleId) {
      setError('Please select a vehicle.');
      return;
    }
    if (detectedConflict) {
      setError(
        `Time conflict with existing ${detectedConflict.bookingStatus} appointment (${detectedConflict.startTime} - ${detectedConflict.endTime}).`
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitBooking({
        vehicleId: selectedVehicleId,
        serviceType,
        serviceDescription,
        bookingStatus: 'Preliminary',
        appointmentDate,
        startTime,
        endTime,
        serviceCentre,
        priority,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit booking request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-md border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#041E42] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold tracking-wide">
              Book a Service — Step {step} of 6
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="grid grid-cols-6 gap-2">
            {[
              '1. Category',
              '2. Vehicle',
              '3. Type',
              '4. Details',
              '5. Schedule',
              '6. Review',
            ].map((label, idx) => {
              const stepNum = idx + 1;
              const isCurrent = step === stepNum;
              const isDone = step > stepNum;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (stepNum < step) setStep(stepNum);
                  }}
                  className={`text-[11px] font-semibold py-1 px-1.5 rounded text-center truncate transition-colors ${
                    isCurrent
                      ? 'bg-[#0A3264] text-white'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer'
                      : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="p-6 min-h-[320px] flex flex-col justify-between text-xs">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select Vehicle Category */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 1: Select Vehicle Category
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Choose one of the six commercial vehicle categories below.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {VEHICLE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const unitCount = vehicles.filter(
                    (v) => v.vehicleType === cat.id
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`p-3.5 rounded border text-center flex flex-col items-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0A3264] bg-blue-50/50 ring-1 ring-[#0A3264]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
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
                      <span className="font-bold text-slate-900 mt-2">
                        {cat.label}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        {unitCount} registered
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Select Vehicle */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 2: Select Registered {selectedCategory}
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Select the commercial vehicle requiring maintenance or repair.
                </p>
              </div>

              {categoryVehicles.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded border border-slate-200 text-slate-600">
                  No registered vehicles in {selectedCategory}. Please select another category.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {categoryVehicles.map((v) => {
                    const isSelected = selectedVehicleId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId(v.id);
                          setServiceDescription(v.maintenancePlan);
                          setServiceCentre(
                            v.assignedGarage || SERVICE_CENTRES[0]
                          );
                        }}
                        className={`p-3.5 rounded border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#0A3264] bg-blue-50/50 ring-1 ring-[#0A3264]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <img
                          src={resolveVehicleImage(v.imagePath, v.vehicleType)}
                          alt={v.vehicleType}
                          referrerPolicy="no-referrer"
                          className="w-16 h-12 object-contain bg-slate-100 rounded p-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold font-mono text-slate-900">
                            {v.registrationNumber}
                          </div>
                          <div className="text-slate-600 truncate">
                            {v.manufacturer} {v.model} ({v.manufacturingYear})
                          </div>
                          <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                            {v.odometer.toLocaleString()} km · {v.assignedGarage}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Select Service Type */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 3: Select Service Type
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Choose the primary workshop service category for{' '}
                  <span className="font-mono font-bold text-slate-800">
                    {selectedVehicle?.registrationNumber}
                  </span>
                  .
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICE_TYPES.map((st) => {
                  const isSelected = serviceType === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setServiceType(st.id)}
                      className={`p-3.5 rounded border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0A3264] bg-blue-50/50 ring-1 ring-[#0A3264]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-slate-900">{st.id}</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {st.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Enter Service Details */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 4: Enter Service Details
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Specify the maintenance scope, priority level, and preferred garage.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Service Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    placeholder="e.g. Flexible maintenance, M inspection, X inspection"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Major">Major</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Garage / Service Centre
                    </label>
                    <select
                      value={serviceCentre}
                      onChange={(e) => setServiceCentre(e.target.value)}
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
                    Additional Notes for Workshop Technician
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Driver observations, fault codes, or part requests..."
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Select Date and Time */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 5: Select Preferred Date & Time
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Choose an appointment window. Overlapping slots for the same vehicle are automatically validated.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 tabular-nums"
                  />
                </div>
              </div>

              {detectedConflict ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded text-red-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Booking Conflict Detected</div>
                    <p className="mt-0.5">
                      Vehicle{' '}
                      <span className="font-mono font-bold">
                        {selectedVehicle?.registrationNumber}
                      </span>{' '}
                      already has a{' '}
                      <span className="font-semibold">
                        {detectedConflict.bookingStatus}
                      </span>{' '}
                      appointment on {detectedConflict.appointmentDate} from{' '}
                      {detectedConflict.startTime} to {detectedConflict.endTime}. Please pick a different date or time slot.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    Selected slot ({appointmentDate}, {startTime} – {endTime}) is available for{' '}
                    <strong className="font-mono">
                      {selectedVehicle?.registrationNumber}
                    </strong>
                    .
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Review and Submit */}
          {step === 6 && selectedVehicle && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 6: Review and Submit Booking Request
                </h4>
                <p className="text-slate-500 mt-0.5">
                  New requests will appear under Preliminary Bookings awaiting workshop approval.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
                <div className="flex items-center gap-4 pb-3 border-b border-slate-200">
                  <img
                    src={resolveVehicleImage(
                      selectedVehicle.imagePath,
                      selectedVehicle.vehicleType
                    )}
                    alt={selectedVehicle.vehicleType}
                    referrerPolicy="no-referrer"
                    className="w-20 h-14 object-contain bg-white border border-slate-200 rounded p-1"
                  />
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900">
                      {selectedVehicle.registrationNumber}
                    </div>
                    <div className="text-slate-600">
                      {selectedVehicle.manufacturer} {selectedVehicle.model} ·{' '}
                      {selectedVehicle.vehicleType}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      Odometer: {selectedVehicle.odometer.toLocaleString()} km
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Service Type</span>
                    <span className="font-bold text-slate-900">
                      {serviceType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Priority</span>
                    <span className="font-bold text-slate-900">{priority}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date & Time
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {appointmentDate} ({startTime} – {endTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Service Centre
                    </span>
                    <span className="font-bold text-slate-900">
                      {serviceCentre}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">
                    Service Description
                  </span>
                  <span className="font-medium text-slate-800">
                    {serviceDescription}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="pt-5 mt-5 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
              className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{step === 1 ? 'Cancel' : 'Back'}</span>
            </button>

            {step < 6 ? (
              <button
                type="button"
                disabled={
                  (step === 2 && !selectedVehicleId) ||
                  (step === 4 && !serviceDescription.trim()) ||
                  (step === 5 && !!detectedConflict)
                }
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1 px-5 py-2 text-xs font-semibold text-white bg-[#0A3264] hover:bg-[#041E42] disabled:opacity-40 rounded cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || !!detectedConflict}
                onClick={handleFinalSubmit}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {submitting ? 'Submitting Booking...' : 'Submit Booking Request'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
