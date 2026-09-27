export interface CreateTripInput {
  driverId: string;
  vehicleId: string;
  clientId?: string;
  scheduledDate?: Date | string | null;
  estimatedArrivalDate?: Date | string | null;
  notes?: string | null;
  origin: {
    address: string;
    city: string;
    state: string;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    address: string;
    city: string;
    state: string;
    latitude?: number;
    longitude?: number;
  };
}