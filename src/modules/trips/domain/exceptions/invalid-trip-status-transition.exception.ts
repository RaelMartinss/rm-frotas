import { TripStatus } from '../entities/trip-status.enum';

export class InvalidTripStatusTransitionException extends Error {
  constructor(from: TripStatus, to: TripStatus) {
    super(`Transição inválida do status de viagem de '${from}' para '${to}'.`);
    this.name = 'InvalidTripStatusTransitionException';
  }
}