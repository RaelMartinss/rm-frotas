import { describe, it, expect } from 'vitest';
import { Vehicle, VehicleStatus } from '../vehicle.entity';
import { LicensePlate } from '../../value-objects/license-plate.vo';
import {
  VehicleAlreadyInMaintenanceException,
  VehicleInUseException,
} from '../../exceptions/vehicle-status.exception';
import { InvalidKilometrageException } from '../../exceptions/invalid-kilometrage.exception';

describe('Vehicle Entity', () => {
  const makeVehicle = (status: 'AVAILABLE' | 'IN_MAINTENANCE' | 'IN_USE' = 'AVAILABLE') => {
    return new Vehicle({
      id: 'vehicle-uuid-1',
      plate: new LicensePlate('ABC-1234'),
      model: 'Volvo FH 540',
      year: 2022,
      currentKm: 50000,
      status: VehicleStatus.AVAILABLE,

    });
  };

  it('deve lançar erro ao tentar enviar para manutenção um veículo já em manutenção', () => {
    const vehicle = makeVehicle('IN_MAINTENANCE');
    expect(() => vehicle.sendToMaintenance()).toThrow(VehicleAlreadyInMaintenanceException);
  });

  it('deve lançar erro ao tentar enviar para manutenção um veículo em uso', () => {
    const vehicle = makeVehicle('IN_USE');
    expect(() => vehicle.sendToMaintenance()).toThrow(VehicleInUseException);
  });

  it('deve lançar erro se a nova quilometragem for menor que a atual', () => {
    const vehicle = makeVehicle();
    expect(() => vehicle.updateKm(49000)).toThrow(InvalidKilometrageException);
  });
});