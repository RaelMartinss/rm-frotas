import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import type { IUsersRepository } from '../../../auth/domain/repositories/users.repository.interface';
import { Driver } from '../../domain/entities/driver.entity';
import { User, UserRole } from '../../../auth/domain/entities/user.entity';
import { Cpf } from '../../domain/value-objects/cpf.vo';
import { Cnh } from '../../domain/value-objects/cnh.vo';
import { Email } from '../../../auth/domain/value-objects/email.vo';
import { Password } from '../../../auth/domain/value-objects/password.vo';
import { CreateDriverInputDto } from '../dtos/create-driver.dto';
import { DriverAlreadyExistsException } from '../../domain/exceptions/driver-already-exists.exception';
import { UserEmailAlreadyExistsException } from '../../../auth/domain/exceptions/role-hierarchy.exceptions';

export interface CreateDriverOutput {
  driver: Driver;
  temporaryPassword: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class CreateDriverUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(input: CreateDriverInputDto): Promise<CreateDriverOutput> {
    // 1. Instancia e valida CPF
    const cpf = new Cpf(input.cpf);

    // 2. Verifica se o CPF já está cadastrado na base de motoristas
    const driverWithSameCpf = await this.driversRepository.findByCpf(cpf);
    if (driverWithSameCpf) {
      throw new DriverAlreadyExistsException(cpf.getFormatted());
    }

    // 3. Instancia e valida E-mail
    const cleanEmail = (input.email || '').trim().toLowerCase();
    const emailVo = new Email(cleanEmail);

    // 4. Instancia o VO da CNH (valida tamanho, categoria e data)
    const cnh = new Cnh(
      input.cnhNumber,
      input.cnhCategory,
      input.cnhExpirationDate,
    );

    // 5. Gera a senha temporária para primeiro acesso do motorista
    const temporaryPassword = `Temp#${randomBytes(4).toString('hex').toUpperCase()}`;
    const hashedPasswordVo = await Password.create(temporaryPassword);

    // 6. Verifica se o e-mail já existe na base de usuários
    const existingUser = await this.usersRepository.findByEmail(cleanEmail);

    let targetUser: User;

    if (existingUser) {
      if (existingUser.getRole() === UserRole.DRIVER) {
        // Verifica se este usuário DRIVER já está vinculado a outro motorista
        const driverLinked = await this.driversRepository.findByUserId(existingUser.getId());
        if (driverLinked) {
          throw new UserEmailAlreadyExistsException('Já existe um motorista cadastrado com este e-mail.');
        }

        // Recupera e vincula a conta de usuário previamente criada sem perfil de motorista
        existingUser.setTemporaryPassword(hashedPasswordVo);
        targetUser = existingUser;
        await this.usersRepository.save(targetUser);
      } else {
        throw new UserEmailAlreadyExistsException(
          `Este e-mail já pertence a uma conta de usuário (${existingUser.getRole()}) cadastrada no sistema.`,
        );
      }
    } else {
      // Cria o novo Usuário com papel DRIVER
      targetUser = new User({
        name: input.name,
        email: emailVo,
        password: hashedPasswordVo,
        role: UserRole.DRIVER,
        clientId: input.clientId,
        mustChangePassword: true,
        temporaryPasswordSetAt: new Date(),
      });

      await this.usersRepository.save(targetUser);
    }

    // 7. Cria a entidade de domínio Driver vinculada ao User
    const driver = new Driver({
      name: input.name,
      cpf,
      cnh,
      clientId: input.clientId,
      ownerId: input.ownerId,
      userId: targetUser.getId(),
      phone: input.phone,
    });

    // 8. Persiste o motorista
    await this.driversRepository.save(driver);

    return {
      driver,
      temporaryPassword,
      user: {
        id: targetUser.getId(),
        name: targetUser.getName(),
        email: targetUser.getEmail().getValue(),
        role: targetUser.getRole(),
      },
    };
  }
}