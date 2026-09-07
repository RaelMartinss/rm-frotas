import { describe, expect, it } from 'vitest';
import { Maintenance } from '../maintenance.entity';
import { MaintenanceStatus } from '../../enums/maintenance-status.enum';
import { MaintenanceType } from '../../enums/maintenance-type.enum';
import { MaintenanceItem } from '../../value-objects/maintenance-item.vo';
import {
  InvalidMaintenanceDateException,
  InvalidOdometerReadingException,
  MaintenanceAlreadyFinishedException,
  MaintenanceNotInProgressException,
} from '../../exceptions/maintenance.exceptions';

describe('Maintenance Entity (Domain)', () => {
  it('should create a scheduled maintenance with initial props', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Revisão periódica dos 50.000 km',
      type: MaintenanceType.PREVENTIVA,
    });

    expect(maintenance.getId()).toBeDefined();
    expect(maintenance.getVehicleId()).toBe('v-123');
    expect(maintenance.getOwnerId()).toBe('u-123');
    expect(maintenance.getStatus()).toBe(MaintenanceStatus.AGENDADA);
    expect(maintenance.getType()).toBe(MaintenanceType.PREVENTIVA);
    expect(maintenance.getCost().amount).toBe(0);
  });

  it('should calculate total cost automatically from items', () => {
    const item1 = new MaintenanceItem({ name: 'Troca de Óleo', cost: 150, quantity: 1 });
    const item2 = new MaintenanceItem({ name: 'Filtro de Ar', cost: 40, quantity: 2 });

    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Revisão',
      items: [item1, item2],
    });

    // 150*1 + 40*2 = 230
    expect(maintenance.getCost().amount).toBe(230);
    expect(maintenance.getItems().length).toBe(2);
  });

  it('should start a scheduled maintenance and set status to EM_ANDAMENTO', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Revisão',
    });

    const startDate = new Date();
    maintenance.start(startDate);

    expect(maintenance.getStatus()).toBe(MaintenanceStatus.EM_ANDAMENTO);
    expect(maintenance.getStartedAt()).toEqual(startDate);
  });

  it('should finish an in-progress maintenance and validate odometer and dates', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Troca de pastilhas',
    });

    const startDate = new Date('2026-09-07T10:00:00Z');
    maintenance.start(startDate);

    const finishDate = new Date('2026-09-07T14:00:00Z');
    maintenance.finish({
      odometerAtService: 55000,
      finishedAt: finishDate,
      items: [new MaintenanceItem({ name: 'Pastilhas de freio', cost: 250 })],
      currentVehicleKm: 50000,
    });

    expect(maintenance.getStatus()).toBe(MaintenanceStatus.CONCLUIDA);
    expect(maintenance.getFinishedAt()).toEqual(finishDate);
    expect(maintenance.getOdometerAtService()).toBe(55000);
    expect(maintenance.getCost().amount).toBe(250);
  });

  it('should throw MaintenanceNotInProgressException when finishing a non-in-progress maintenance', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Agendada',
    });

    expect(() => {
      maintenance.finish({ odometerAtService: 50000 });
    }).toThrow(MaintenanceNotInProgressException);
  });

  it('should throw InvalidMaintenanceDateException when finishedAt is before startedAt', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Revisão',
    });

    maintenance.start(new Date('2026-09-07T10:00:00Z'));

    expect(() => {
      maintenance.finish({
        odometerAtService: 50000,
        finishedAt: new Date('2026-09-07T08:00:00Z'),
      });
    }).toThrow(InvalidMaintenanceDateException);
  });

  it('should throw InvalidOdometerReadingException when odometer is lower than vehicle current km', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Revisão',
    });

    maintenance.start();

    expect(() => {
      maintenance.finish({
        odometerAtService: 45000,
        currentVehicleKm: 50000,
      });
    }).toThrow(InvalidOdometerReadingException);
  });

  it('should throw MaintenanceAlreadyFinishedException when attempting to modify completed or canceled maintenance', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Revisão',
    });

    maintenance.start();
    maintenance.finish({ odometerAtService: 50000 });

    expect(() => maintenance.start()).toThrow(MaintenanceAlreadyFinishedException);
    expect(() => maintenance.cancel()).toThrow(MaintenanceAlreadyFinishedException);
    expect(() => maintenance.updateDetails({ description: 'Nova' })).toThrow(
      MaintenanceAlreadyFinishedException
    );
  });

  it('should cancel a maintenance and change status to CANCELADA', () => {
    const maintenance = new Maintenance({
      vehicleId: 'v-123',
      ownerId: 'u-123',
      description: 'Revisão',
    });

    maintenance.cancel();
    expect(maintenance.getStatus()).toBe(MaintenanceStatus.CANCELADA);
  });
});
