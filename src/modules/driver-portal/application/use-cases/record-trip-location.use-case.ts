import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { RecordLocationDto } from '../dtos/record-location.dto';
import { MovementState } from '@prisma/client';

export interface RecordTripLocationInput {
  userId: string;
  tripId: string;
  pings: RecordLocationDto[];
}

@Injectable()
export class RecordTripLocationUseCase {
  private readonly logger = new Logger(RecordTripLocationUseCase.name);

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

    // 4. Busca o último ping salvo no banco para a viagem
    let lastSavedPing = await this.prisma.tripLocationPing.findFirst({
      where: { tripId },
      orderBy: { recordedAt: 'desc' },
    });

    // Ordena os pings recebidos cronologicamente
    const sortedPings = [...pings].sort((a, b) => {
      const timeA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const timeB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      return timeA - timeB;
    });

    const pingsToInsert: Array<{
      tripId: string;
      latitude: number;
      longitude: number;
      accuracy: number | null;
      speed: number | null;
      heading: number | null;
      movementState: MovementState;
      recordedAt: Date;
    }> = [];

    for (const p of sortedPings) {
      // Filtro 1: Acurácia do GPS (descarta ruído > 25 metros)
      if (p.accuracy !== undefined && p.accuracy !== null && p.accuracy > 25) {
        this.logger.warn(
          `[Trip ${tripId}] Ping descartado por baixa precisão: ${p.accuracy}m (lat: ${p.latitude}, lng: ${p.longitude})`,
        );
        continue;
      }

      const recordedAtDate = p.recordedAt ? new Date(p.recordedAt) : new Date();

      // Filtro 2: Velocidade implícita impossível (salto de coordenadas > 180 km/h)
      if (lastSavedPing) {
        const deltaSeconds = (recordedAtDate.getTime() - lastSavedPing.recordedAt.getTime()) / 1000;
        if (deltaSeconds > 0) {
          const distKm = this.calculateDistanceKm(
            lastSavedPing.latitude,
            lastSavedPing.longitude,
            p.latitude,
            p.longitude,
          );
          const impliedSpeedKmH = (distKm / deltaSeconds) * 3600;
          if (impliedSpeedKmH > 180) {
            this.logger.warn(
              `[Trip ${tripId}] Ping descartado por salto de velocidade implícita impossível: ${impliedSpeedKmH.toFixed(1)} km/h em ${deltaSeconds.toFixed(0)}s`,
            );
            continue;
          }
        }
      }

      // Detecção de Estado de Movimento (movementState)
      let movementState: MovementState = MovementState.MOVING;
      const speed = p.speed ?? null;

      if (speed !== null && speed < 3.0) {
        movementState = MovementState.STOPPED;
      } else if (lastSavedPing) {
        const distMeters =
          this.calculateDistanceKm(lastSavedPing.latitude, lastSavedPing.longitude, p.latitude, p.longitude) *
          1000;
        if (distMeters < 10 && (speed === null || speed < 3.0)) {
          movementState = MovementState.STOPPED;
        }
      }

      const validPing = {
        tripId,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy ?? null,
        speed: p.speed ?? null,
        heading: p.heading ?? null,
        movementState,
        recordedAt: recordedAtDate,
      };

      pingsToInsert.push(validPing);
      lastSavedPing = validPing as any;
    }

    if (pingsToInsert.length === 0) {
      return {
        count: 0,
        message: 'Nenhum ponto válido após filtros de precisão e ruído.',
      };
    }

    const result = await this.prisma.tripLocationPing.createMany({
      data: pingsToInsert,
    });

    return {
      count: result.count,
      message: `${result.count} ponto(s) de localização registrado(s) com sucesso.`,
    };
  }

  /**
   * Fórmula de Haversine para cálculo de distância geodésica em quilômetros
   */
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio médio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
