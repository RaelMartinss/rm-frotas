export class InvalidOdometerReadingException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOdometerReadingException';
  }
}

export interface ValidateOdometerParams {
  newOdometer: number;
  currentVehicleKm: number;
  lastRecordOdometer?: number | null;
  contextName?: string; // 'Abastecimento' | 'Manutenção' | 'Viagem'
}

export class VehicleOdometerValidator {
  /**
   * Valida se a nova leitura de odômetro é consistente com a quilometragem atual do veículo
   * e/ou a leitura do registro imediatamente anterior.
   */
  public static validate(params: ValidateOdometerParams): void {
    const { newOdometer, currentVehicleKm, lastRecordOdometer, contextName = 'Registro' } = params;

    if (isNaN(newOdometer) || newOdometer < 0) {
      throw new InvalidOdometerReadingException(
        `${contextName}: O odômetro (${newOdometer}) deve ser um número positivo válido.`
      );
    }

    if (newOdometer < currentVehicleKm) {
      throw new InvalidOdometerReadingException(
        `${contextName}: O odômetro informado (${newOdometer} km) não pode ser menor que o odômetro atual do veículo (${currentVehicleKm} km).`
      );
    }

    if (
      lastRecordOdometer !== undefined &&
      lastRecordOdometer !== null &&
      newOdometer < lastRecordOdometer
    ) {
      throw new InvalidOdometerReadingException(
        `${contextName}: O odômetro informado (${newOdometer} km) não pode ser menor que a leitura anterior registrada (${lastRecordOdometer} km).`
      );
    }
  }
}
