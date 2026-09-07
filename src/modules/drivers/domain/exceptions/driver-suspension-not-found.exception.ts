export class DriverSuspensionNotFoundException extends Error {
  constructor(id?: string) {
    super(
      id
        ? `Suspensão do motorista com ID ${id} não encontrada.`
        : 'Suspensão do motorista não encontrada.',
    );
    this.name = 'DriverSuspensionNotFoundException';
  }
}
