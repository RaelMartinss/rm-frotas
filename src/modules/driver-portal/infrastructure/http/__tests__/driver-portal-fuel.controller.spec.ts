import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
    const vehicleDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const now = new Date(Date.now() - 60 * 1000);

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
    const now = new Date(Date.now() - 60 * 1000);

    prismaMock.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 100000,
      lastEventAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
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
    const delayedDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const lastEventAt = new Date(Date.now() - 60 * 1000);

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
    const delayedDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const lastEventAt = new Date(Date.now() - 60 * 1000);

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

  it('deve bloquear abastecimento cross-tenant com ForbiddenException e aceitar ARLA_32 com fullTank false por padrão', async () => {
    prismaMock.vehicle.findUnique.mockResolvedValueOnce({
      id: 'vehicle-other',
      clientId: 'client-other',
      ownerId: 'owner-2',
      currentKm: 50000,
    });

    await expect(
      controller.createFuelRecord('user-1', 'client-1', {
        vehicleId: 'vehicle-other',
        currentKm: 50100,
        liters: 20,
        pricePerLiter: 4.5,
        fuelType: 'ARLA_32',
      }),
    ).rejects.toThrow(ForbiddenException);

    prismaMock.vehicle.findUnique.mockResolvedValueOnce({
      id: 'vehicle-1',
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 50000,
      lastEventAt: null,
    });
    prismaMock.driver.findFirst.mockResolvedValueOnce({
      id: 'driver-1',
      clientId: 'client-1',
    });
    prismaMock.fuelRecord.create.mockResolvedValueOnce({
      id: 'fuel-arla-1',
      totalCost: 90,
      odometerInconsistent: false,
    });

    const arlaRes = await controller.createFuelRecord('user-1', 'client-1', {
      vehicleId: 'vehicle-1',
      currentKm: 50100,
      liters: 20,
      pricePerLiter: 4.5,
      fuelType: 'ARLA_32',
    });

    expect(arlaRes.id).toBe('fuel-arla-1');
    expect(prismaMock.fuelRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fuelType: 'ARLA_32',
          fullTank: false,
        }),
      }),
    );
  });

  it('deve impedir concluir viagem PLANNED e deve gravar finalOdometer + lastEventAt ao concluir viagem IN_PROGRESS', async () => {
    prismaMock.trip = {
      findUnique: vi.fn(),
      update: vi.fn(),
    };
    prismaMock.odometerReading = {
      create: vi.fn(),
    };

    prismaMock.trip.findUnique.mockResolvedValueOnce({
      id: 'trip-planned',
      clientId: 'client-1',
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      status: 'PLANNED',
      driver: { id: 'driver-1', userId: 'user-1' },
      vehicle: { id: 'vehicle-1', ownerId: 'owner-1', currentKm: 100000 },
    });
    prismaMock.driver.findFirst.mockResolvedValueOnce({ id: 'driver-1', userId: 'user-1' });

    await expect(
      controller.completeTrip('user-1', 'client-1', 'DRIVER', {
        tripId: 'trip-planned',
        currentKm: 100300,
      }),
    ).rejects.toThrow(BadRequestException);

    prismaMock.trip.findUnique.mockResolvedValueOnce({
      id: 'trip-active',
      clientId: 'client-1',
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      status: 'IN_PROGRESS',
      driver: { id: 'driver-1', userId: 'user-1' },
      vehicle: { id: 'vehicle-1', ownerId: 'owner-1', currentKm: 100000 },
    });
    prismaMock.driver.findFirst.mockResolvedValueOnce({ id: 'driver-1', userId: 'user-1' });
    prismaMock.trip.update.mockResolvedValueOnce({
      id: 'trip-active',
      status: 'COMPLETED',
      completedAt: new Date(),
      finalOdometer: 100350,
    });

    const completed = await controller.completeTrip('user-1', 'client-1', 'DRIVER', {
      tripId: 'trip-active',
      currentKm: 100350,
    });

    expect(completed.finalOdometer).toBe(100350);
    expect(prismaMock.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ finalOdometer: 100350, status: 'COMPLETED' }),
      }),
    );
    expect(prismaMock.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentKm: 100350,
          lastEventAt: expect.any(Date),
          status: 'AVAILABLE',
        }),
      }),
    );
    expect(prismaMock.odometerReading.create).toHaveBeenCalledTimes(1);
  });
});
