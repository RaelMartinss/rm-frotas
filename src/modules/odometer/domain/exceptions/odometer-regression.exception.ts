export class OdometerRegressionException extends Error {
  constructor(
    public readonly currentKm: number,
    public readonly previousKm: number,
    public readonly contextName: string = 'Registro',
  ) {
    super(
      `${contextName}: O odômetro informado (${currentKm} km) não pode ser menor que a última leitura registrada (${previousKm} km).`,
    );
    this.name = 'OdometerRegressionException';
  }
}
