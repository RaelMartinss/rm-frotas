import { Injectable } from '@nestjs/common';
import { IUsersRepository, FindAllUsersParams } from '../../domain/repositories/users.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaUsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);

    await this.prisma.user.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return UserMapper.toDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return UserMapper.toDomain(user);
  }

  async findAll(params?: FindAllUsersParams | string): Promise<User[]> {
    let where: any = {};

    if (typeof params === 'string') {
      // Backward compatibility if called with an ownerId string
      where = {
        OR: [
          { id: params },
          { driverProfile: { ownerId: params } },
        ],
      };
    } else if (params) {
      if (params.clientId !== undefined) {
        where.clientId = params.clientId;
      }
      if (params.role) {
        where.role = params.role;
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(UserMapper.toDomain);
  }

  async findByClientId(clientId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(UserMapper.toDomain);
  }
}