import { IUsersRepository } from '../domain/repositories/users.repository.interface';
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
}