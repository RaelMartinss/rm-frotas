import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecordTripLocationUseCase } from '../record-trip-location.use-case';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('RecordTripLocationUseCase', () => {
  let sut: RecordTripLocationUseCase;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      trip: {
        findUnique: vi.fn(),
      },
      driver: {
        findFirst: vi.fn(),
      },
      tripLocationPing: {
        createMany: vi.fn(),
      },
    };
    sut = new RecordTripLocationUseCase(prismaMock);
  });

  it('deve registrar pings de localização com sucesso quando viagem estiver IN_PROGRESS e motorista for o titular', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'driver-1',
      status: 'IN_PROGRESS',
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      userId: 'user-1',
    });

    prismaMock.tripLocationPing.createMany.mockResolvedValue({ count: 2 });

    const result = await sut.execute({
      userId: 'user-1',
      tripId: 'trip-1',
      pings: [
        { latitude: -1.4558, longitude: -48.4902, recordedAt: new Date().toISOString() },
        { latitude: -1.4560, longitude: -48.4910, recordedAt: new Date().toISOString() },
      ],
    });

    expect(result.count).toBe(2);
    expect(prismaMock.tripLocationPing.createMany).toHaveBeenCalledTimes(1);
  });

  it('deve lançar NotFoundException se a viagem não existir', async () => {
    prismaMock.trip.findUnique.mockResolvedValue(null);

    await expect(
      sut.execute({
        userId: 'user-1',
        tripId: 'trip-invalid',
        pings: [{ latitude: -1.0, longitude: -48.0 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve lançar ForbiddenException se o usuário não for o motorista vinculado à viagem', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'driver-1',
      status: 'IN_PROGRESS',
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-2', // Outro motorista
      userId: 'user-2',
    });

    await expect(
      sut.execute({
        userId: 'user-2',
        tripId: 'trip-1',
        pings: [{ latitude: -1.0, longitude: -48.0 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deve lançar BadRequestException se a viagem não estiver IN_PROGRESS', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'driver-1',
      status: 'PLANNED', // Ainda não iniciada
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      userId: 'user-1',
    });

    await expect(
      sut.execute({
        userId: 'user-1',
        tripId: 'trip-1',
        pings: [{ latitude: -1.0, longitude: -48.0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
