import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import type { IDriverSuspensionsRepository } from '../../domain/repositories/driver-suspensions.repository';
import { DriverSuspension } from '../../domain/entities/driver-suspension.entity';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';
import { DriverSuspensionNotFoundException } from '../../domain/exceptions/driver-suspension-not-found.exception';

export interface LiftDriverSuspensionInput {
  driverId: string;
  ownerId: string;
  liftedBy: string;
  liftReason?: string | null;
}

@Injectable()
export class LiftDriverSuspensionUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    @Inject('IDriverSuspensionsRepository')
    private readonly driverSuspensionsRepository: IDriverSuspensionsRepository,
  ) {}

  async execute(input: LiftDriverSuspensionInput): Promise<DriverSuspension> {
    // 1. Valida existência do motorista e tenant
    const driver = await this.driversRepository.findById(input.driverId);

    if (!driver) {
      throw new DriverNotFoundException(input.driverId);
    }

    if (driver.getOwnerId() && driver.getOwnerId() !== input.ownerId) {
      throw new DriverNotFoundException(input.driverId);
    }

    // 2. Busca a suspensão ativa
    const suspension =
      await this.driverSuspensionsRepository.findActiveByDriverId(input.driverId);

    if (!suspension) {
      throw new DriverSuspensionNotFoundException(
        `Nenhuma suspensão ativa encontrada para o motorista ${input.driverId}.`,
      );
    }

    // 3. Encerra a suspensão
    suspension.lift({
      liftedBy: input.liftedBy,
      liftReason: input.liftReason,
    });

    // 4. Reativa o motorista
    driver.activate();

    // 5. Persiste as alterações
    await this.driverSuspensionsRepository.save(suspension);
    await this.driversRepository.save(driver);

    return suspension;
  }
}
