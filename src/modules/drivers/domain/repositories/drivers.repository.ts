import { Driver } from '../entities/driver.entity';
import { Cpf } from '../value-objects/cpf.vo';

export interface IDriversRepository {
  /**
   * Persite ou atualiza o estado de um motorista no banco de dados.
   */
  save(driver: Driver): Promise<void>;

  /**
   * Busca um motorista pela seu identificador único (UUID).
   */
  findById(id: string): Promise<Driver | null>;

  /**
   * Busca um motorista pelo seu Value Object de CPF.
   * Utilizado nos Use Cases para garantir a unidade de cadastro.
   */
  findByCpf(cpf: Cpf): Promise<Driver | null>;

  /**
   * Retorna a lista de todos os motoristas cadastrados.
   */
  findAll(): Promise<Driver[]>;
}
