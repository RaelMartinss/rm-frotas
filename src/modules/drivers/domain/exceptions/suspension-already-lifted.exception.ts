export class SuspensionAlreadyLiftedException extends Error {
  constructor(suspensionId?: string) {
    super(
      suspensionId
        ? `A suspensão ${suspensionId} já foi encerrada anteriormente.`
        : 'Esta suspensão já foi encerrada anteriormente.',
    );
    this.name = 'SuspensionAlreadyLiftedException';
  }
}
