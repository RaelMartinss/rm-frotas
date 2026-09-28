import {
  VehicleOdometerValidator,
  InvalidOdometerReadingException,
} from '../vehicle-odometer.validator';

describe('VehicleOdometerValidator (Shared Domain Service)', () => {
  it('should pass when new odometer is greater than current vehicle km and last record', () => {
    expect(() => {
      VehicleOdometerValidator.validate({
        newOdometer: 55000,
        currentVehicleKm: 50000,
        lastRecordOdometer: 52000,
      });
    }).not.toThrow();
  });

  it('should pass when new odometer equals current vehicle km (first reading)', () => {
    expect(() => {
      VehicleOdometerValidator.validate({
        newOdometer: 50000,
        currentVehicleKm: 50000,
      });
    }).not.toThrow();
  });

  it('should throw InvalidOdometerReadingException when new odometer is lower than vehicle current km', () => {
    expect(() => {
      VehicleOdometerValidator.validate({
        newOdometer: 48000,
        currentVehicleKm: 50000,
        contextName: 'Abastecimento',
      });
    }).toThrow(InvalidOdometerReadingException);
  });

  it('should throw InvalidOdometerReadingException when new odometer is lower than last recorded reading', () => {
    expect(() => {
      VehicleOdometerValidator.validate({
        newOdometer: 51000,
        currentVehicleKm: 50000,
        lastRecordOdometer: 52000,
        contextName: 'Abastecimento',
      });
    }).toThrow(InvalidOdometerReadingException);
  });

  it('should throw InvalidOdometerReadingException when odometer is negative or NaN', () => {
    expect(() => {
      VehicleOdometerValidator.validate({
        newOdometer: -10,
        currentVehicleKm: 0,
      });
    }).toThrow(InvalidOdometerReadingException);

    expect(() => {
      VehicleOdometerValidator.validate({
        newOdometer: NaN,
        currentVehicleKm: 0,
      });
    }).toThrow(InvalidOdometerReadingException);
  });

  describe('evaluateEvent (Offline & Concurrency Handling)', () => {
    it('deve atualizar o km do veículo quando o evento for em tempo real (mais recente) e km maior', () => {
      const now = new Date('2026-09-28T10:00:00Z');
      const lastEventAt = new Date('2026-09-28T08:00:00Z');

      const result = VehicleOdometerValidator.evaluateEvent({
        newOdometer: 100500,
        occurredAt: now,
        lastEventAt,
        currentVehicleKm: 100000,
      });

      expect(result.isDelayed).toBe(false);
      expect(result.shouldUpdateVehicleKm).toBe(true);
      expect(result.odometerInconsistent).toBe(false);
    });

    it('deve lançar exceção quando o evento mais recente tiver km inferior ao km atual do veículo', () => {
      const now = new Date('2026-09-28T10:00:00Z');
      const lastEventAt = new Date('2026-09-28T08:00:00Z');

      expect(() => {
        VehicleOdometerValidator.evaluateEvent({
          newOdometer: 99000,
          occurredAt: now,
          lastEventAt,
          currentVehicleKm: 100000,
        });
      }).toThrow(InvalidOdometerReadingException);
    });

    it('NÃO deve atualizar o km do veículo quando for um evento atrasado (occurredAt < lastEventAt)', () => {
      const delayedDate = new Date('2026-09-28T07:00:00Z');
      const lastEventAt = new Date('2026-09-28T10:00:00Z');

      const result = VehicleOdometerValidator.evaluateEvent({
        newOdometer: 95000,
        occurredAt: delayedDate,
        lastEventAt,
        currentVehicleKm: 100000,
        prevNeighborOdometer: 90000,
        nextNeighborOdometer: 100000,
      });

      expect(result.isDelayed).toBe(true);
      expect(result.shouldUpdateVehicleKm).toBe(false);
      expect(result.odometerInconsistent).toBe(false);
    });

    it('deve aceitar evento atrasado com flag odometerInconsistent = true quando o km for menor que o vizinho anterior', () => {
      const delayedDate = new Date('2026-09-28T07:00:00Z');
      const lastEventAt = new Date('2026-09-28T10:00:00Z');

      const result = VehicleOdometerValidator.evaluateEvent({
        newOdometer: 85000, // Menor que o vizinho anterior (90000)
        occurredAt: delayedDate,
        lastEventAt,
        currentVehicleKm: 100000,
        prevNeighborOdometer: 90000,
        nextNeighborOdometer: 100000,
      });

      expect(result.isDelayed).toBe(true);
      expect(result.shouldUpdateVehicleKm).toBe(false);
      expect(result.odometerInconsistent).toBe(true);
    });

    it('deve aceitar evento atrasado com flag odometerInconsistent = true quando o km for maior que o vizinho posterior', () => {
      const delayedDate = new Date('2026-09-28T07:00:00Z');
      const lastEventAt = new Date('2026-09-28T10:00:00Z');

      const result = VehicleOdometerValidator.evaluateEvent({
        newOdometer: 105000, // Maior que o vizinho posterior (100000)
        occurredAt: delayedDate,
        lastEventAt,
        currentVehicleKm: 100000,
        prevNeighborOdometer: 90000,
        nextNeighborOdometer: 100000,
      });

      expect(result.isDelayed).toBe(true);
      expect(result.shouldUpdateVehicleKm).toBe(false);
      expect(result.odometerInconsistent).toBe(true);
    });
  });
});
