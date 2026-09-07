import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryMaintenancesRepository } from '../../../infrastructure/repositories/in-memory-maintenances.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { ScheduleMaintenanceUseCase } from '../schedule-maintenance.use-case';
import { StartMaintenanceUseCase } from '../start-maintenance.use-case';
import { FinishMaintenanceUseCase } from '../finish-maintenance.use-case';
import { CancelMaintenanceUseCase } from '../cancel-maintenance.use-case';
import { ListMaintenancesUseCase } from '../list-maintenances.use-case';
import { GetMaintenanceStatsUseCase } from '../get-maintenance-stats.use-case';
import { MaintenanceType } from '../../../domain/enums/maintenance-type.enum';
import { MaintenanceStatus } from '../../../domain/enums/maintenance-status.enum';
import { VehicleAlreadyInMaintenanceException } from '../../../domain/exceptions/maintenance.exceptions';

describe('Maintenance Application Use Cases', () => {
  let maintenanceRepo: InMemoryMaintenancesRepository;
  let vehiclesRepo: InMemoryVehiclesRepository;
  let scheduleUseCase: ScheduleMaintenanceUseCase;
  let startUseCase: StartMaintenanceUseCase;
  let finishUseCase: FinishMaintenanceUseCase;
  let cancelUseCase: CancelMaintenanceUseCase;
  let listUseCase: ListMaintenancesUseCase;
  let statsUseCase: GetMaintenanceStatsUseCase;

  const OWNER_ID = 'owner-123';
  let sampleVehicle: Vehicle;

  beforeEach(async () => {
    maintenanceRepo = new InMemoryMaintenancesRepository();
    vehiclesRepo = new InMemoryVehiclesRepository();

    scheduleUseCase = new ScheduleMaintenanceUseCase(maintenanceRepo, vehiclesRepo);
    startUseCase = new StartMaintenanceUseCase(maintenanceRepo, vehiclesRepo);
    finishUseCase = new FinishMaintenanceUseCase(maintenanceRepo, vehiclesRepo);
    cancelUseCase = new CancelMaintenanceUseCase(maintenanceRepo, vehiclesRepo);
    listUseCase = new ListMaintenancesUseCase(maintenanceRepo, vehiclesRepo);
    statsUseCase = new GetMaintenanceStatsUseCase(maintenanceRepo);

    sampleVehicle = new Vehicle({
      plate: new LicensePlate('BRA2E19'),
      model: 'Hilux',
      brand: 'Toyota',
      year: 2022,
      currentKm: 60000,
      ownerId: OWNER_ID,
      status: VehicleStatus.AVAILABLE,
    });
    await vehiclesRepo.save(sampleVehicle);
  });

  it('should schedule a maintenance and maintain vehicle as AVAILABLE', async () => {
    const maintenance = await scheduleUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      type: MaintenanceType.PREVENTIVA,
      description: 'Troca de correia dentada',
      scheduledDate: new Date('2026-09-15'),
      items: [{ name: 'Correia', cost: 350, quantity: 1 }],
    });

    expect(maintenance.getId()).toBeDefined();
    expect(maintenance.getStatus()).toBe(MaintenanceStatus.AGENDADA);
    expect(maintenance.getCost().amount).toBe(350);

    const vehicle = await vehiclesRepo.findById(sampleVehicle.getId());
    expect(vehicle?.getStatus()).toBe(VehicleStatus.AVAILABLE);
  });

  it('should start maintenance and transition vehicle status to IN_MAINTENANCE', async () => {
    const scheduled = await scheduleUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      description: 'Revisão geral',
    });

    const started = await startUseCase.execute({
      ownerId: OWNER_ID,
      maintenanceId: scheduled.getId(),
    });

    expect(started.getStatus()).toBe(MaintenanceStatus.EM_ANDAMENTO);
    expect(started.getStartedAt()).toBeDefined();

    const vehicle = await vehiclesRepo.findById(sampleVehicle.getId());
    expect(vehicle?.getStatus()).toBe(VehicleStatus.IN_MAINTENANCE);
  });

  it('should prevent opening a 2nd active maintenance for the same vehicle', async () => {
    await startUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      description: 'Manutenção 1',
    });

    await expect(
      startUseCase.execute({
        ownerId: OWNER_ID,
        vehicleId: sampleVehicle.getId(),
        description: 'Manutenção 2',
      })
    ).rejects.toThrow(VehicleAlreadyInMaintenanceException);
  });

  it('should finish maintenance, release vehicle to AVAILABLE and update odometer', async () => {
    const maintenance = await startUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      description: 'Troca de amortecedores',
    });

    const finished = await finishUseCase.execute({
      ownerId: OWNER_ID,
      maintenanceId: maintenance.getId(),
      odometerAtService: 62500,
      items: [
        { name: 'Par de amortecedores', cost: 1200, quantity: 1 },
        { name: 'Mão de obra', cost: 300, quantity: 1 },
      ],
    });

    expect(finished.getStatus()).toBe(MaintenanceStatus.CONCLUIDA);
    expect(finished.getCost().amount).toBe(1500);
    expect(finished.getOdometerAtService()).toBe(62500);

    const vehicle = await vehiclesRepo.findById(sampleVehicle.getId());
    expect(vehicle?.getStatus()).toBe(VehicleStatus.AVAILABLE);
    expect(vehicle?.getCurrentKm()).toBe(62500);
  });

  it('should cancel an in-progress maintenance and return vehicle to AVAILABLE', async () => {
    const maintenance = await startUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      description: 'Manutenção cancelada',
    });

    let vehicle = await vehiclesRepo.findById(sampleVehicle.getId());
    expect(vehicle?.getStatus()).toBe(VehicleStatus.IN_MAINTENANCE);

    const canceled = await cancelUseCase.execute({
      ownerId: OWNER_ID,
      maintenanceId: maintenance.getId(),
    });

    expect(canceled.getStatus()).toBe(MaintenanceStatus.CANCELADA);

    vehicle = await vehiclesRepo.findById(sampleVehicle.getId());
    expect(vehicle?.getStatus()).toBe(VehicleStatus.AVAILABLE);
  });

  it('should list maintenances with pagination and calculate aggregated stats', async () => {
    // Maintenance 1: Preventiva Concluída (R$ 500)
    const m1 = await startUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      type: MaintenanceType.PREVENTIVA,
      description: 'Prev 1',
    });
    await finishUseCase.execute({
      ownerId: OWNER_ID,
      maintenanceId: m1.getId(),
      odometerAtService: 60100,
      cost: 500,
    });

    // Maintenance 2: Corretiva Concluída (R$ 800)
    const m2 = await startUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      type: MaintenanceType.CORRETIVA,
      description: 'Corr 1',
    });
    await finishUseCase.execute({
      ownerId: OWNER_ID,
      maintenanceId: m2.getId(),
      odometerAtService: 60200,
      cost: 800,
    });

    // List
    const listResult = await listUseCase.execute({
      ownerId: OWNER_ID,
      page: 1,
      limit: 10,
    });
    expect(listResult.total).toBe(2);
    expect(listResult.maintenances.length).toBe(2);

    // Stats
    const stats = await statsUseCase.execute({ ownerId: OWNER_ID });
    expect(stats.totalMaintenances).toBe(2);
    expect(stats.completedCount).toBe(2);
    expect(stats.totalCost).toBe(1300);
    expect(stats.preventiveCost).toBe(500);
    expect(stats.correctiveCost).toBe(800);
  });

  it('should enforce multi-tenant isolation', async () => {
    // 1. Não permite agendar manutenção em veículo de outro usuário
    await expect(
      scheduleUseCase.execute({
        ownerId: 'other-user',
        vehicleId: sampleVehicle.getId(),
        description: 'Tentativa de invasão',
      })
    ).rejects.toThrow();

    // 2. Não permite outro usuário finalizar ou alterar manutenção que não é dele
    const myMaintenance = await scheduleUseCase.execute({
      ownerId: OWNER_ID,
      vehicleId: sampleVehicle.getId(),
      description: 'Manutenção do dono legítimo',
    });

    await startUseCase.execute({
      ownerId: OWNER_ID,
      maintenanceId: myMaintenance.getId(),
    });

    await expect(
      finishUseCase.execute({
        ownerId: 'other-user', // usuário invasor
        maintenanceId: myMaintenance.getId(),
        odometerAtService: 65000,
      })
    ).rejects.toThrow();
  });
});
