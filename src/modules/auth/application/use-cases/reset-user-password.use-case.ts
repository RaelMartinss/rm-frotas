import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { UserRole } from '../../domain/entities/user.entity';
import { Password } from '../../domain/value-objects/password.vo';
import { RoleHierarchyPolicy } from '../../domain/services/role-hierarchy.policy';
import {
  UnauthorizedUserManagementException,
} from '../../domain/exceptions/role-hierarchy.exceptions';
import {
  CrossClientAccessDeniedException,
} from '../../../clients/domain/exceptions/client.exceptions';

export interface ResetUserPasswordInput {
  requesterId: string;
  targetUserId: string;
}

export interface ResetUserPasswordOutput {
  message: string;
  userId: string;
  temporaryPassword: string;
}

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(input: ResetUserPasswordInput): Promise<ResetUserPasswordOutput> {
    const requester = await this.usersRepository.findById(input.requesterId);
    if (!requester) {
      throw new NotFoundException('Usuário solicitante não encontrado.');
    }

    const targetUser = await this.usersRepository.findById(input.targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Usuário alvo não encontrado.');
    }

    // Validação de hierarquia e escopo de cliente
    if (requester.getRole() !== UserRole.SUPER_ADMIN) {
      if (requester.getRole() !== UserRole.FLEET_MANAGER) {
        throw new ForbiddenException(new UnauthorizedUserManagementException().message);
      }

      if (!requester.getClientId() || requester.getClientId() !== targetUser.getClientId()) {
        throw new ForbiddenException(new CrossClientAccessDeniedException().message);
      }

      if (targetUser.getRole() !== UserRole.ADMIN && targetUser.getRole() !== UserRole.DRIVER) {
        throw new ForbiddenException(new UnauthorizedUserManagementException('Você só pode resetar a senha de administradores ou motoristas da sua equipe.').message);
      }
    }

    // Gera nova senha temporária
    const temporaryPassword = `Temp#${randomBytes(4).toString('hex').toUpperCase()}`;
    const hashedPasswordVo = await Password.create(temporaryPassword);

    targetUser.setTemporaryPassword(hashedPasswordVo);
    await this.usersRepository.save(targetUser);

    return {
      message: 'Senha do usuário resetada com sucesso.',
      userId: targetUser.getId(),
      temporaryPassword,
    };
  }
}
