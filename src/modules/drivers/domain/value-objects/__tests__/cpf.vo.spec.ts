import { InvalidCpfException } from '../../exceptions/invalid-cpf.exception';
import { Cpf } from '../cpf.vo';

describe('Cpf Value Object', () => {
  it('deve criar um CPF válido com formatação', () => {
    const cpf = new Cpf('529.982.247-25');
    expect(cpf.getValue()).toBe('52998224725');
    expect(cpf.getFormatted()).toBe('529.982.247-25');
  });

  it('deve aceitar CPF válido sem formatação', () => {
    const cpf = new Cpf('52998224725');
    expect(cpf.getValue()).toBe('52998224725');
  });

  it('deve lançar InvalidCpfException para CPF com dígitos verificadores inválidos', () => {
    expect(() => new Cpf('123.456.789-00')).toThrow(InvalidCpfException);
  });

  it('deve lançar InvalidCpfException para CPF com todos dígitos iguais', () => {
    expect(() => new Cpf('111.111.111-11')).toThrow(InvalidCpfException);
  });

  it('deve lançar InvalidCpfException para tamanhos incorretos', () => {
    expect(() => new Cpf('12345')).toThrow(InvalidCpfException);
  });

  it('deve comparar dois CPFs com sucesso', () => {
    const cpf1 = new Cpf('52998224725');
    const cpf2 = new Cpf('529.982.247-25');
    expect(cpf1.equals(cpf2)).toBe(true);
  });
});
