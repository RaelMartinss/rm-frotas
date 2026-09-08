import { Injectable } from '@nestjs/common';
import {
  IClientsRepository,
  FindAllClientsParams,
  FindAllClientsResult,
} from '../../domain/repositories/clients.repository.interface';

@Injectable()
export class ListAllClientsUseCase {
  constructor(private readonly clientsRepository: IClientsRepository) {}

  async execute(params?: FindAllClientsParams): Promise<FindAllClientsResult> {
    return this.clientsRepository.findAll(params);
  }
}
