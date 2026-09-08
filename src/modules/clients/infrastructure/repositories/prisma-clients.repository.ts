import { Injectable } from '@nestjs/common';
import {
  IClientsRepository,
  FindAllClientsParams,
  FindAllClientsResult,
} from '../../domain/repositories/clients.repository.interface';
import { Client } from '../../domain/entities/client.entity';
import { ClientMapper } from '../mappers/client.mapper';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { ClientStatus as PrismaClientStatus } from '@prisma/client';

@Injectable()
export class PrismaClientsRepository implements IClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(client: Client): Promise<Client> {
    const data = ClientMapper.toPersistence(client);
    const created = await this.prisma.client.create({ data });
    return ClientMapper.toDomain(created);
  }

  async update(client: Client): Promise<Client> {
    const data = ClientMapper.toPersistence(client);
    const updated = await this.prisma.client.update({
      where: { id: data.id },
      data,
    });
    return ClientMapper.toDomain(updated);
  }

  async findById(id: string): Promise<Client | null> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) return null;
    return ClientMapper.toDomain(client);
  }

  async findByDocument(document: string): Promise<Client | null> {
    const cleanDoc = document.replace(/\D/g, '');
    const client = await this.prisma.client.findUnique({
      where: { document: cleanDoc },
    });
    if (!client) return null;
    return ClientMapper.toDomain(client);
  }

  async findAll(params?: FindAllClientsParams): Promise<FindAllClientsResult> {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.status) {
      where.status = params.status as PrismaClientStatus;
    }

    if (params?.search) {
      const search = params.search.trim();
      where.OR = [
        { legalName: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { document: { contains: search } },
        { billingEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      clients: clients.map(ClientMapper.toDomain),
      total,
    };
  }
}
