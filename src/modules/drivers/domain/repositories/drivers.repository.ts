import { Driver, DriverStatus } from '../entities/driver.entity';
import { Cpf } from '../value-objects/cpf.vo';

export interface FindManyDriversPaginatedParams {
  ownerId?: string;
  status?: DriverStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface FindManyDriversPaginatedOutput {
  drivers: Driver[];
  total: number;
}

export interface IDriversRepository {
  /**
   * Persiste ou atualiza o estado de um motorista no banco de dados.
   */
  save(driver: Driver): Promise<void>;

  /**
   * Busca um motorista pelo seu identificador único (UUID).
   */
  findById(id: string): Promise<Driver | null>;

  /**
   * Busca um motorista pelo seu Value Object de CPF.
   */
  findByCpf(cpf: Cpf): Promise<Driver | null>;

  /**
   * Retorna a lista de motoristas cadastrados.
   */
  findAll(ownerId?: string): Promise<Driver[]>;

  /**
   * Retorna a lista paginada de motoristas com filtros.
   */
  findManyPaginated(
    params: FindManyDriversPaginatedParams
  ): Promise<FindManyDriversPaginatedOutput>;
}
