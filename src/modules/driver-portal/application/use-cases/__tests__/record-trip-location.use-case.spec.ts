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
        findFirst: vi.fn().mockResolvedValue(null),
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
        { latitude: -1.4558, longitude: -48.4902, speed: 40, accuracy: 10, heading: 90, recordedAt: new Date().toISOString() },
        { latitude: -1.4560, longitude: -48.4910, speed: 35, accuracy: 12, heading: 95, recordedAt: new Date().toISOString() },
      ],
    });

    expect(result.count).toBe(2);
    expect(prismaMock.tripLocationPing.createMany).toHaveBeenCalledTimes(1);
    const inserted = prismaMock.tripLocationPing.createMany.mock.calls[0][0].data;
    expect(inserted[0].movementState).toBe('MOVING');
    expect(inserted[0].speed).toBe(40);
    expect(inserted[0].accuracy).toBe(10);
  });

  it('deve descartar pings com accuracy > 25 metros', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'driver-1',
      status: 'IN_PROGRESS',
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      userId: 'user-1',
    });

    prismaMock.tripLocationPing.createMany.mockResolvedValue({ count: 1 });

    const result = await sut.execute({
      userId: 'user-1',
      tripId: 'trip-1',
      pings: [
        { latitude: -1.4558, longitude: -48.4902, accuracy: 50, speed: 20 }, // descartado
        { latitude: -1.4560, longitude: -48.4910, accuracy: 15, speed: 20 }, // aceito
      ],
    });

    expect(result.count).toBe(1);
    const inserted = prismaMock.tripLocationPing.createMany.mock.calls[0][0].data;
    expect(inserted.length).toBe(1);
    expect(inserted[0].latitude).toBe(-1.4560);
  });

  it('deve descartar pings com salto de velocidade fisicamente impossível (> 180 km/h)', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      driverId: 'driver-1',
      status: 'IN_PROGRESS',
    });

    prismaMock.driver.findFirst.mockResolvedValue({
      id: 'driver-1',
      userId: 'user-1',
    });

    // Ponto anterior em Belém
    prismaMock.tripLocationPing.findFirst.mockResolvedValue({
      id: 'prev-1',
      latitude: -1.4558,
      longitude: -48.4902,
      recordedAt: new Date('2026-09-12T10:00:00Z'),
    });

    prismaMock.tripLocationPing.createMany.mockResolvedValue({ count: 1 });

    // Ponto 5 segundos depois, mas a 50 km de distância (velocidade > 30000 km/h)
    const impossiblePing = {
      latitude: -1.9000,
      longitude: -48.9000,
      accuracy: 10,
      recordedAt: new Date('2026-09-12T10:00:05Z').toISOString(),
    };

    const validPing = {
      latitude: -1.4559,
      longitude: -48.4903,
      accuracy: 10,
      speed: 25,
      recordedAt: new Date('2026-09-12T10:00:10Z').toISOString(),
    };

    const result = await sut.execute({
      userId: 'user-1',
      tripId: 'trip-1',
      pings: [impossiblePing, validPing],
    });

    expect(result.count).toBe(1);
    const inserted = prismaMock.tripLocationPing.createMany.mock.calls[0][0].data;
    expect(inserted.length).toBe(1);
    expect(inserted[0].latitude).toBe(-1.4559);
  });

  it('deve classificar pontos com speed < 3 km/h como STOPPED', async () => {
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
        { latitude: -1.4558, longitude: -48.4902, speed: 0.5, accuracy: 10 },
        { latitude: -1.4558, longitude: -48.4902, speed: 35, accuracy: 10 },
      ],
    });

    expect(result.count).toBe(2);
    const inserted = prismaMock.tripLocationPing.createMany.mock.calls[0][0].data;
    expect(inserted[0].movementState).toBe('STOPPED');
    expect(inserted[1].movementState).toBe('MOVING');
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
      id: 'driver-2',
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
      status: 'PLANNED',
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
