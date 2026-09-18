export interface CycleFuelingRecord {
  id: string;
  vehicleId: string;
  driverId?: string;
  driverName?: string;
  fueledAt: Date;
  odometerAtFueling: number;
  liters: number;
  pricePerUnit: number;
  totalCost: number;
  fuelType: string;
  gasStation?: string | null;
  fullTank: boolean;
}

export interface CycleAnomaly {
  type: 'ODOMETER_INCONSISTENT' | 'ZERO_DISTANCE' | 'OUT_OF_BOUNDS_CONSUMPTION';
  vehicleId: string;
  vehiclePlate?: string;
  title: string;
  description: string;
  startRecordId?: string;
  endRecordId?: string;
  startOdometer?: number;
  endOdometer?: number;
  differenceKm?: number;
  recordedAt: Date;
}

export interface FuelConsumptionCycle {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  startFuelRecordId: string;
  endFuelRecordId: string;
  startDate: Date;
  endDate: Date;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  fuelConsumed: number;
  totalCost: number;
  averagePricePerUnit: number;
  kmPerLiter: number;
  costPerKm: number;
  costPer100Km: number;
  fuelType: string;
  fullTankFuelingsCount: number;
  partialFuelingsCount: number;
  intermediateFuelings: CycleFuelingRecord[];
  startFueling: CycleFuelingRecord;
  closingFueling: CycleFuelingRecord;
}

