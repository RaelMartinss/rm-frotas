import { InvalidEmailException } from '../exceptions/invalid-email.exception';

export class Email {
  private readonly value: string;

  constructor(email: string) {
    if (!email || !this.validate(email)) {
      throw new InvalidEmailException();
    }
    this.value = email.toLowerCase().trim();
  }

  private validate(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getValue(): string {
    return this.value;
  }
}