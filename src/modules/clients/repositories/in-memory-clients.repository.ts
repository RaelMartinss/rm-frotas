import { IClientsRepository, FindAllClientsParams, FindAllClientsResult } from '../domain/repositories/clients.repository.interface';
import { Client } from '../domain/entities/client.entity';

export class InMemoryClientsRepository implements IClientsRepository {
  public items: Client[] = [];

  async create(client: Client): Promise<Client> {
    this.items.push(client);
    return client;
  }

  async update(client: Client): Promise<Client> {
    const index = this.items.findIndex((item) => item.getId() === client.getId());
    if (index >= 0) {
      this.items[index] = client;
    } else {
      this.items.push(client);
    }
    return client;
  }

  async findById(id: string): Promise<Client | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }

  async findByDocument(document: string): Promise<Client | null> {
    return this.items.find((item) => item.getDocument().getValue() === document) ?? null;
  }

  async findAll(params?: FindAllClientsParams): Promise<FindAllClientsResult> {
    let filtered = [...this.items];
    if (params?.status) {
      filtered = filtered.filter((item) => item.getStatus() === params.status);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.getLegalName().toLowerCase().includes(s) ||
          item.getTradeName().toLowerCase().includes(s) ||
          item.getDocument().getValue().includes(s),
      );
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    return { clients: paginated, total: filtered.length };
  }
}
