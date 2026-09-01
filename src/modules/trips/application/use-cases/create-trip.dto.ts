export interface CreateTripInput {
  driverId: string;
  vehicleId: string;
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