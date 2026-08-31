import { describe, it, expect } from 'vitest';
import { Cnh } from '../cnh.vo';
import { InvalidCnhException } from '../../exceptions/invalid-cnh.exception';

describe('Cnh Value Object', () => {
  it('deve criar uma CNH válida com sucesso', () => {
    const cnh = new Cnh('12345678901', 'AB', new Date('2030-01-01'));
    expect(cnh.getNumber()).toBe('12345678901');
    expect(cnh.getCategory()).toBe('AB');
    expect(cnh.getExpirationDate()).toEqual(new Date('2030-01-01'));
  });

  it('deve lançar InvalidCnhException se o número não tiver 11 dígitos', () => {
    expect(() => new Cnh('12345', 'B', new Date('2030-01-01'))).toThrow(InvalidCnhException);
  });

  it('deve lançar InvalidCnhException para categoria inválida', () => {
    expect(() => new Cnh('12345678901', 'Z', new Date('2030-01-01'))).toThrow(InvalidCnhException);
  });

  it('deve verificar se a CNH está vencida usando uma data de referência (teste determinístico)', () => {
    const expiration = new Date('2025-12-31');
    const cnh = new Cnh('12345678901', 'D', expiration);

    const dateBeforeExpiration = new Date('2025-06-01');
    const dateAfterExpiration = new Date('2026-01-01');

    expect(cnh.isExpired(dateBeforeExpiration)).toBe(false);
    expect(cnh.isExpired(dateAfterExpiration)).toBe(true);
  });
});