import {
  Driver as PrismaDriver,
  DriverStatus as PrismaDriverStatus,
} from '@prisma/client';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverStatus } from '../../domain/entities/driver-status.enum';
import { Cpf } from '../../domain/value-objects/cpf.vo';
import { Cnh } from '../../domain/value-objects/cnh.vo';

export class DriverMapper {
  /**
   * Converte o registro do banco (Prisma) em uma Entidade de Domínio (Driver).
   */
  static toDomain(raw: PrismaDriver): Driver {
    return new Driver(
      {
        name: raw.name,
        cpf: Cpf.restore(raw.cpf),
        cnh: Cnh.restore(
          raw.cnhNumber,
          raw.cnhCategory,
          raw.cnhExpirationDate,
        ),
        cnhExpirationDate: raw.cnhExpirationDate,
        status: raw.status as unknown as DriverStatus,
        clientId: raw.clientId,
        ownerId: raw.ownerId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    );
  }

  /**
   * Converte a Entidade de Domínio (Driver) no formato esperado pelo Prisma.
   */
  static toPrisma(driver: Driver) {
    const ownerId = driver.getOwnerId() ?? process.env.DEFAULT_OWNER_ID;

    if (!ownerId) {
      throw new Error(`Driver ${driver.getId()} must have an ownerId to be persisted.`);
    }

    const clientId = driver.getClientId() ?? process.env.DEFAULT_CLIENT_ID;
    if (!clientId) {
      throw new Error(`Driver ${driver.getId()} must have a clientId to be persisted.`);
    }

    return {
      id: driver.getId(),
      name: driver.getName(),
      cpf: driver.getCpf().getValue(),
      cnhNumber: driver.getCnh().getNumber(),
      cnhCategory: driver.getCnh().getCategory(),
      cnhExpirationDate: driver.getCnh().getExpirationDate(),
      status: driver.getStatus() as unknown as PrismaDriverStatus,
      clientId,
      ownerId,
      createdAt: driver.getCreatedAt(),
      updatedAt: driver.getUpdatedAt(),
    };
  }
}