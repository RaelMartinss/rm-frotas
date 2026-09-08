import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface UpdateDriverFuelReceiptInput {
  userId: string;
  fuelRecordId: string;
  receiptUrl: string;
  notes?: string;
  gasStation?: string;
}

@Injectable()
export class UpdateDriverFuelReceiptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: UpdateDriverFuelReceiptInput) {
    if (!input.receiptUrl || !input.receiptUrl.trim()) {
      throw new BadRequestException('A imagem do comprovante é obrigatória.');
    }

    const record = await this.prisma.fuelRecord.findUnique({
      where: { id: input.fuelRecordId },
      include: { driver: true },
    });

    if (!record) {
      throw new NotFoundException('Registro de abastecimento não encontrado.');
    }

    // Valida se o motorista é dono do registro ou pertence ao mesmo usuário
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: { driverProfile: true },
    });

    const isDriverOwner =
      record.driverId === user?.driverProfile?.id ||
      record.ownerId === input.userId ||
      record.driver.userId === input.userId;

    if (!isDriverOwner) {
      throw new ForbiddenException('Você não tem permissão para alterar este abastecimento.');
    }

    const updated = await this.prisma.fuelRecord.update({
      where: { id: input.fuelRecordId },
      data: {
        receiptUrl: input.receiptUrl,
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.gasStation !== undefined && { gasStation: input.gasStation }),
        updatedAt: new Date(),
      },
    });

    return {
      message: 'Comprovante anexado com sucesso!',
      id: updated.id,
      receiptUrl: updated.receiptUrl,
    };
  }
}
