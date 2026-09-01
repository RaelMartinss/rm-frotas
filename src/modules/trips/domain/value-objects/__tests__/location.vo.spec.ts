import { describe, it, expect } from 'vitest';
import { Location } from '../location.vo';
import { InvalidLocationException } from '../../exceptions/invalid-location.exception';

describe('Location Value Object', () => {
  it('deve criar um Location válido', () => {
    const location = new Location({
      address: 'Av. Brasil, 1000',
      city: 'Paragominas',
      state: 'pa',
      latitude: -2.998,
      longitude: -47.352,
    });

    expect(location.getAddress()).toBe('Av. Brasil, 1000');
    expect(location.getCity()).toBe('Paragominas');
    expect(location.getState()).toBe('PA');
    expect(location.getValue()).toBe('Av. Brasil, 1000, Paragominas - PA');
  });

  it('deve lançar exceção se o endereço for muito curto', () => {
    expect(
      () =>
        new Location({
          address: 'Ab',
          city: 'Paragominas',
          state: 'PA',
        }),
    ).toThrow(InvalidLocationException);
  });

  it('deve lançar exceção se o estado não tiver 2 letras', () => {
    expect(
      () =>
        new Location({
          address: 'Rua das Flores, 10',
          city: 'Paragominas',
          state: 'PAR',
        }),
    ).toThrow(InvalidLocationException);
  });

  it('deve lançar exceção para latitude inválida', () => {
    expect(
      () =>
        new Location({
          address: 'Rua das Flores, 10',
          city: 'Paragominas',
          state: 'PA',
          latitude: 95,
        }),
    ).toThrow(InvalidLocationException);
  });
});