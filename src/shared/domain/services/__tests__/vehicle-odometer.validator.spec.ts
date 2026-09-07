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
});
