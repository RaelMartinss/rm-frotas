import { User as PrismaUser, UserRole as PrismaUserRole, UserStatus as PrismaUserStatus } from '@prisma/client';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';

export class UserMapper {
  static toDomain(raw: PrismaUser): User {
    return new User(
      {
        name: raw.name,
        email: new Email(raw.email),
        password: Password.fromHash(raw.password),
        role: raw.role as unknown as UserRole,
        status: raw.status as unknown as UserStatus,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    );
  }

  static toPersistence(user: User): {
    id: string;
    name: string;
    email: string;
    password: string;
    role: PrismaUserRole;
    status: PrismaUserStatus;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail().getValue(),
      password: user.getPassword().getHash(),
      role: user.getRole() as unknown as PrismaUserRole,
      status: user.getStatus() as unknown as PrismaUserStatus,
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }
}