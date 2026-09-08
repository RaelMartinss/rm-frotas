import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetDriverCurrentTripUseCase } from '../get-driver-current-trip.use-case';

describe('GetDriverCurrentTripUseCase', () => {
  let useCase: GetDriverCurrentTripUseCase;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
      },
      driver: {
        findFirst: vi.fn(),
      },
      trip: {
        findFirst: vi.fn(),
        count: vi.fn(),
      },
    };

    useCase = new GetDriverCurrentTripUseCase(prismaMock);
  });

  it('deve retornar a viagem ativa e dados do motorista com sucesso', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Carlos Motorista',
      driverProfile: {
        id: 'driver-1',
        name: 'Carlos Motorista',
        cpf: '123.456.789-00',
        cnhNumber: '12345678901',
        cnhCategory: 'E',
        cnhExpirationDate: futureDate,
        status: 'ACTIVE',
      },
    });

    prismaMock.trip.findFirst.mockResolvedValue({
      id: 'trip-1',
      status: 'IN_PROGRESS',
      originAddress: 'Rua A, 100',
      originCity: 'São Paulo',
      originState: 'SP',
      destinationAddress: 'Av B, 200',
      destinationCity: 'Curitiba',
      destinationState: 'PR',
      startedAt: new Date(),
      createdAt: new Date(),
      vehicle: {
        id: 'veh-1',
        brand: 'Scania',
        model: 'R450',
        plate: 'ABC1D23',
        year: 2023,
        currentKm: 120000,
        crlvExpiration: futureDate,
        status: 'IN_USE',
      },
    });

    prismaMock.trip.count.mockResolvedValue(12);

    const result = await useCase.execute('user-1', 'client-1');

    expect(result.driver).toBeDefined();
    expect(result.driver?.name).toBe('Carlos Motorista');
    expect(result.driver?.isCnhExpired).toBe(false);
    expect(result.trip).toBeDefined();
    expect(result.trip?.originCity).toBe('São Paulo');
    expect(result.trip?.vehicle.plate).toBe('ABC1D23');
    expect(result.recentTripsCount).toBe(12);
  });

  it('deve retornar trip null quando o motorista não tiver viagem em andamento ou planejada', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Carlos Motorista',
      driverProfile: {
        id: 'driver-1',
        name: 'Carlos Motorista',
        cpf: '123.456.789-00',
        cnhNumber: '12345678901',
        cnhCategory: 'E',
        cnhExpirationDate: futureDate,
        status: 'ACTIVE',
      },
    });

    prismaMock.trip.findFirst.mockResolvedValue(null);
    prismaMock.trip.count.mockResolvedValue(5);

    const result = await useCase.execute('user-1', 'client-1');

    expect(result.driver).toBeDefined();
    expect(result.trip).toBeNull();
    expect(result.recentTripsCount).toBe(5);
  });
});
