import { CnhCategory } from '../../domain/value-objects/cnh.vo';

export interface UpdateDriverCnhInputDto {
  driverId: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpirationDate: Date;
}