import { Injectable, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IClientsRepository } from '../../domain/repositories/clients.repository.interface';
import type { IUsersRepository } from '../../../auth/domain/repositories/users.repository.interface';
import { Client } from '../../domain/entities/client.entity';
import { ClientDocument } from '../../domain/value-objects/document.vo';
import { Address, AddressProps } from '../../domain/value-objects/address.vo';
import { User, UserRole } from '../../../auth/domain/entities/user.entity';
import { Email } from '../../../auth/domain/value-objects/email.vo';
import { Password } from '../../../auth/domain/value-objects/password.vo';
import {
  ClientDocumentAlreadyExistsException,
} from '../../domain/exceptions/client.exceptions';
import {
  UserEmailAlreadyExistsException,
} from '../../../auth/domain/exceptions/role-hierarchy.exceptions';

export interface OnboardClientInput {
  legalName: string;
  tradeName: string;
  document: string;
  billingEmail: string;
  address?: AddressProps | null;
  fleetManagerName: string;
  fleetManagerEmail: string;
}

export interface OnboardClientOutput {
  client: {
    id: string;
    legalName: string;
    tradeName: string;
    document: string;
    billingEmail: string;
    status: string;
    address: AddressProps | null;
    createdAt: Date;
  };
  fleetManager: {
    id: string;
    name: string;
    email: string;
    role: string;
    temporaryPassword: string;
  };
}

@Injectable()
export class OnboardClientUseCase {
  constructor(
    private readonly clientsRepository: IClientsRepository,
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(input: OnboardClientInput): Promise<OnboardClientOutput> {
    const documentVo = new ClientDocument(input.document);

    // 1. Verifica se já existe cliente com o documento
    const existingClient = await this.clientsRepository.findByDocument(documentVo.getValue());
    if (existingClient) {
      throw new ClientDocumentAlreadyExistsException();
    }

    // 2. Verifica se o e-mail do gestor já está em uso
    const existingUser = await this.usersRepository.findByEmail(input.fleetManagerEmail.trim().toLowerCase());
    if (existingUser) {
      throw new UserEmailAlreadyExistsException('O e-mail informado para o Gestor de Frota já está em uso.');
    }

    // 3. Cria a entidade Client
    const client = new Client({
      legalName: input.legalName,
      tradeName: input.tradeName,
      document: documentVo,
      billingEmail: input.billingEmail,
      address: input.address ? new Address(input.address) : null,
    });

    const savedClient = await this.clientsRepository.create(client);

    // 4. Gera a senha temporária para o primeiro FLEET_MANAGER
    const temporaryPassword = `Temp#${randomBytes(4).toString('hex').toUpperCase()}`;
    const hashedPasswordVo = await Password.create(temporaryPassword);

    // 5. Cria o usuário FLEET_MANAGER associado ao cliente
    const fleetManager = new User({
      name: input.fleetManagerName,
      email: new Email(input.fleetManagerEmail),
      password: hashedPasswordVo,
      role: UserRole.FLEET_MANAGER,
      clientId: savedClient.getId(),
      mustChangePassword: true,
      temporaryPasswordSetAt: new Date(),
    });

    await this.usersRepository.save(fleetManager);

    return {
      client: {
        id: savedClient.getId(),
        legalName: savedClient.getLegalName(),
        tradeName: savedClient.getTradeName(),
        document: savedClient.getDocument().getFormatted(),
        billingEmail: savedClient.getBillingEmail(),
        status: savedClient.getStatus(),
        address: savedClient.getAddress()?.toJSON() ?? null,
        createdAt: savedClient.getCreatedAt(),
      },
      fleetManager: {
        id: fleetManager.getId(),
        name: fleetManager.getName(),
        email: fleetManager.getEmail().getValue(),
        role: fleetManager.getRole(),
        temporaryPassword,
      },
    };
  }
}
