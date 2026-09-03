import { CnhCategory } from '../../domain/value-objects/cnh.vo';

export interface CreateDriverInputDto {
  name: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpirationDate: Date;
  ownerId?: string;
}