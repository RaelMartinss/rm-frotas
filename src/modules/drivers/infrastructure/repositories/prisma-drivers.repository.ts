import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  IDriversRepository,
  FindManyDriversPaginatedParams,
  FindManyDriversPaginatedOutput,
} from '../../domain/repositories/drivers.repository';
import { Driver } from '../../domain/entities/driver.entity';
import { Cpf } from '../../domain/value-objects/cpf.vo';
import { DriverMapper } from '../mappers/driver.mapper';

@Injectable()
export class PrismaDriversRepository implements IDriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(driver: Driver): Promise<void> {
    const data = DriverMapper.toPrisma(driver);

    await this.prisma.driver.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }

  async findById(id: string): Promise<Driver | null> {
    const raw = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!raw) return null;

    return DriverMapper.toDomain(raw);
  }

  async findByCpf(cpf: Cpf): Promise<Driver | null> {
    const raw = await this.prisma.driver.findUnique({
      where: { cpf: cpf.getValue() },
    });

    if (!raw) return null;

    return DriverMapper.toDomain(raw);
  }

  async findAll(ownerId?: string): Promise<Driver[]> {
    const drivers = await this.prisma.driver.findMany({
      where: ownerId ? { ownerId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return drivers.map(
      (driver: Awaited<ReturnType<typeof this.prisma.driver.findMany>>[number]) =>
        DriverMapper.toDomain(driver),
    );
  }

  async findManyPaginated({
    ownerId,
    status,
    search,
    page,
    limit,
  }: FindManyDriversPaginatedParams): Promise<FindManyDriversPaginatedOutput> {
    const where: any = {
      ...(ownerId && { ownerId }),
      ...(status && { status }),
    };

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { cpf: { contains: term, mode: 'insensitive' } },
        { cnhNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [rawDrivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return {
      drivers: rawDrivers.map(DriverMapper.toDomain),
      total,
    };
  }
}