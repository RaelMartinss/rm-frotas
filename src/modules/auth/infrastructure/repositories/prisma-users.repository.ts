import { Injectable } from '@nestjs/common';
import { IUsersRepository } from '../../domain/repositories/users.repository.interface';
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

  async findAll(ownerId?: string): Promise<User[]> {
    const targetOwnerId = ownerId ?? '__NO_OWNER__';
    const where = {
      OR: [
        { id: targetOwnerId },
        { driverProfile: { ownerId: targetOwnerId } },
      ],
    };

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(UserMapper.toDomain);
  }
}