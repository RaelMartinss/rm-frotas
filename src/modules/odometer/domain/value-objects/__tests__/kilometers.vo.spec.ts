import { describe, expect, it } from 'vitest';
import { Kilometers } from '../kilometers.vo';
import { InvalidKilometersException } from '../../exceptions/invalid-kilometers.exception';

describe('Kilometers Value Object', () => {
  it('should create valid Kilometers with integer >= 0', () => {
    const km0 = new Kilometers(0);
    expect(km0.getValue()).toBe(0);

    const km100 = new Kilometers(100);
    expect(km100.getValue()).toBe(100);
  });

  it('should throw InvalidKilometersException if value is negative', () => {
    expect(() => new Kilometers(-1)).toThrow(InvalidKilometersException);
    expect(() => new Kilometers(-50)).toThrow('A quilometragem não pode ser negativa.');
  });

  it('should throw InvalidKilometersException if value is not an integer', () => {
    expect(() => new Kilometers(12.5)).toThrow(InvalidKilometersException);
    expect(() => new Kilometers(12.5)).toThrow('A quilometragem deve ser um número inteiro.');
  });

  it('should throw InvalidKilometersException if value is NaN or not a number', () => {
    expect(() => new Kilometers(NaN)).toThrow(InvalidKilometersException);
    expect(() => new Kilometers(undefined as any)).toThrow(InvalidKilometersException);
    expect(() => new Kilometers(null as any)).toThrow(InvalidKilometersException);
  });

  it('should correctly compare Kilometers', () => {
    const km10 = new Kilometers(10);
    const km20 = new Kilometers(20);
    const km10b = new Kilometers(10);

    expect(km10.isLessThan(km20)).toBe(true);
    expect(km20.isGreaterThan(km10)).toBe(true);
    expect(km10.equals(km10b)).toBe(true);
    expect(km10.isLessThan(km10b)).toBe(false);
  });
});
