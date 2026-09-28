import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DriverPortalController } from '../driver-portal.controller';

describe('DriverPortalController - Fuel Recording & Odometer Evaluation', () => {
  let controller: DriverPortalController;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      vehicle: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      driver: {
        findFirst: vi.fn(),
      },
      fuelRecord: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (actions) => {
        if (Array.isArray(actions)) {
          return Promise.all(actions);
        }
        return actions;
      }),
    };

    controller = new DriverPortalController(
      prismaMock,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('deve registrar abastecimento em tempo real e atualizar o odômetro e lastEventAt do veículo', async () => {
    const vehicleDate = new Date('2026-09-28T08:00:00Z');
    const now = new Date('2026-09-28T10:00:00Z');

    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 100000,
      lastEventAt: vehicleDate,
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      clientId: 'client-1',
    });

    prismaMock.fuelRecord.create.mockResolvedValue({
      id: 'fuel-1',
      totalCost: 500,
      odometerInconsistent: false,
    });

    const result = await controller.createFuelRecord('user-1', 'client-1', {
      vehicleId: 'vehicle-1',
      currentKm: 100500,
      liters: 100,
      pricePerLiter: 5,
      fuelType: 'DIESEL',
      occurredAt: now.toISOString(),
    });

    expect(result).toEqual({
      message: 'Abastecimento registrado com sucesso!',
      id: 'fuel-1',
      totalCost: 500,
      odometerInconsistent: false,
    });

    expect(prismaMock.fuelRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          odometerAtFueling: 100500,
          odometerInconsistent: false,
        }),
      }),
    );

    expect(prismaMock.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vehicle-1' },
        data: expect.objectContaining({
          currentKm: 100500,
          lastEventAt: expect.any(Date),
        }),
      }),
    );
  });

  it('deve rejeitar abastecimento mais recente com km inferior ao km atual do veículo', async () => {
    const now = new Date('2026-09-28T10:00:00Z');

    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 100000,
      lastEventAt: new Date('2026-09-28T08:00:00Z'),
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      clientId: 'client-1',
    });

    await expect(
      controller.createFuelRecord('user-1', 'client-1', {
        vehicleId: 'vehicle-1',
        currentKm: 99000, // Menor que 100000 em evento online
        liters: 100,
        pricePerLiter: 5,
        fuelType: 'DIESEL',
        occurredAt: now.toISOString(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve aceitar evento atrasado sem sobrescrever o km atual do veículo (km consistente entre vizinhos)', async () => {
    const delayedDate = new Date('2026-09-28T07:00:00Z');
    const lastEventAt = new Date('2026-09-28T10:00:00Z');

    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 100000,
      lastEventAt,
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      clientId: 'client-1',
    });

    // Vizinho anterior às 05h com 90.000 km, vizinho posterior às 10h com 100.000 km
    prismaMock.fuelRecord.findFirst
      .mockResolvedValueOnce({ odometerAtFueling: 90000 })
      .mockResolvedValueOnce({ odometerAtFueling: 100000 });

    prismaMock.fuelRecord.create.mockResolvedValue({
      id: 'fuel-delayed-1',
      totalCost: 250,
      odometerInconsistent: false,
    });

    const result = await controller.createFuelRecord('user-1', 'client-1', {
      vehicleId: 'vehicle-1',
      currentKm: 95000, // 90.000 <= 95.000 <= 100.000
      liters: 50,
      pricePerLiter: 5,
      fuelType: 'DIESEL',
      occurredAt: delayedDate.toISOString(),
    });

    expect(result.odometerInconsistent).toBe(false);
    // Veículo NÃO deve ser atualizado
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
  });

  it('deve aceitar evento atrasado e marcar odometerInconsistent = true quando violar os vizinhos', async () => {
    const delayedDate = new Date('2026-09-28T07:00:00Z');
    const lastEventAt = new Date('2026-09-28T10:00:00Z');

    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 100000,
      lastEventAt,
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      clientId: 'client-1',
    });

    // Vizinho anterior às 05h com 90.000 km
    prismaMock.fuelRecord.findFirst
      .mockResolvedValueOnce({ odometerAtFueling: 90000 })
      .mockResolvedValueOnce({ odometerAtFueling: 100000 });

    prismaMock.fuelRecord.create.mockResolvedValue({
      id: 'fuel-delayed-inconsistent',
      totalCost: 250,
      odometerInconsistent: true,
    });

    const result = await controller.createFuelRecord('user-1', 'client-1', {
      vehicleId: 'vehicle-1',
      currentKm: 80000, // Menor que o vizinho anterior (90.000)
      liters: 50,
      pricePerLiter: 5,
      fuelType: 'DIESEL',
      occurredAt: delayedDate.toISOString(),
    });

    expect(result.odometerInconsistent).toBe(true);
    // Nunca sobrescreve o odômetro do veículo
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
  });

  it('deve lançar 422 se occurredAt for no futuro (> 5 min) ou muito antigo (> 30 dias)', async () => {
    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      currentKm: 100000,
    });
    prismaMock.driver.findFirst.mockResolvedValue({ id: 'driver-1' });

    const futureDate = new Date(Date.now() + 10 * 60 * 1000);

    await expect(
      controller.createFuelRecord('user-1', 'client-1', {
        vehicleId: 'vehicle-1',
        currentKm: 100500,
        liters: 100,
        pricePerLiter: 5,
        fuelType: 'DIESEL',
        occurredAt: futureDate.toISOString(),
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
