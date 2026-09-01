import * as bcrypt from 'bcrypt';

export class Password {
  private constructor(private readonly hash: string) {}

  // Cria o VO a partir de uma senha em texto puro (hasheando)
  static async create(plainText: string): Promise<Password> {
    if (!plainText || plainText.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }
    const hashed = await bcrypt.hash(plainText, 10);
    return new Password(hashed);
  }

  // Restaura a partir de um hash já existente do banco
  static fromHash(hash: string): Password {
    return new Password(hash);
  }

  async matches(plainText: string): Promise<boolean> {
    return bcrypt.compare(plainText, this.hash);
  }

  getHash(): string {
    return this.hash;
  }
}