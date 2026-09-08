import { CnhCategory } from '../../domain/value-objects/cnh.vo';

export interface CreateDriverInputDto {
  name: string;
  email: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpirationDate: Date;
  phone?: string;
  clientId?: string;
  ownerId?: string;
}