import { describe, expect, it } from 'vitest';
import { DeviceInfo } from '../../value-objects/device-info.vo';
import { RefreshTokenSession } from '../refresh-token-session.entity';
import { SessionAlreadyRevokedException } from '../../exceptions/session-already-revoked.exception';
import { SessionExpiredException } from '../../exceptions/session-expired.exception';

describe('RefreshTokenSession Entity', () => {
  it('deve gerar expiresAt com 60 dias quando a plataforma for mobile', () => {
    const deviceInfo = DeviceInfo.create('mobile');
    const before = Date.now();
    const session = RefreshTokenSession.create({
      userId: 'user-123',
      tokenHash: 'hash-abc',
      deviceInfo,
    });

    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const diff = session.getExpiresAt().getTime() - before;

    expect(diff).toBeGreaterThanOrEqual(sixtyDaysMs - 1000);
    expect(diff).toBeLessThanOrEqual(sixtyDaysMs + 5000);
    expect(session.isValid()).toBe(true);
    expect(session.isRevoked()).toBe(false);
    expect(session.isExpired()).toBe(false);
  });

  it('deve gerar expiresAt com 7 dias quando a plataforma for web', () => {
    const deviceInfo = DeviceInfo.create('web');
    const before = Date.now();
    const session = RefreshTokenSession.create({
      userId: 'user-123',
      tokenHash: 'hash-web',
      deviceInfo,
    });

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diff = session.getExpiresAt().getTime() - before;

    expect(diff).toBeGreaterThanOrEqual(sevenDaysMs - 1000);
    expect(diff).toBeLessThanOrEqual(sevenDaysMs + 5000);
    expect(session.isValid()).toBe(true);
  });

  it('isValid deve retornar false quando revokedAt estiver preenchido', () => {
    const deviceInfo = DeviceInfo.create('web');
    const session = RefreshTokenSession.create({
      userId: 'user-123',
      tokenHash: 'hash-1',
      deviceInfo,
    });

    session.revoke();

    expect(session.isValid()).toBe(false);
    expect(session.isRevoked()).toBe(true);
    expect(session.getRevokedAt()).toBeInstanceOf(Date);
  });

  it('isValid deve retornar false quando expiresAt estiver no passado', () => {
    const deviceInfo = DeviceInfo.create('web');
    const session = RefreshTokenSession.restore({
      id: 'session-old',
      userId: 'user-123',
      tokenHash: 'hash-old',
      deviceInfo,
      expiresAt: new Date(Date.now() - 10000), // já expirou
      revokedAt: null,
      createdAt: new Date(Date.now() - 20000),
    });

    expect(session.isValid()).toBe(false);
    expect(session.isExpired()).toBe(true);
  });

  it('revoke deve lançar SessionAlreadyRevokedException se chamado mais de uma vez', () => {
    const deviceInfo = DeviceInfo.create('web');
    const session = RefreshTokenSession.create({
      userId: 'user-123',
      tokenHash: 'hash-2',
      deviceInfo,
    });

    session.revoke();

    expect(() => session.revoke()).toThrowError(SessionAlreadyRevokedException);
  });

  it('extend deve lançar SessionExpiredException se a sessão já estiver expirada ou revogada', () => {
    const deviceInfo = DeviceInfo.create('web');
    const session = RefreshTokenSession.create({
      userId: 'user-123',
      tokenHash: 'hash-3',
      deviceInfo,
    });

    session.revoke();

    expect(() => session.extend()).toThrowError(SessionExpiredException);
  });

  it('extend deve estender a validade da sessão ativa', () => {
    const deviceInfo = DeviceInfo.create('mobile');
    const session = RefreshTokenSession.create({
      userId: 'user-123',
      tokenHash: 'hash-4',
      deviceInfo,
    });

    const initialExpiresAt = session.getExpiresAt().getTime();
    session.extend();
    const updatedExpiresAt = session.getExpiresAt().getTime();

    expect(updatedExpiresAt).toBeGreaterThanOrEqual(initialExpiresAt);
    expect(session.isValid()).toBe(true);
  });
});
