export class DriverAlreadySuspendedException extends Error {
  constructor(driverId?: string) {
    super(
      driverId
        ? `O motorista com ID ${driverId} já possui uma suspensão ativa.`
        : 'O motorista já possui uma suspensão ativa no momento.',
    );
    this.name = 'DriverAlreadySuspendedException';
  }
}
