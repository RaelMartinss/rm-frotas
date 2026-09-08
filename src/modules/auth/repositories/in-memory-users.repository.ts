import { IUsersRepository, FindAllUsersParams } from '../domain/repositories/users.repository.interface';
import { User } from '../domain/entities/user.entity';

export class InMemoryUsersRepository implements IUsersRepository {
  public items: User[] = [];

  async save(user: User): Promise<void> {
    const itemIndex = this.items.findIndex((item) => item.getId() === user.getId());

    if (itemIndex >= 0) {
      this.items[itemIndex] = user;
    } else {
      this.items.push(user);
    }
  }

  async findById(id: string): Promise<User | null> {
    const user = this.items.find((item) => item.getId() === id);

    if (!user) {
      return null;
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.items.find(
      (item) => item.getEmail().getValue() === email.toLowerCase().trim(),
    );

    if (!user) {
      return null;
    }

    return user;
  }

  async findAll(params?: FindAllUsersParams | string): Promise<User[]> {
    if (typeof params === 'object' && params?.clientId) {
      return this.items.filter((item) => item.getClientId() === params.clientId);
    }
    return [...this.items];
  }

  async findByClientId(clientId: string): Promise<User[]> {
    return this.items.filter((item) => item.getClientId() === clientId);
  }
}