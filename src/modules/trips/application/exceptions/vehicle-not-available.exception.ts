export class VehicleNotAvailableException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VehicleNotAvailableException';
  }
}