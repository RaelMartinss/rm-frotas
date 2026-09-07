export class DriverHasActiveTripException extends Error {
  constructor(driverId?: string) {
    super(
      driverId
        ? `Não é possível suspender o motorista ${driverId} pois ele possui uma viagem em andamento.`
        : 'Não é possível suspender o motorista pois ele possui uma viagem em andamento no momento.',
    );
    this.name = 'DriverHasActiveTripException';
  }
}
