import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';

@ApiTags('Incidents')
@ApiBearerAuth('JWT-auth')
@Controller('incidents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class IncidentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar alertas SOS e ocorrências de motoristas' })
  @ApiResponse({ status: 200, description: 'Lista de ocorrências retornada com sucesso.' })
  async getIncidents(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Query('status') status?: string,
    @Query('tripId') tripId?: string,
  ) {
    const where: any = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (tripId) {
      where.tripId = tripId;
    }

    const incidents = await this.prisma.incident.findMany({
      where,
      include: {
        driver: true,
        vehicle: true,
        trip: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return incidents.map((inc) => ({
      id: inc.id,
      protocol: inc.protocol,
      driverId: inc.driverId,
      driverName: inc.driver?.name || 'Motorista',
      driverCnh: inc.driver?.cnhNumber,
      driverPhone: (inc.driver as any)?.phone || null,
      vehicleId: inc.vehicleId,
      vehiclePlate: inc.vehicle?.plate,
      vehicleModel: inc.vehicle?.model,
      vehicleBrand: inc.vehicle?.brand,
      vehicleKm: inc.vehicle?.currentKm,
      tripId: inc.tripId,
      tripRoute: inc.trip
        ? `${inc.trip.originCity || inc.trip.originAddress} (${inc.trip.originState || ''}) → ${inc.trip.destinationCity || inc.trip.destinationAddress} (${inc.trip.destinationState || ''})`
        : undefined,
      category: inc.category,
      description: inc.description,
      latitude: inc.latitude,
      longitude: inc.longitude,
      locationAddress: inc.locationAddress,
      photoUrl: inc.photoUrl,
      photos: inc.photos,
      checklist: inc.checklist,
      status: inc.status,
      createdAt: inc.createdAt,
      resolvedAt: inc.resolvedAt,
      resolvedBy: inc.resolvedBy,
    }));
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status do alerta SOS (OPEN, IN_PROGRESS, RESOLVED)' })
  async updateStatus(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body('status') status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: status || 'IN_PROGRESS',
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
        resolvedBy: status === 'RESOLVED' ? userId : null,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      resolvedAt: updated.resolvedAt,
      message: `Status da ocorrência atualizado para ${updated.status}.`,
    };
  }

  @Patch(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar alerta SOS como resolvido / atendido' })
  @ApiResponse({ status: 200, description: 'Ocorrência marcada como resolvida.' })
  async resolveIncident(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      resolvedAt: updated.resolvedAt,
      message: 'Alerta SOS marcado como atendido com sucesso.',
    };
  }
}
