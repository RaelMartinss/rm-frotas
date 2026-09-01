import { Location } from '../../domain/value-objects/location.vo';
import { Trip } from '../../domain/entities/trip.entity';
import { CreateTripInput } from './create-trip.dto';
import { DriverNotAvailableException } from '../exceptions/driver-not-available.exception';
import { VehicleNotAvailableException } from '../exceptions/vehicle-not-available.exception';
import { DriverStatus } from '../../../drivers/domain/entities/driver-status.enum';
import { VehicleStatus } from '../../../vehicles/domain/entities/vehicle.entity';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { IDriversRepository } from '../../../drivers/domain/repositories/drivers.repository';
import { ITripsRepository } from '../repositories/trips-repository.interface';



export class CreateTripUseCase {
  constructor(
    private readonly tripRepository: ITripsRepository,
    private readonly driverRepository: IDriversRepository,
    private readonly vehicleRepository: IVehiclesRepository,
  ) {}

  async execute(input: CreateTripInput): Promise<Trip> {
    // 1. Valida se o motorista existe e está ACTIVE
    const driver = await this.driverRepository.findById(input.driverId);
    if (!driver || driver.getStatus() !== DriverStatus.ACTIVE) {
      throw new DriverNotAvailableException('Motorista não encontrado ou inativo.');
    }

    // 2. Valida se o motorista já está em uma viagem ativa (em andamento)
    const activeDriverTrip = await this.tripRepository.findActiveByDriverId(input.driverId);
    if (activeDriverTrip) {
      throw new DriverNotAvailableException('O motorista já está em uma viagem ativa.');
    }

    // 3. Valida se o veículo existe e está AVAILABLE
    const vehicle = await this.vehicleRepository.findById(input.vehicleId);
    if (!vehicle || vehicle.getStatus() !== VehicleStatus.AVAILABLE) {
      throw new VehicleNotAvailableException('Veículo não encontrado ou indisponível.');
    }

    // 4. Valida se o veículo já está alocado em outra viagem ativa
    const activeVehicleTrip = await this.tripRepository.findActiveByVehicleId(input.vehicleId);
    if (activeVehicleTrip) {
      throw new VehicleNotAvailableException('O veículo já está alocado em uma viagem ativa.');
    }

    // 5. Instancia os Value Objects de localização
    const origin = new Location(input.origin);
    const destination = new Location(input.destination);

    // 6. Cria o Aggregate Root da viagem e persiste
    const trip = new Trip({
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      origin,
      destination,
    });

    await this.tripRepository.create(trip);

    return trip;
  }
}