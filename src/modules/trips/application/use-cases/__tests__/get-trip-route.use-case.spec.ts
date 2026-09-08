import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetTripRouteUseCase } from '../get-trip-route.use-case';
import { NotFoundException } from '@nestjs/common';

describe('GetTripRouteUseCase', () => {
  let sut: GetTripRouteUseCase;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      trip: {
        findFirst: vi.fn(),
      },
    };
    sut = new GetTripRouteUseCase(prismaMock);
  });

  it('deve retornar a rota e os pings ordenados com sucesso', async () => {
    const mockTrip = {
      id: 'trip-1',
      status: 'IN_PROGRESS',
      driver: { name: 'João Silva' },
      vehicle: { plate: 'ABC1D23', model: 'Volvo FH' },
      originAddress: 'Rua A, 100',
      originCity: 'Belém',
      originState: 'PA',
      destinationAddress: 'Av B, 200',
      destinationCity: 'Santarém',
      destinationState: 'PA',
      startedAt: new Date(),
      completedAt: null,
      locationPings: [
        {
          id: 'ping-1',
          latitude: -1.4558,
          longitude: -48.4902,
          recordedAt: new Date('2026-09-08T10:00:00Z'),
          createdAt: new Date(),
        },
        {
          id: 'ping-2',
          latitude: -1.4560,
          longitude: -48.4910,
          recordedAt: new Date('2026-09-08T10:00:15Z'),
          createdAt: new Date(),
        },
      ],
    };

    prismaMock.trip.findFirst.mockResolvedValue(mockTrip);

    const result = await sut.execute({
      tripId: 'trip-1',
      clientId: 'client-1',
    });

    expect(result.tripId).toBe('trip-1');
    expect(result.driverName).toBe('João Silva');
    expect(result.vehiclePlate).toBe('ABC1D23');
    expect(result.pings).toHaveLength(2);
    expect(result.pings[0].latitude).toBe(-1.4558);
  });

  it('deve lançar NotFoundException se a viagem não for encontrada', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null);

    await expect(
      sut.execute({
        tripId: 'invalid-id',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
