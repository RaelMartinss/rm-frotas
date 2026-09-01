import { Inject, Injectable, ConflictException } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { User, UserRole } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';

interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute({ name, email, password, role }: RegisterUserInput): Promise<User> {
    const emailVO = new Email(email);

    const userExists = await this.usersRepository.findByEmail(emailVO.getValue());
    if (userExists) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail.');
    }

    const hashedPassword = await Password.create(password);

    const user = new User({
      name,
      email: emailVO,
      password: hashedPassword,
      role,
    });

    await this.usersRepository.save(user);

    return user;
  }
}