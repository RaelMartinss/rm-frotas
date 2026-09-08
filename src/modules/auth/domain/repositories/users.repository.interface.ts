import { User, UserRole } from '../entities/user.entity';

export interface FindAllUsersParams {
  clientId?: string | null;
  role?: UserRole;
}

export interface IUsersRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(params?: FindAllUsersParams | string): Promise<User[]>;
  findByClientId(clientId: string): Promise<User[]>;
}