import { beforeEach, describe, expect, it } from 'vitest';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { DeviceInfo } from '../../../domain/value-objects/device-info.vo';
import { RefreshTokenSession } from '../../../domain/entities/refresh-token-session.entity';
import { LogoutAllDevicesUseCase } from '../logout-all-devices.use-case';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { InMemoryRefreshTokenSessionRepository } from '../../../repositories/in-memory-refresh-token-session.repository';
import { ForbiddenException } from '@nestjs/common';

describe('LogoutAllDevicesUseCase', () => {
  let inMemoryUsersRepository: InMemoryUsersRepository;
  let inMemoryRefreshTokenSessionRepository: InMemoryRefreshTokenSessionRepository;
  let sut: LogoutAllDevicesUseCase;

  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    inMemoryRefreshTokenSessionRepository =
      new InMemoryRefreshTokenSessionRepository();
    sut = new LogoutAllDevicesUseCase(
      inMemoryUsersRepository,
      inMemoryRefreshTokenSessionRepository,
    );
  });

  it('deve revogar todas as sessões ativas do próprio usuário', async () => {
    const password = await Password.create('password123');
    const user = new User({
      name: 'Motorista Carlos',
      email: new Email('carlos@example.com'),
      password,
      role: UserRole.DRIVER,
      clientId: 'client-1',
    });

    await inMemoryUsersRepository.save(user);

    const session1 = RefreshTokenSession.create({
      userId: user.getId(),
      tokenHash: 'hash-1',
      deviceInfo: DeviceInfo.create('mobile'),
    });
    const session2 = RefreshTokenSession.create({
      userId: user.getId(),
      tokenHash: 'hash-2',
      deviceInfo: DeviceInfo.create('mobile'),
    });

    await inMemoryRefreshTokenSessionRepository.save(session1);
    await inMemoryRefreshTokenSessionRepository.save(session2);

    await sut.execute({
      currentUserId: user.getId(),
      currentUserRole: user.getRole(),
      currentClientId: user.getClientId(),
    });

    const activeSessions =
      await inMemoryRefreshTokenSessionRepository.findAllActiveByUserId(
        user.getId(),
      );
    expect(activeSessions).toHaveLength(0);
    expect(session1.isRevoked()).toBe(true);
    expect(session2.isRevoked()).toBe(true);
  });

  it('não deve permitir que DRIVER revogue sessões de outro usuário', async () => {
    await expect(() =>
      sut.execute({
        currentUserId: 'driver-id-1',
        currentUserRole: UserRole.DRIVER,
        currentClientId: 'client-1',
        targetUserId: 'driver-id-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deve permitir que FLEET_MANAGER revogue sessões de um DRIVER da mesma empresa', async () => {
    const password = await Password.create('password123');
    const driver = new User({
      name: 'Motorista Marcos',
      email: new Email('marcos@example.com'),
      password,
      role: UserRole.DRIVER,
      clientId: 'client-1',
    });

    await inMemoryUsersRepository.save(driver);

    const session = RefreshTokenSession.create({
      userId: driver.getId(),
      tokenHash: 'hash-marcos',
      deviceInfo: DeviceInfo.create('mobile'),
    });
    await inMemoryRefreshTokenSessionRepository.save(session);

    await sut.execute({
      currentUserId: 'manager-id',
      currentUserRole: UserRole.FLEET_MANAGER,
      currentClientId: 'client-1',
      targetUserId: driver.getId(),
    });

    const activeSessions =
      await inMemoryRefreshTokenSessionRepository.findAllActiveByUserId(
        driver.getId(),
      );
    expect(activeSessions).toHaveLength(0);
  });

  it('não deve permitir que FLEET_MANAGER revogue sessões de usuário de outro cliente', async () => {
    const password = await Password.create('password123');
    const otherUser = new User({
      name: 'Outro Usuário',
      email: new Email('outro@example.com'),
      password,
      role: UserRole.DRIVER,
      clientId: 'client-2', // Empresa diferente
    });

    await inMemoryUsersRepository.save(otherUser);

    await expect(() =>
      sut.execute({
        currentUserId: 'manager-id',
        currentUserRole: UserRole.FLEET_MANAGER,
        currentClientId: 'client-1',
        targetUserId: otherUser.getId(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
