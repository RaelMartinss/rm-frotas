import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { Driver, DriverStatus } from '../../domain/entities/driver.entity';
import { Cnh, CnhCategory } from '../../domain/value-objects/cnh.vo';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface UpdateDriverInput {
  driverId: string;
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string | null;
  cnhNumber?: string;
  cnhCategory?: CnhCategory;
  cnhExpirationDate?: Date | string;
  status?: DriverStatus;
}

@Injectable()
export class UpdateDriverUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateDriverInput): Promise<Driver> {
    const driver = await this.driversRepository.findById(input.driverId);
    if (!driver) {
      throw new NotFoundException(`Motorista com ID ${input.driverId} não encontrado.`);
    }

    if (input.name !== undefined && input.name.trim()) {
      driver.setName(input.name.trim());
    }

    if (input.email !== undefined) {
      driver.setEmail(input.email ? input.email.trim().toLowerCase() : undefined);
    }

    if (input.phone !== undefined) {
      driver.setPhone(input.phone ? input.phone.trim() : undefined);
    }

    if (input.photoUrl !== undefined) {
      driver.setPhotoUrl(input.photoUrl);
    }

    if (input.cnhNumber || input.cnhCategory || input.cnhExpirationDate) {
      const currentCnh = driver.getCnh();
      const newCnh = new Cnh(
        input.cnhNumber ?? currentCnh.getNumber(),
        input.cnhCategory ?? currentCnh.getCategory(),
        input.cnhExpirationDate ? new Date(input.cnhExpirationDate) : currentCnh.getExpirationDate(),
      );
      driver.updateCnh(newCnh);
    }

    if (input.status && input.status !== driver.getStatus()) {
      if (input.status === DriverStatus.ACTIVE && driver.getStatus() !== DriverStatus.ACTIVE) {
        driver.activate();
      } else if (input.status === DriverStatus.INACTIVE && driver.getStatus() !== DriverStatus.INACTIVE) {
        driver.deactivate();
      }
    }

    await this.driversRepository.save(driver);

    // Sincroniza dados da conta de usuário vinculada se existir
    if (driver.getUserId()) {
      try {
        await this.prisma.user.update({
          where: { id: driver.getUserId() },
          data: {
            ...(input.name && { name: input.name.trim() }),
            ...(input.email && { email: input.email.trim().toLowerCase() }),
            ...(input.phone && { phone: input.phone.trim() }),
          },
        });
      } catch {
        // Silenciosamente ignora se o user não for encontrado
      }
    }

    return driver;
  }
}
