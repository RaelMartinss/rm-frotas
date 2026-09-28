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

  /**
   * Avalia um evento com timestamp de ocorrência (occurredAt) contra o odômetro do veículo e seus vizinhos temporais.
   * Regras da fila offline / concorrência:
   * - Se occurredAt >= lastEventAt: atualiza odômetro do veículo normalmente se válido.
   * - Se occurredAt < lastEventAt (evento atrasado): nunca sobrescreve o km atual do veículo.
   * - Se o km do evento atrasado violar os limites dos vizinhos anterior/posterior, marca odometerInconsistent = true.
   */
  public static evaluateEvent(params: {
    newOdometer: number;
    occurredAt: Date;
    lastEventAt?: Date | null;
    currentVehicleKm: number;
    prevNeighborOdometer?: number | null;
    nextNeighborOdometer?: number | null;
    contextName?: string;
  }): {
    isDelayed: boolean;
    shouldUpdateVehicleKm: boolean;
    odometerInconsistent: boolean;
  } {
    const {
      newOdometer,
      occurredAt,
      lastEventAt,
      currentVehicleKm,
      prevNeighborOdometer,
      nextNeighborOdometer,
      contextName = 'Registro',
    } = params;

    if (isNaN(newOdometer) || newOdometer < 0) {
      throw new InvalidOdometerReadingException(
        `${contextName}: O odômetro (${newOdometer}) deve ser um número positivo válido.`
      );
    }

    const isDelayed = !!lastEventAt && occurredAt.getTime() < lastEventAt.getTime();

    if (!isDelayed) {
      if (newOdometer < currentVehicleKm) {
        throw new InvalidOdometerReadingException(
          `${contextName}: O odômetro informado (${newOdometer} km) não pode ser menor que o odômetro atual do veículo (${currentVehicleKm} km).`
        );
      }
      return {
        isDelayed: false,
        shouldUpdateVehicleKm: newOdometer > currentVehicleKm,
        odometerInconsistent: false,
      };
    }

    // Evento atrasado: verifica limites dos vizinhos temporais mais próximos
    let odometerInconsistent = false;

    if (prevNeighborOdometer !== undefined && prevNeighborOdometer !== null) {
      if (newOdometer < prevNeighborOdometer) {
        odometerInconsistent = true;
      }
    }

    if (nextNeighborOdometer !== undefined && nextNeighborOdometer !== null) {
      if (newOdometer > nextNeighborOdometer) {
        odometerInconsistent = true;
      }
    }

    return {
      isDelayed: true,
      shouldUpdateVehicleKm: false,
      odometerInconsistent,
    };
  }
}

