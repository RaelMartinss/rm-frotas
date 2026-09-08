import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FLEET_MANAGER = 'FLEET_MANAGER',
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface UserProps {
  name: string;
  email: Email;
  password: Password;
  role: UserRole;
  clientId?: string | null;
  mustChangePassword?: boolean;
  temporaryPasswordSetAt?: Date | null;
  status?: UserStatus;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private id: string;
  private props: UserProps;

  constructor(props: UserProps, id?: string) {
    this.id = id ?? crypto.randomUUID();
    this.props = {
      ...props,
      clientId: props.clientId ?? null,
      mustChangePassword: props.mustChangePassword ?? false,
      temporaryPasswordSetAt: props.temporaryPasswordSetAt ?? null,
      status: props.status ?? UserStatus.ACTIVE,
      isActive: props.isActive ?? true,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  getId(): string { return this.id; }
  getName(): string { return this.props.name; }
  getEmail(): Email { return this.props.email; }
  getPassword(): Password { return this.props.password; }
  getRole(): UserRole { return this.props.role; }
  getClientId(): string | null | undefined { return this.props.clientId; }
  getMustChangePassword(): boolean { return this.props.mustChangePassword ?? false; }
  getTemporaryPasswordSetAt(): Date | null | undefined { return this.props.temporaryPasswordSetAt; }
  getStatus(): UserStatus { return this.props.status!; }
  isActive(): boolean { return this.props.isActive!; }
  getCreatedAt(): Date { return this.props.createdAt!; }
  getUpdatedAt(): Date { return this.props.updatedAt!; }

  setName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('O nome não pode estar em branco.');
    }
    this.props.name = name.trim();
    this.props.updatedAt = new Date();
  }

  setRole(role: UserRole): void {
    this.props.role = role;
    this.props.updatedAt = new Date();
  }

  setStatus(status: UserStatus): void {
    this.props.status = status;
    this.props.isActive = status === UserStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  setTemporaryPassword(password: Password): void {
    this.props.password = password;
    this.props.mustChangePassword = true;
    this.props.temporaryPasswordSetAt = new Date();
    this.props.updatedAt = new Date();
  }

  changePassword(password: Password): void {
    this.props.password = password;
    this.props.mustChangePassword = false;
    this.props.temporaryPasswordSetAt = null;
    this.props.updatedAt = new Date();
  }
}