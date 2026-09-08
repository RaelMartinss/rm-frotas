import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetDriverFuelHistoryUseCase } from '../get-driver-fuel-history.use-case';
import { UpdateDriverFuelReceiptUseCase } from '../update-driver-fuel-receipt.use-case';

describe('Driver Fuel History Use Cases', () => {
  let getFuelHistoryUseCase: GetDriverFuelHistoryUseCase;
  let updateFuelReceiptUseCase: UpdateDriverFuelReceiptUseCase;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
      },
      driver: {
        findFirst: vi.fn(),
      },
      fuelRecord: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    getFuelHistoryUseCase = new GetDriverFuelHistoryUseCase(prismaMock);
    updateFuelReceiptUseCase = new UpdateDriverFuelReceiptUseCase(prismaMock);
  });

  describe('GetDriverFuelHistoryUseCase', () => {
    it('deve listar o histórico de abastecimentos do motorista com sinalização de pendência', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Carlos Motorista',
        driverProfile: { id: 'driver-1' },
      });

      const fakeRecords = [
        {
          id: 'fuel-1',
          vehicleId: 'veh-1',
          fuelType: 'DIESEL',
          liters: 100,
          pricePerUnit: 5.89,
          totalCost: 589,
          odometerAtFueling: 50000,
          gasStation: 'Posto Shell',
          fullTank: true,
          receiptUrl: 'data:image/jpeg;base64,12345',
          notes: 'Tudo ok',
          fueledAt: new Date('2026-09-08T10:00:00Z'),
          vehicle: { plate: 'ABC1D23', model: 'R450', brand: 'Scania' },
        },
        {
          id: 'fuel-2',
          vehicleId: 'veh-1',
          fuelType: 'DIESEL',
          liters: 50,
          pricePerUnit: 5.89,
          totalCost: 294.5,
          odometerAtFueling: 50500,
          gasStation: null,
          fullTank: true,
          receiptUrl: null,
          notes: null,
          fueledAt: new Date('2026-09-08T15:00:00Z'),
          vehicle: { plate: 'ABC1D23', model: 'R450', brand: 'Scania' },
        },
      ];

      prismaMock.fuelRecord.findMany.mockResolvedValue(fakeRecords);

      const result = await getFuelHistoryUseCase.execute('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].isPendingReceipt).toBe(false);
      expect(result[1].isPendingReceipt).toBe(true);
      expect(result[0].vehiclePlate).toBe('ABC1D23');
    });
  });

  describe('UpdateDriverFuelReceiptUseCase', () => {
    it('deve atualizar o comprovante do abastecimento com sucesso', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        driverProfile: { id: 'driver-1' },
      });

      prismaMock.fuelRecord.findUnique.mockResolvedValue({
        id: 'fuel-2',
        driverId: 'driver-1',
        ownerId: 'owner-1',
        driver: { userId: 'user-1' },
      });

      prismaMock.fuelRecord.update.mockResolvedValue({
        id: 'fuel-2',
        receiptUrl: 'data:image/jpeg;base64,abcde',
      });

      const result = await updateFuelReceiptUseCase.execute({
        userId: 'user-1',
        fuelRecordId: 'fuel-2',
        receiptUrl: 'data:image/jpeg;base64,abcde',
      });

      expect(result.message).toBe('Comprovante anexado com sucesso!');
      expect(result.receiptUrl).toBe('data:image/jpeg;base64,abcde');
      expect(prismaMock.fuelRecord.update).toHaveBeenCalled();
    });

    it('deve rejeitar se a foto estiver vazia', async () => {
      await expect(
        updateFuelReceiptUseCase.execute({
          userId: 'user-1',
          fuelRecordId: 'fuel-2',
          receiptUrl: '',
        })
      ).rejects.toThrow('A imagem do comprovante é obrigatória.');
    });
  });
});
