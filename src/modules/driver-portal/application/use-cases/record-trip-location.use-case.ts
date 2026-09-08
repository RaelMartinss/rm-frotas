import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { RecordLocationDto } from '../dtos/record-location.dto';

export interface RecordTripLocationInput {
  userId: string;
  tripId: string;
  pings: RecordLocationDto[];
}

@Injectable()
export class RecordTripLocationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, tripId, pings }: RecordTripLocationInput) {
    if (!pings || pings.length === 0) {
      return { count: 0, message: 'Nenhum ping para registrar.' };
    }

    // 1. Busca a viagem
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    // 2. Valida se o usuário autenticado é o motorista desta viagem
    const driver = await this.prisma.driver.findFirst({
      where: { userId },
    });

    if (!driver || trip.driverId !== driver.id) {
      throw new ForbiddenException('Você não tem permissão para registrar localização nesta viagem.');
    }

    // 3. Valida se a viagem está com status IN_PROGRESS
    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Apenas viagens com status EM ANDAMENTO podem receber dados de rastreamento.');
    }

    // 4. Mapeia e insere os pings no banco
    const pingsToInsert = pings.map((p) => ({
      tripId,
      latitude: p.latitude,
      longitude: p.longitude,
      recordedAt: p.recordedAt ? new Date(p.recordedAt) : new Date(),
    }));

    const result = await this.prisma.tripLocationPing.createMany({
      data: pingsToInsert,
    });

    return {
      count: result.count,
      message: `${result.count} ponto(s) de localização registrado(s) com sucesso.`,
    };
  }
}
