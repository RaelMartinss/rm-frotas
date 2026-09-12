import { Kilometers } from '../value-objects/kilometers.vo';
import { OdometerSource } from '../value-objects/odometer-source.vo';
import { OdometerRegressionException } from '../exceptions/odometer-regression.exception';
import { randomUUID } from 'crypto';

export interface OdometerReadingProps {
  id: string;
  clientId: string;
  vehicleId: string;
  ownerId: string;
  previousKm: Kilometers;
  currentKm: Kilometers;
  source: OdometerSource;
  sourceId: string;
  recordedAt: Date;
  correctedFromId?: string | null;
  reason?: string | null;
  createdAt: Date;
}

export interface CreateOdometerReadingParams {
  id?: string;
  clientId: string;
  vehicleId: string;
  ownerId: string;
  previousKm: number;
  currentKm: number;
  source: OdometerSource;
  sourceId: string;
  recordedAt?: Date;
  correctedFromId?: string | null;
  reason?: string | null;
  createdAt?: Date;
}

export class OdometerReading {
  private readonly props: OdometerReadingProps;

  constructor(props: OdometerReadingProps) {
    this.props = props;
  }

  public static create(params: CreateOdometerReadingParams): OdometerReading {
    if (!params.sourceId || !params.sourceId.trim()) {
      throw new Error('sourceId é obrigatório para registrar uma leitura de odômetro.');
    }

    if (!params.clientId || !params.clientId.trim()) {
      throw new Error('clientId é obrigatório para registrar uma leitura de odômetro.');
    }

    if (!params.vehicleId || !params.vehicleId.trim()) {
      throw new Error('vehicleId é obrigatório para registrar uma leitura de odômetro.');
    }

    if (!params.ownerId || !params.ownerId.trim()) {
      throw new Error('ownerId é obrigatório para registrar uma leitura de odômetro.');
    }

    const previousKmVo = new Kilometers(params.previousKm);
    const currentKmVo = new Kilometers(params.currentKm);

    // Invariante 1: Regressão não é permitida, a menos que seja correção MANUAL
    if (params.source !== OdometerSource.MANUAL && currentKmVo.isLessThan(previousKmVo)) {
      throw new OdometerRegressionException(
        currentKmVo.getValue(),
        previousKmVo.getValue(),
        params.source,
      );
    }

    // Invariante 2: Correção MANUAL exige justificativa
    if (params.source === OdometerSource.MANUAL) {
      if (!params.reason || !params.reason.trim()) {
        throw new Error('Justificativa é obrigatória para correções manuais de odômetro.');
      }
    }

    return new OdometerReading({
      id: params.id ?? randomUUID(),
      clientId: params.clientId,
      vehicleId: params.vehicleId,
      ownerId: params.ownerId,
      previousKm: previousKmVo,
      currentKm: currentKmVo,
      source: params.source,
      sourceId: params.sourceId,
      recordedAt: params.recordedAt ?? new Date(),
      correctedFromId: params.correctedFromId ?? null,
      reason: params.reason ? params.reason.trim() : null,
      createdAt: params.createdAt ?? new Date(),
    });
  }

  public getId(): string {
    return this.props.id;
  }

  public getClientId(): string {
    return this.props.clientId;
  }

  public getVehicleId(): string {
    return this.props.vehicleId;
  }

  public getOwnerId(): string {
    return this.props.ownerId;
  }

  public getPreviousKm(): Kilometers {
    return this.props.previousKm;
  }

  public getCurrentKm(): Kilometers {
    return this.props.currentKm;
  }

  public getSource(): OdometerSource {
    return this.props.source;
  }

  public getSourceId(): string {
    return this.props.sourceId;
  }

  public getRecordedAt(): Date {
    return this.props.recordedAt;
  }

  public getCorrectedFromId(): string | null {
    return this.props.correctedFromId ?? null;
  }

  public getReason(): string | null {
    return this.props.reason ?? null;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt;
  }
}
