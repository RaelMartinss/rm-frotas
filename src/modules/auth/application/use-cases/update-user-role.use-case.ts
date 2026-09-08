import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { UserRole } from '../../domain/entities/user.entity';
import { RoleHierarchyPolicy } from '../../domain/services/role-hierarchy.policy';
import {
  SelfRoleEscalationException,
  UnauthorizedRoleCreationException,
} from '../../domain/exceptions/role-hierarchy.exceptions';

export interface UpdateUserRoleInput {
  requesterId: string;
  targetUserId: string;
  newRole: UserRole;
}

export interface UpdateUserRoleOutput {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable()
export class UpdateUserRoleUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(input: UpdateUserRoleInput): Promise<UpdateUserRoleOutput> {
    if (input.requesterId === input.targetUserId) {
      throw new ForbiddenException(new SelfRoleEscalationException().message);
    }

    const requester = await this.usersRepository.findById(input.requesterId);
    if (!requester) {
      throw new NotFoundException('Usuário solicitante não encontrado.');
    }

    const targetUser = await this.usersRepository.findById(input.targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Usuário alvo não encontrado.');
    }

    const canAssign = RoleHierarchyPolicy.canAssignRole(
      {
        id: requester.getId(),
        role: requester.getRole(),
        clientId: requester.getClientId(),
      },
      {
        id: targetUser.getId(),
        role: targetUser.getRole(),
        clientId: targetUser.getClientId(),
      },
      input.newRole,
    );

    if (!canAssign) {
      throw new ForbiddenException(
        new UnauthorizedRoleCreationException('Você não possui permissão para atribuir este papel ao usuário informado.').message,
      );
    }

    targetUser.setRole(input.newRole);
    await this.usersRepository.save(targetUser);

    return {
      id: targetUser.getId(),
      name: targetUser.getName(),
      email: targetUser.getEmail().getValue(),
      role: targetUser.getRole(),
    };
  }
}
