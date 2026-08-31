import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
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

  async findAll(): Promise<Driver[]> {
    const drivers = await this.prisma.driver.findMany();

    return drivers.map(
      (driver: Awaited<ReturnType<typeof this.prisma.driver.findMany>>[number]) =>
        DriverMapper.toDomain(driver),
    );
  }
}