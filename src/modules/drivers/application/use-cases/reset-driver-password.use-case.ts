import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import type { IUsersRepository } from '../../../auth/domain/repositories/users.repository.interface';
import { User, UserRole } from '../../../auth/domain/entities/user.entity';
import { Password } from '../../../auth/domain/value-objects/password.vo';
import { Email } from '../../../auth/domain/value-objects/email.vo';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';

export interface ResetDriverPasswordInput {
  driverId: string;
  requesterId: string;
  requesterRole: string;
  requesterClientId?: string | null;
}

export interface ResetDriverPasswordOutput {
  message: string;
  driverId: string;
  driverName: string;
  temporaryPassword: string;
}

@Injectable()
export class ResetDriverPasswordUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(input: ResetDriverPasswordInput): Promise<ResetDriverPasswordOutput> {
    const driver = await this.driversRepository.findById(input.driverId);
    if (!driver) {
      throw new DriverNotFoundException(input.driverId);
    }

    // Validação de escopo de cliente/tenant
    if (input.requesterRole !== UserRole.SUPER_ADMIN) {
      if (
        input.requesterClientId &&
        driver.getClientId() &&
        driver.getClientId() !== input.requesterClientId
      ) {
        throw new ForbiddenException('Acesso negado aos dados de motoristas de outra organização.');
      }
    }

    const temporaryPassword = `Temp#${randomBytes(4).toString('hex').toUpperCase()}`;
    const hashedPasswordVo = await Password.create(temporaryPassword);

    let targetUser: User | null = null;
    const userId = driver.getUserId();

    if (userId) {
      targetUser = await this.usersRepository.findById(userId);
    }

    if (targetUser) {
      targetUser.setTemporaryPassword(hashedPasswordVo);
      await this.usersRepository.save(targetUser);
    } else {
      // Cria a conta de usuário caso seja um motorista legado sem User associado
      const generatedEmail = `motorista.${driver.getCpf().getValue()}@rmfrotas.com.br`;
      const newUser = new User({
        name: driver.getName(),
        email: new Email(generatedEmail),
        password: hashedPasswordVo,
        role: UserRole.DRIVER,
        clientId: driver.getClientId(),
        mustChangePassword: true,
        temporaryPasswordSetAt: new Date(),
      });

      await this.usersRepository.save(newUser);
      driver.setUserId(newUser.getId());
      await this.driversRepository.save(driver);
    }

    return {
      message: 'Senha do motorista resetada com sucesso.',
      driverId: driver.getId(),
      driverName: driver.getName(),
      temporaryPassword,
    };
  }
}
