import { InvalidCpfException } from '../exceptions/invalid-cpf.exception';

export class Cpf {
  private readonly value: string;

  constructor(value: string) {
    const cleaned = this.clean(value);

    if (!this.validate(cleaned)) {
      throw new InvalidCpfException(value);
    }

    this.value = cleaned;
  }

  public getValue(): string {
    return this.value;
  }
  public getFormatted(): string {
    return this.value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  public equals(other: Cpf): boolean {
    return this.value === other.getValue();
  }
  public clean(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  private validate(cpf: string): boolean {
    if (cpf.length !== 11) return false;

    // Bloqueia CPFs com todos os dígitos iguais (ex: 111.111.111-11)
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validação do 1º Dígito Verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i), 10) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9), 10)) return false;

    // Validação do 2º Dígito Verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i), 10) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10), 10)) return false;

    return true;
  }
}
