import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { Driver } from '../../domain/entities/driver.entity';
import { Cpf } from '../../domain/value-objects/cpf.vo';
import { Cnh } from '../../domain/value-objects/cnh.vo';
import { CreateDriverInputDto } from '../dtos/create-driver.dto';
import { DriverAlreadyExistsException } from '../../domain/exceptions/driver-already-exists.exception';

@Injectable()
export class CreateDriverUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
  ) {}

  async execute(input: CreateDriverInputDto): Promise<Driver> {
    // 1. Instancia o VO do CPF (valida sintaxe e dígitos verificadores)
    const cpf = new Cpf(input.cpf);

    // 2. Verifica se o CPF já está cadastrado na base
    const driverWithSameCpf = await this.driversRepository.findByCpf(cpf);
    if (driverWithSameCpf) {
      throw new DriverAlreadyExistsException(cpf.getFormatted());
    }

    // 3. Instancia o VO da CNH (valida tamanho e categoria)
    const cnh = new Cnh(
      input.cnhNumber,
      input.cnhCategory,
      input.cnhExpirationDate,
    );

    // 4. Cria a entidade de domínio Driver
    const driver = new Driver({
      name: input.name,
      cpf,
      cnh,
      ownerId: input.ownerId,
    });

    // 5. Persiste através do contrato do repositório
    await this.driversRepository.save(driver);

    return driver;
  }
}