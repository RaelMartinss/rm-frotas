export interface TripWaypointInput {
  order?: number;
  type: 'FUEL' | 'REST' | 'STOP';
  title: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

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
  waypoints?: TripWaypointInput[];
}