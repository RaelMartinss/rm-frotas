import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { User, UserRole } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { RoleHierarchyPolicy } from '../../domain/services/role-hierarchy.policy';
import {
  UnauthorizedRoleCreationException,
  UserEmailAlreadyExistsException,
} from '../../domain/exceptions/role-hierarchy.exceptions';

export interface CreateSubordinateUserInput {
  requesterId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface CreateSubordinateUserOutput {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId: string | null;
  temporaryPassword: string;
}

@Injectable()
export class CreateSubordinateUserUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(input: CreateSubordinateUserInput): Promise<CreateSubordinateUserOutput> {
    const requester = await this.usersRepository.findById(input.requesterId);
    if (!requester) {
      throw new NotFoundException('Usuário solicitante não encontrado.');
    }

    // 1. Validação de hierarquia
    const canCreate = RoleHierarchyPolicy.canCreateRole(
      {
        id: requester.getId(),
        role: requester.getRole(),
        clientId: requester.getClientId(),
      },
      input.role,
    );

    if (!canCreate) {
      throw new ForbiddenException(
        new UnauthorizedRoleCreationException(
          `Usuários com papel ${requester.getRole()} não têm permissão para criar usuários com papel ${input.role}.`,
        ).message,
      );
    }

    // 2. Validação de e-mail existente
    const cleanEmail = input.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findByEmail(cleanEmail);
    if (existingUser) {
      throw new UserEmailAlreadyExistsException();
    }

    // 3. Gera a senha temporária
    const temporaryPassword = `Temp#${randomBytes(4).toString('hex').toUpperCase()}`;
    const hashedPasswordVo = await Password.create(temporaryPassword);

    // 4. Cria o usuário subordinado vinculado ao mesmo clientId do solicitante
    const newUser = new User({
      name: input.name,
      email: new Email(cleanEmail),
      password: hashedPasswordVo,
      role: input.role,
      clientId: requester.getClientId(),
      mustChangePassword: true,
      temporaryPasswordSetAt: new Date(),
    });

    await this.usersRepository.save(newUser);

    return {
      id: newUser.getId(),
      name: newUser.getName(),
      email: newUser.getEmail().getValue(),
      role: newUser.getRole(),
      clientId: newUser.getClientId() ?? null,
      temporaryPassword,
    };
  }
}
