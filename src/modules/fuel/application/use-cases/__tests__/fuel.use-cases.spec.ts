import { RegisterFuelRecordUseCase } from '../register-fuel-record.use-case';
import { UpdateFuelRecordUseCase } from '../update-fuel-record.use-case';
import { DeleteFuelRecordUseCase } from '../delete-fuel-record.use-case';
import { GetFuelRecordByIdUseCase } from '../get-fuel-record-by-id.use-case';
import { ListFuelRecordsUseCase } from '../list-fuel-records.use-case';
import { GetFuelConsumptionReportUseCase } from '../get-fuel-consumption-report.use-case';
import { GetFuelCostStatsUseCase } from '../get-fuel-cost-stats.use-case';

import { InMemoryFuelRecordsRepository } from '../../../infrastructure/repositories/in-memory-fuel-records.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { InMemoryDriversRepository } from '../../../../drivers/infrastructure/repositories/in-memory-drivers.repository';

import { Vehicle } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { Driver } from '../../../../drivers/domain/entities/driver.entity';
import { Cpf } from '../../../../drivers/domain/value-objects/cpf.vo';
import { Cnh } from '../../../../drivers/domain/value-objects/cnh.vo';
import { FuelType } from '../../../domain/enums/fuel-type.enum';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvalidOdometerReadingException } from '../../../../../shared/domain/services/vehicle-odometer.validator';

describe('Fuel Module Use Cases', () => {
  let fuelRepo: InMemoryFuelRecordsRepository;
  let vehicleRepo: InMemoryVehiclesRepository;
  let driverRepo: InMemoryDriversRepository;

  let registerUseCase: RegisterFuelRecordUseCase;
  let updateUseCase: UpdateFuelRecordUseCase;
  let deleteUseCase: DeleteFuelRecordUseCase;
  let getByIdUseCase: GetFuelRecordByIdUseCase;
  let listUseCase: ListFuelRecordsUseCase;
  let reportUseCase: GetFuelConsumptionReportUseCase;
  let statsUseCase: GetFuelCostStatsUseCase;

  const ownerId = 'owner-uuid-1';
  let vehicle: Vehicle;
  let driver: Driver;

  beforeEach(async () => {
    fuelRepo = new InMemoryFuelRecordsRepository();
    vehicleRepo = new InMemoryVehiclesRepository();
    driverRepo = new InMemoryDriversRepository();

    registerUseCase = new RegisterFuelRecordUseCase(fuelRepo, vehicleRepo, driverRepo);
    updateUseCase = new UpdateFuelRecordUseCase(fuelRepo);
    deleteUseCase = new DeleteFuelRecordUseCase(fuelRepo);
    getByIdUseCase = new GetFuelRecordByIdUseCase(fuelRepo);
    listUseCase = new ListFuelRecordsUseCase(fuelRepo);
    reportUseCase = new GetFuelConsumptionReportUseCase(fuelRepo, vehicleRepo);
    statsUseCase = new GetFuelCostStatsUseCase(fuelRepo);

    vehicle = new Vehicle(
      {
        id: 'vehicle-uuid-1',
        plate: new LicensePlate('ABC1D23'),
        brand: 'Mercedes-Benz',
        model: 'Sprinter 415',
        year: 2022,
        currentKm: 50000,
        ownerId,
      }
    );
    await vehicleRepo.save(vehicle);

    driver = new Driver(
      {
        name: 'Carlos Silva',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678900', 'D', new Date('2028-01-01')),
        ownerId,
      },
      'driver-uuid-1'
    );
    await driverRepo.save(driver);
  });

  describe('RegisterFuelRecordUseCase', () => {
    it('should register fuel record and advance vehicle odometer', async () => {
      const record = await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.DIESEL_S10,
        liters: 60,
        pricePerUnit: 6.0,
        totalCost: 360,
        odometerAtFueling: 50500,
        gasStation: 'Posto Graal',
        fullTank: true,
      });

      expect(record).toBeDefined();
      expect(record.getId()).toBeDefined();
      expect(record.getLiters()).toBe(60);
      expect(record.getTotalCost().amount).toBe(360);

      // Checa se o odômetro do veículo foi atualizado
      const updatedVehicle = await vehicleRepo.findById(vehicle.getId());
      expect(updatedVehicle?.getCurrentKm()).toBe(50500);
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      await expect(
        registerUseCase.execute({
          ownerId,
          vehicleId: 'non-existing-vehicle',
          driverId: driver.getId(),
          fuelType: FuelType.GASOLINA,
          liters: 40,
          totalCost: 200,
          odometerAtFueling: 50100,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when driver does not exist', async () => {
      await expect(
        registerUseCase.execute({
          ownerId,
          vehicleId: vehicle.getId(),
          driverId: 'non-existing-driver',
          fuelType: FuelType.GASOLINA,
          liters: 40,
          totalCost: 200,
          odometerAtFueling: 50100,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject retroactive odometer lower than current vehicle km', async () => {
      await expect(
        registerUseCase.execute({
          ownerId,
          vehicleId: vehicle.getId(),
          driverId: driver.getId(),
          fuelType: FuelType.GASOLINA,
          liters: 40,
          totalCost: 200,
          odometerAtFueling: 48000, // < 50000
        })
      ).rejects.toThrow(InvalidOdometerReadingException);
    });
  });

  describe('UpdateFuelRecordUseCase & DeleteFuelRecordUseCase', () => {
    it('should update fuel record successfully', async () => {
      const record = await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.GASOLINA,
        liters: 40,
        totalCost: 240,
        odometerAtFueling: 50000,
      });

      const updated = await updateUseCase.execute({
        id: record.getId(),
        ownerId,
        gasStation: 'Novo Posto',
        notes: 'Nota atualizada',
      });

      expect(updated.getGasStation()).toBe('Novo Posto');
      expect(updated.getNotes()).toBe('Nota atualizada');
    });

    it('should forbid driver from updating another driver record', async () => {
      const record = await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.GASOLINA,
        liters: 40,
        totalCost: 240,
        odometerAtFueling: 50000,
      });

      await expect(
        updateUseCase.execute({
          id: record.getId(),
          ownerId,
          driverId: 'other-driver-id',
          notes: 'Tentativa indevida',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete fuel record', async () => {
      const record = await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.GASOLINA,
        liters: 40,
        totalCost: 240,
        odometerAtFueling: 50000,
      });

      await deleteUseCase.execute({ id: record.getId(), ownerId });
      const found = await fuelRepo.findById(record.getId());
      expect(found).toBeNull();
    });
  });

  describe('GetFuelConsumptionReportUseCase & GetFuelCostStatsUseCase', () => {
    it('should calculate accurate km/l between consecutive full tank fuelings including intermediate partial fuelings', async () => {
      // Abastecimento 1: 50.000 km, Tanque Cheio (base)
      await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.GASOLINA,
        liters: 50,
        totalCost: 250,
        odometerAtFueling: 50000,
        fullTank: true,
        fueledAt: new Date(2026, 8, 1),
      });

      // Abastecimento 2 (parcial): 50.200 km, 15 litros
      await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.GASOLINA,
        liters: 15,
        totalCost: 75,
        odometerAtFueling: 50200,
        fullTank: false,
        fueledAt: new Date(2026, 8, 3),
      });

      // Abastecimento 3 (tanque cheio de novo): 50.600 km, 35 litros
      // Distância total do intervalo: 50.600 - 50.000 = 600 km
      // Litros totais consumidos: 15 + 35 = 50 L
      // Média: 600 / 50 = 12 km/L
      await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.GASOLINA,
        liters: 35,
        totalCost: 175,
        odometerAtFueling: 50600,
        fullTank: true,
        fueledAt: new Date(2026, 8, 6),
      });

      const report = await reportUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
      });

      expect(report.vehicles.length).toBe(1);
      const vehicleReport = report.vehicles[0];
      expect(vehicleReport.totalFuelings).toBe(3);
      expect(vehicleReport.fullTankFuelings).toBe(2);
      expect(vehicleReport.totalDistanceKm).toBe(600);
      expect(vehicleReport.averageKmPerLiter).toBe(12);
      expect(vehicleReport.segments.length).toBe(1);
      expect(vehicleReport.segments[0].kmPerLiter).toBe(12);
      expect(vehicleReport.segments[0].distanceKm).toBe(600);
      expect(vehicleReport.segments[0].litersConsumed).toBe(50);
    });

    it('should aggregate cost stats correctly', async () => {
      await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.GASOLINA,
        liters: 50,
        totalCost: 250,
        odometerAtFueling: 50000,
      });

      await registerUseCase.execute({
        ownerId,
        vehicleId: vehicle.getId(),
        driverId: driver.getId(),
        fuelType: FuelType.ETANOL,
        liters: 40,
        totalCost: 160,
        odometerAtFueling: 50400,
      });

      const stats = await statsUseCase.execute({ ownerId });
      expect(stats.totalRecords).toBe(2);
      expect(stats.totalLiters).toBe(90);
      expect(stats.totalCost).toBe(410);
      expect(stats.costByFuelType.length).toBe(2);
    });
  });
});
