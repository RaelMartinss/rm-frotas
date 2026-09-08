import { Injectable } from '@nestjs/common';
import { IClientsRepository } from '../../domain/repositories/clients.repository.interface';
import { Client } from '../../domain/entities/client.entity';
import { ClientNotFoundException } from '../../domain/exceptions/client.exceptions';

@Injectable()
export class ReactivateClientUseCase {
  constructor(private readonly clientsRepository: IClientsRepository) {}

  async execute(id: string): Promise<Client> {
    const client = await this.clientsRepository.findById(id);
    if (!client) {
      throw new ClientNotFoundException();
    }

    client.reactivate();
    return this.clientsRepository.update(client);
  }
}
