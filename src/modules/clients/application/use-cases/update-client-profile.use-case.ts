import { Injectable } from '@nestjs/common';
import { IClientsRepository } from '../../domain/repositories/clients.repository.interface';
import { Client } from '../../domain/entities/client.entity';
import { Address, AddressProps } from '../../domain/value-objects/address.vo';
import { ClientNotFoundException } from '../../domain/exceptions/client.exceptions';

export interface UpdateClientProfileInput {
  id: string;
  legalName?: string;
  tradeName?: string;
  billingEmail?: string;
  address?: AddressProps | null;
}

@Injectable()
export class UpdateClientProfileUseCase {
  constructor(private readonly clientsRepository: IClientsRepository) {}

  async execute(input: UpdateClientProfileInput): Promise<Client> {
    const client = await this.clientsRepository.findById(input.id);
    if (!client) {
      throw new ClientNotFoundException();
    }

    client.updateProfile({
      legalName: input.legalName,
      tradeName: input.tradeName,
      billingEmail: input.billingEmail,
      address: input.address !== undefined ? (input.address ? new Address(input.address) : null) : undefined,
    });

    return this.clientsRepository.update(client);
  }
}
