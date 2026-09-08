import { Vehicle, VehicleStatus } from '../../../vehicles/domain/entities/vehicle.entity';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { Driver, DriverStatus } from '../../../drivers/domain/entities/driver.entity';
import { IDriversRepository } from '../../../drivers/domain/repositories/drivers.repository';
import { ITripsRepository } from '../repositories/trips-repository.interface';

export interface GetTripAvailabilityInput {
  clientId?: string;
  ownerId?: string;
  excludeTripId?: string;
}

export interface GetTripAvailabilityOutput {
  vehicles: Vehicle[];
  drivers: Driver[];
}

export class GetTripAvailabilityUseCase {
  constructor(
    private readonly tripsRepository: ITripsRepository,
    private readonly vehiclesRepository: IVehiclesRepository,
    private readonly driversRepository: IDriversRepository,
  ) {}

  async execute(input: GetTripAvailabilityInput): Promise<GetTripAvailabilityOutput> {
    // 1. Busca todas as viagens que estão bloqueando recursos (PLANNED ou IN_PROGRESS)
    const activeTrips = await this.tripsRepository.findActiveTrips({
      clientId: input.clientId,
      ownerId: input.ownerId,
      excludeTripId: input.excludeTripId,
    });

    const busyVehicleIds = new Set(activeTrips.map((t) => t.getVehicleId()));
    const busyDriverIds = new Set(activeTrips.map((t) => t.getDriverId()));

    // 2. Busca veículos cadastrados com status AVAILABLE
    const { vehicles } = await this.vehiclesRepository.findManyPaginated({
      clientId: input.clientId,
      ownerId: input.ownerId,
      status: VehicleStatus.AVAILABLE,
      page: 1,
      limit: 1000,
    });

    // 3. Busca motoristas cadastrados com status ACTIVE
    const { drivers } = await this.driversRepository.findManyPaginated({
      clientId: input.clientId,
      ownerId: input.ownerId,
      status: DriverStatus.ACTIVE,
      page: 1,
      limit: 1000,
    });

    // 4. Filtra recursos que não estejam comprometidos em viagens ativas/programadas
    const availableVehicles = vehicles.filter((v) => !busyVehicleIds.has(v.getId()));
    const availableDrivers = drivers.filter((d) => !busyDriverIds.has(d.getId()));

    return {
      vehicles: availableVehicles,
      drivers: availableDrivers,
    };
  }
}
