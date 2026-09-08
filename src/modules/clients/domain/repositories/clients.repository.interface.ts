import { Client } from '../entities/client.entity';

export interface FindAllClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface FindAllClientsResult {
  clients: Client[];
  total: number;
}

export abstract class IClientsRepository {
  abstract create(client: Client): Promise<Client>;
  abstract update(client: Client): Promise<Client>;
  abstract findById(id: string): Promise<Client | null>;
  abstract findByDocument(document: string): Promise<Client | null>;
  abstract findAll(params?: FindAllClientsParams): Promise<FindAllClientsResult>;
}
