import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';

export enum UserRole {
  FLEET_MANAGER = 'FLEET_MANAGER',
  DRIVER = 'DRIVER',
}

export interface UserProps {
  name: string;
  email: Email;
  password: Password;
  role: UserRole;
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
  isActive(): boolean { return this.props.isActive!; }
}