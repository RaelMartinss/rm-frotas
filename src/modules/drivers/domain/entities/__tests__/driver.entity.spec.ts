import { describe, it, expect, beforeEach } from 'vitest';
import { Driver } from '../driver.entity';
import { DriverStatus } from '../driver-status.enum';
import { Cpf } from '../../value-objects/cpf.vo';
import { Cnh } from '../../value-objects/cnh.vo';
import { InvalidDriverStatusTransitionException } from '../../exceptions/invalid-driver-status-transition.exception';

describe('Driver Entity', () => {
  let validCpf: Cpf;
  let validCnh: Cnh;

  beforeEach(() => {
    validCpf = new Cpf('529.982.247-25');
    validCnh = new Cnh('12345678900', 'AB', new Date('2030-01-01'));
  });

  it('deve criar um motorista com status ACTIVE por padrão', () => {
    const driver = new Driver({
      name: 'João Silva',
      cpf: validCpf,
      cnh: validCnh,
    });

    expect(driver.getId()).toBeDefined();
    expect(driver.getName()).toBe('João Silva');
    expect(driver.getStatus()).toBe(DriverStatus.ACTIVE);
    expect(driver.getCreatedAt()).toBeInstanceOf(Date);
    expect(driver.getUpdatedAt()).toBeInstanceOf(Date);
  });

  describe('Transições de Status', () => {
    it('deve desativar um motorista ativo', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
        status: DriverStatus.ACTIVE,
      });

      driver.deactivate();

      expect(driver.getStatus()).toBe(DriverStatus.INACTIVE);
    });

    it('deve suspender um motorista ativo', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
        status: DriverStatus.ACTIVE,
      });

      driver.suspend();

      expect(driver.getStatus()).toBe(DriverStatus.SUSPENDED);
    });

    it('deve reativar um motorista inativo ou suspenso', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
        status: DriverStatus.SUSPENDED,
      });

      driver.activate();

      expect(driver.getStatus()).toBe(DriverStatus.ACTIVE);
    });
  });

  describe('Exceções de Transição de Status', () => {
    it('deve lançar exceção ao tentar ativar um motorista que já está ACTIVE', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
        status: DriverStatus.ACTIVE,
      });

      expect(() => driver.activate()).toThrow(InvalidDriverStatusTransitionException);
    });

    it('deve lançar exceção ao tentar desativar um motorista que já está INACTIVE', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
        status: DriverStatus.INACTIVE,
      });

      expect(() => driver.deactivate()).toThrow(InvalidDriverStatusTransitionException);
    });

    it('deve lançar exceção ao tentar suspender um motorista que está INACTIVE', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
        status: DriverStatus.INACTIVE,
      });

      expect(() => driver.suspend()).toThrow(InvalidDriverStatusTransitionException);
    });

    it('deve lançar exceção ao tentar suspender um motorista que já está SUSPENDED', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
        status: DriverStatus.SUSPENDED,
      });

      expect(() => driver.suspend()).toThrow(InvalidDriverStatusTransitionException);
    });
  });

  describe('Atualização de CNH', () => {
    it('deve atualizar a CNH do motorista e atualizar o campo updatedAt', () => {
      const driver = new Driver({
        name: 'João Silva',
        cpf: validCpf,
        cnh: validCnh,
      });

      const newCnh = new Cnh('98765432100', 'D', new Date('2032-05-10'));
      const oldUpdatedAt = driver.getUpdatedAt();

      driver.updateCnh(newCnh);

      expect(driver.getCnh()).toBe(newCnh);
      expect(driver.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());
    });
  });

  describe('Validação de Vencimento de CNH e Prazos', () => {
    it('deve calcular corretamente os dias até o vencimento', () => {
      const expirationDate = new Date('2026-09-15');
      const driver = new Driver({
        name: 'Gael Silva',
        cpf: validCpf,
        cnh: new Cnh('12345678900', 'B', expirationDate),
      });

      const refDate = new Date('2026-09-10');
      expect(driver.getDaysUntilCnhExpires(refDate)).toBe(5);
    });

    it('deve retornar <= 1 dia como bloqueado para viagem', () => {
      const expirationDate = new Date('2026-09-11');
      const driver = new Driver({
        name: 'Gael Silva',
        cpf: validCpf,
        cnh: new Cnh('12345678900', 'B', expirationDate),
      });

      // Hoje = 10/09, Vence = 11/09 (1 dia restante) -> DEVE BLOQUEAR
      const refToday = new Date('2026-09-10');
      expect(driver.getDaysUntilCnhExpires(refToday)).toBe(1);
      expect(driver.isCnhInvalidOrExpiringSoon(refToday, 1)).toBe(true);
      expect(driver.isCnhExpired(refToday)).toBe(false);

      // Hoje = 11/09 (vence hoje) -> DEVE BLOQUEAR
      const refExpirationDay = new Date('2026-09-11');
      expect(driver.getDaysUntilCnhExpires(refExpirationDay)).toBe(0);
      expect(driver.isCnhInvalidOrExpiringSoon(refExpirationDay, 1)).toBe(true);

      // Hoje = 12/09 (vencida) -> DEVE BLOQUEAR e constar como vencida
      const refExpired = new Date('2026-09-12');
      expect(driver.getDaysUntilCnhExpires(refExpired)).toBe(-1);
      expect(driver.isCnhExpired(refExpired)).toBe(true);
      expect(driver.isCnhInvalidOrExpiringSoon(refExpired, 1)).toBe(true);

      // Hoje = 09/09 (2 dias restantes) -> NÃO DEVE BLOQUEAR no threshold de 1 dia
      const refSafe = new Date('2026-09-09');
      expect(driver.getDaysUntilCnhExpires(refSafe)).toBe(2);
      expect(driver.isCnhInvalidOrExpiringSoon(refSafe, 1)).toBe(false);
    });
  });
});