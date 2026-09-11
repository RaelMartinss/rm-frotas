import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { GetDriverCurrentTripUseCase } from '../../application/use-cases/get-driver-current-trip.use-case';
import { GetDriverHistoryUseCase } from '../../application/use-cases/get-driver-history.use-case';
import { GetDriverFuelHistoryUseCase } from '../../application/use-cases/get-driver-fuel-history.use-case';
import { UpdateDriverFuelReceiptUseCase } from '../../application/use-cases/update-driver-fuel-receipt.use-case';
import {
  StartDriverTripDto,
  CompleteDriverTripDto,
  CreateDriverFuelDto,
  ReportIncidentDto,
  UpdateDriverFuelReceiptDto,
  GetDriverFuelHistoryQueryDto,
  SaveTripChecklistDto,
} from '../../application/dtos/driver-portal.dto';
import { RecordLocationBatchDto } from '../../application/dtos/record-location.dto';
import { RecordTripLocationUseCase } from '../../application/use-cases/record-trip-location.use-case';

@ApiTags('Driver Portal')
@ApiBearerAuth('JWT-auth')
@Controller('driver-portal')
@UseGuards(AuthGuard('jwt'))
export class DriverPortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getDriverCurrentTripUseCase: GetDriverCurrentTripUseCase,
    private readonly getDriverHistoryUseCase: GetDriverHistoryUseCase,
    private readonly getDriverFuelHistoryUseCase: GetDriverFuelHistoryUseCase,
    private readonly updateDriverFuelReceiptUseCase: UpdateDriverFuelReceiptUseCase,
    private readonly recordTripLocationUseCase: RecordTripLocationUseCase,
  ) {}

  @Get('current-trip')
  @ApiOperation({ summary: 'Obter viagem ativa e dados do motorista autenticado' })
  @ApiResponse({ status: 200, description: 'Dados da viagem atual do motorista.' })
  async getCurrentTrip(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
  ) {
    return this.getDriverCurrentTripUseCase.execute(userId, clientId);
  }

  @Post('start-trip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar viagem pelo celular (1 toque)' })
  async startTrip(
    @CurrentUser('userId') userId: string,
    @Body() body: StartDriverTripDto,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: body.tripId },
      include: { driver: true, vehicle: true },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      throw new BadRequestException('Esta viagem já foi finalizada ou cancelada.');
    }

    const now = new Date();
    const refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDate = new Date(
      trip.driver.cnhExpirationDate.getFullYear(),
      trip.driver.cnhExpirationDate.getMonth(),
      trip.driver.cnhExpirationDate.getDate(),
    );
    const diffDays = Math.round(
      (expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 1) {
      const msg =
        diffDays < 0
          ? 'Não é possível iniciar a viagem: CNH do motorista está vencida.'
          : diffDays === 0
          ? 'Não é possível iniciar a viagem: CNH do motorista vence hoje.'
          : 'Não é possível iniciar a viagem: CNH do motorista vence amanhã (bloqueio de segurança em 1 dia).';
      throw new BadRequestException(msg);
    }

    // Atualiza viagem e veículo
    const [updatedTrip] = await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id: body.tripId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: now,
          updatedAt: now,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: 'IN_USE',
          updatedAt: now,
        },
      }),
    ]);

    return {
      message: 'Viagem iniciada com sucesso!',
      tripId: updatedTrip.id,
      status: updatedTrip.status,
      startedAt: updatedTrip.startedAt,
    };
  }

  @Post('complete-trip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalizar viagem pelo celular e atualizar KM' })
  async completeTrip(
    @CurrentUser('userId') userId: string,
    @Body() body: CompleteDriverTripDto,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: body.tripId },
      include: { vehicle: true },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    if (trip.status === 'COMPLETED') {
      throw new BadRequestException('Esta viagem já está finalizada.');
    }

    const now = new Date();
    const newKm = body.currentKm !== undefined ? body.currentKm : trip.vehicle.currentKm;

    if (newKm < trip.vehicle.currentKm) {
      throw new BadRequestException(
        `O KM final (${newKm}) não pode ser inferior ao KM registrado anteriormente (${trip.vehicle.currentKm}).`,
      );
    }

    const [updatedTrip] = await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id: body.tripId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          updatedAt: now,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: 'AVAILABLE',
          currentKm: newKm,
          updatedAt: now,
        },
      }),
    ]);

    return {
      message: 'Viagem concluída com sucesso! Veículo liberado.',
      tripId: updatedTrip.id,
      status: updatedTrip.status,
      completedAt: updatedTrip.completedAt,
    };
  }

  @Post('fuel-record')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar abastecimento rápido pelo celular' })
  async createFuelRecord(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Body() body: CreateDriverFuelDto,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: body.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    // Busca driver associado ao user
    let driver = await this.prisma.driver.findFirst({
      where: {
        OR: [{ userId }, { name: { contains: userId } }],
      },
    });

    if (!driver) {
      driver = await this.prisma.driver.findFirst({
        where: {
          clientId: clientId || vehicle.clientId,
        },
      });
    }

    if (!driver) {
      throw new BadRequestException('Nenhum motorista vinculado encontrado para registrar o abastecimento.');
    }

    const targetClientId = clientId || vehicle.clientId;
    const totalCost = Number((body.liters * body.pricePerLiter).toFixed(2));
    const recordDate = body.date ? new Date(body.date) : new Date();

    const [fuelRecord] = await this.prisma.$transaction([
      this.prisma.fuelRecord.create({
        data: {
          vehicleId: body.vehicleId,
          driverId: driver.id,
          clientId: targetClientId,
          ownerId: vehicle.ownerId,
          fuelType: (body.fuelType as any) || 'DIESEL',
          liters: body.liters,
          pricePerUnit: body.pricePerLiter,
          totalCost,
          odometerAtFueling: body.currentKm,
          gasStation: body.gasStation || null,
          fullTank: body.fullTank !== undefined ? body.fullTank : true,
          notes: body.notes || null,
          receiptUrl: body.receiptUrl || null,
          fueledAt: recordDate,
        },
      }),
      // Atualiza o odômetro do veículo se for maior
      ...(body.currentKm > vehicle.currentKm
        ? [
            this.prisma.vehicle.update({
              where: { id: body.vehicleId },
              data: {
                currentKm: body.currentKm,
                updatedAt: new Date(),
              },
            }),
          ]
        : []),
    ]);

    return {
      message: 'Abastecimento registrado com sucesso!',
      id: fuelRecord.id,
      totalCost: fuelRecord.totalCost,
    };
  }

  @Post('incident')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reportar problema mecânico, pneu ou SOS na rota' })
  async reportIncident(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Body() body: ReportIncidentDto,
  ) {
    // 1. Identifica o motorista vinculado ao usuário ou à viagem
    let driver = await this.prisma.driver.findFirst({
      where: { userId },
    });

    let trip = null;
    if (body.tripId) {
      trip = await this.prisma.trip.findUnique({
        where: { id: body.tripId },
        include: { driver: true, vehicle: true },
      });
      if (!driver && trip?.driver) {
        driver = trip.driver;
      }
    }

    const vehicleId = body.vehicleId || trip?.vehicleId || null;
    let effectiveClientId = clientId;

    let vehicle = null;
    if (vehicleId) {
      vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });
      if (!effectiveClientId && vehicle?.clientId) {
        effectiveClientId = vehicle.clientId;
      }
    }

    if (!effectiveClientId && driver?.clientId) {
      effectiveClientId = driver.clientId;
    }

    if (!effectiveClientId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      effectiveClientId = user?.clientId || null;
    }

    const validCategories = ['PNEU', 'MECANICA', 'ELETRICA', 'ACIDENTE', 'ATRASO', 'OUTRO'];
    const category = validCategories.includes(body.category?.toUpperCase())
      ? (body.category.toUpperCase() as any)
      : 'OUTRO';

    // Gera protocolo amigável e único (#00XXXX)
    const count = await this.prisma.incident.count({
      where: { clientId: effectiveClientId || undefined },
    });
    const protocol = '#' + String(count + 1).padStart(6, '0');

    const desc =
      body.description?.trim() ||
      `Alerta SOS de ${category} reportado pelo motorista${
        body.latitude
          ? ` nas coordenadas (${body.latitude.toFixed(4)}, ${body.longitude?.toFixed(4)})`
          : ''
      }.`;

    const photos =
      body.photos && body.photos.length > 0
        ? body.photos
        : body.photoUrl
        ? [body.photoUrl]
        : [];

    // 2. Persiste o registro de incidente SOS
    const incident = await this.prisma.incident.create({
      data: {
        protocol,
        driverId: driver?.id || null,
        vehicleId: vehicleId || null,
        tripId: body.tripId || null,
        clientId: effectiveClientId!,
        category,
        description: desc,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        locationAddress: body.locationAddress ?? null,
        photoUrl: body.photoUrl ?? (photos[0] || null),
        photos,
        checklist: body.checklist ?? null,
        status: 'OPEN',
      },
      include: {
        driver: true,
        vehicle: true,
        trip: true,
      },
    });

    // 3. Se for mecânica/pneu/elétrica e tiver veículo, abre manutenção corretiva preventiva
    if (vehicleId && effectiveClientId) {
      await this.prisma.maintenance.create({
        data: {
          vehicleId,
          clientId: effectiveClientId,
          ownerId: userId,
          type: 'CORRETIVA',
          status: 'AGENDADA',
          description: `[ALERTA SOS ${protocol} - ${category}] ${desc}`,
          scheduledDate: new Date(),
        },
      });
    }

    return {
      message: 'Alerta de SOS reportado com sucesso ao gestor da frota!',
      incidentId: incident.id,
      protocol: incident.protocol,
      category: incident.category,
      description: incident.description,
      recordedAt: incident.createdAt,
      latitude: incident.latitude,
      longitude: incident.longitude,
      locationAddress: incident.locationAddress,
      photoUrl: incident.photoUrl,
      photos: incident.photos,
    };
  }

  @Post('checklist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Salvar checklist veicular de pré-viagem' })
  async saveChecklist(
    @CurrentUser('userId') userId: string,
    @Body() body: SaveTripChecklistDto,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: body.tripId },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id: body.tripId },
      data: {
        checklist: {
          ...body.checklist,
          savedAt: new Date().toISOString(),
          userId,
        },
        updatedAt: new Date(),
      },
    });

    return {
      message: 'Checklist veicular salvo com sucesso!',
      tripId: updatedTrip.id,
      checklist: updatedTrip.checklist,
    };
  }

  @Post('trips/:tripId/location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar ping ou lote de pings de localização GPS da viagem' })
  async recordLocation(
    @CurrentUser('userId') userId: string,
    @Param('tripId') tripId: string,
    @Body() body: RecordLocationBatchDto,
  ) {
    let pings = body.pings || [];
    if (body.latitude !== undefined && body.longitude !== undefined) {
      pings = [
        ...pings,
        {
          latitude: body.latitude,
          longitude: body.longitude,
          recordedAt: body.recordedAt,
        },
      ];
    }

    return this.recordTripLocationUseCase.execute({
      userId,
      tripId,
      pings,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico de viagens do motorista' })
  async getHistory(@CurrentUser('userId') userId: string) {
    return this.getDriverHistoryUseCase.execute(userId);
  }

  @Get('fuel-history')
  @ApiOperation({ summary: 'Histórico de abastecimentos do motorista com status de comprovante' })
  async getFuelHistory(
    @CurrentUser('userId') userId: string,
    @Query() query: GetDriverFuelHistoryQueryDto,
  ) {
    const pendingOnly = query.pendingReceiptOnly === 'true' || query.pendingReceiptOnly === '1';
    return this.getDriverFuelHistoryUseCase.execute(userId, pendingOnly);
  }

  @Patch('fuel-records/:id/receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anexar ou atualizar foto do comprovante fiscal do abastecimento' })
  async updateFuelReceipt(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() body: UpdateDriverFuelReceiptDto,
  ) {
    return this.updateDriverFuelReceiptUseCase.execute({
      userId,
      fuelRecordId: id,
      receiptUrl: body.receiptUrl,
      notes: body.notes,
      gasStation: body.gasStation,
    });
  }

  @Post('push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar ou atualizar o Push Token FCM do motorista' })
  async registerPushToken(
    @CurrentUser('userId') userId: string,
    @Body() body: { token: string },
  ) {
    if (!body?.token) {
      throw new BadRequestException('Token é obrigatório.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: body.token },
    });

    // Vincula o motorista por userId ou pelo nome no mesmo tenant e salva o token
    await this.prisma.driver.updateMany({
      where: {
        OR: [
          { userId },
          {
            clientId: user.clientId ?? undefined,
            name: { equals: user.name, mode: 'insensitive' },
          },
        ],
      },
      data: {
        pushToken: body.token,
        userId: userId,
      },
    });

    return { success: true, message: 'Push token registrado com sucesso.' };
  }
}
