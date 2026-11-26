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
  UseInterceptors,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { IdempotencyInterceptor, Idempotent } from '../../../../shared/infrastructure/idempotency';
import { validateOccurredAt } from '../../../../shared/domain/validators/occurred-at.validator';
import {
  VehicleOdometerValidator,
  InvalidOdometerReadingException,
} from '../../../../shared/domain/services/vehicle-odometer.validator';
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
  GetDriverCurrentTripQueryDto,
  GetDriverFuelHistoryQueryDto,
  SaveTripChecklistDto,
  SyncUserDeviceDto,
} from '../../application/dtos/driver-portal.dto';
import { RecordLocationBatchDto } from '../../application/dtos/record-location.dto';
import { RecordTripLocationUseCase } from '../../application/use-cases/record-trip-location.use-case';

@ApiTags('Driver Portal')
@ApiBearerAuth('JWT-auth')
@Controller('driver-portal')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(IdempotencyInterceptor)
export class DriverPortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getDriverCurrentTripUseCase: GetDriverCurrentTripUseCase,
    private readonly getDriverHistoryUseCase: GetDriverHistoryUseCase,
    private readonly getDriverFuelHistoryUseCase: GetDriverFuelHistoryUseCase,
    private readonly updateDriverFuelReceiptUseCase: UpdateDriverFuelReceiptUseCase,
    private readonly recordTripLocationUseCase: RecordTripLocationUseCase,
  ) {}

  private async resolveAuthenticatedDriver(userId: string, clientId?: string | null) {
    let driver = await this.prisma.driver.findFirst({
      where: {
        userId,
        ...(clientId ? { clientId } : {}),
      },
    });

    if (!driver && (this.prisma as any).user?.findUnique) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { driverProfile: true },
      });

      if (user?.driverProfile) {
        driver = user.driverProfile;
      } else if (user) {
        const effectiveClientId = clientId ?? user.clientId ?? undefined;
        driver = await this.prisma.driver.findFirst({
          where: {
            ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
            OR: [
              { userId },
              ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
              { userId: null, name: { equals: user.name, mode: 'insensitive' as const } },
            ],
          },
        });

        if (driver && !driver.userId && this.prisma.driver?.update) {
          await this.prisma.driver
            .update({ where: { id: driver.id }, data: { userId } })
            .catch(() => {});
          driver = { ...driver, userId };
        }
      }
    }

    return driver;
  }

  private async assertTripAccess(
    trip: { id: string; clientId: string; driverId: string; driver?: { userId?: string | null } | null },
    userId: string,
    clientId?: string | null,
    role?: string,
  ) {
    if (clientId && trip.clientId && trip.clientId !== clientId) {
      throw new ForbiddenException('Você não tem permissão para acessar viagens de outra empresa.');
    }

    // Se o usuário for motorista (ou se a viagem tiver motorista vinculado a outro userId), exige titularidade
    if (role === 'DRIVER' || !role) {
      const authDriver = await this.resolveAuthenticatedDriver(userId, clientId ?? trip.clientId);
      if (authDriver && trip.driverId !== authDriver.id) {
        throw new ForbiddenException('Esta viagem está atribuída a outro motorista.');
      }
      if (!authDriver && trip.driver?.userId && trip.driver.userId !== userId) {
        throw new ForbiddenException('Esta viagem está atribuída a outro motorista.');
      }
    }
  }

  @Get('current-trip')
  @ApiOperation({ summary: 'Obter viagem ativa e dados do motorista autenticado' })
  @ApiResponse({ status: 200, description: 'Dados da viagem atual do motorista.' })
  async getCurrentTrip(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Query() query?: GetDriverCurrentTripQueryDto,
  ) {
    const omitPhoto = query?.omitPhoto === 'true' || query?.omitPhoto === '1';
    return this.getDriverCurrentTripUseCase.execute(userId, clientId, { omitPhoto });
  }

  @Post('start-trip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar viagem pelo celular (1 toque)' })
  async startTrip(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @CurrentUser('role') role: string,
    @Body() body: StartDriverTripDto,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: body.tripId },
      include: { driver: true, vehicle: true },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    await this.assertTripAccess(trip, userId, clientId, role);

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      throw new BadRequestException('Esta viagem já foi finalizada ou cancelada.');
    }

    // Idempotência: se esta própria viagem já está em andamento, retorna estado atual
    if (trip.status === 'IN_PROGRESS') {
      return {
        message: 'Viagem já está em andamento.',
        tripId: trip.id,
        status: trip.status,
        startedAt: trip.startedAt,
      };
    }

    if (trip.driver.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Não é possível iniciar a viagem: o cadastro do motorista está suspenso ou inativo.',
      );
    }

    if (trip.vehicle.status === 'IN_MAINTENANCE') {
      throw new BadRequestException(
        'Não é possível iniciar a viagem: o veículo designado está em manutenção.',
      );
    }

    if (this.prisma.trip?.findFirst) {
      const conflictingTrip = await this.prisma.trip.findFirst({
        where: {
          id: { not: trip.id },
          status: 'IN_PROGRESS',
          OR: [{ driverId: trip.driverId }, { vehicleId: trip.vehicleId }],
        },
      });

      if (conflictingTrip) {
        throw new BadRequestException(
          'Já existe outra viagem em andamento para este motorista ou veículo.',
        );
      }
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

    const departureKm =
      body.initialKm !== undefined ? body.initialKm : trip.vehicle.currentKm;

    if (departureKm < trip.vehicle.currentKm) {
      throw new BadRequestException(
        `O odômetro inicial (${departureKm} km) não pode ser inferior ao odômetro atual do veículo (${trip.vehicle.currentKm} km).`,
      );
    }

    // Atualiza viagem, veículo e registra leitura de odômetro caso tenha avançado
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
          ...(departureKm > trip.vehicle.currentKm
            ? { currentKm: departureKm, lastEventAt: now }
            : {}),
          updatedAt: now,
        },
      }),
      ...(departureKm > trip.vehicle.currentKm && (this.prisma as any).odometerReading?.create
        ? [
            this.prisma.odometerReading.create({
              data: {
                vehicleId: trip.vehicleId,
                clientId: trip.clientId,
                ownerId: trip.vehicle.ownerId,
                previousKm: trip.vehicle.currentKm,
                currentKm: departureKm,
                source: 'TRIP',
                sourceId: trip.id,
                recordedAt: now,
              },
            }),
          ]
        : []),
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
    @CurrentUser('clientId') clientId: string | null,
    @CurrentUser('role') role: string,
    @Body() body: CompleteDriverTripDto,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: body.tripId },
      include: { driver: true, vehicle: true },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    await this.assertTripAccess(trip, userId, clientId, role);

    if (trip.status === 'COMPLETED') {
      throw new BadRequestException('Esta viagem já está finalizada.');
    }

    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Apenas viagens em andamento podem ser concluídas. Inicie a viagem antes de finalizar.',
      );
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
          finalOdometer: newKm,
          updatedAt: now,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: 'AVAILABLE',
          currentKm: newKm,
          lastEventAt: now,
          updatedAt: now,
        },
      }),
      ...((this.prisma as any).odometerReading?.create
        ? [
            this.prisma.odometerReading.create({
              data: {
                vehicleId: trip.vehicleId,
                clientId: trip.clientId,
                ownerId: trip.vehicle.ownerId,
                previousKm: trip.vehicle.currentKm,
                currentKm: newKm,
                source: 'TRIP',
                sourceId: trip.id,
                recordedAt: now,
              },
            }),
          ]
        : []),
    ]);

    return {
      message: 'Viagem concluída com sucesso! Veículo liberado.',
      tripId: updatedTrip.id,
      status: updatedTrip.status,
      completedAt: updatedTrip.completedAt,
      finalOdometer: updatedTrip.finalOdometer,
    };
  }

  @Post('fuel-record')
  @Idempotent()
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

    if (clientId && vehicle.clientId && vehicle.clientId !== clientId) {
      throw new ForbiddenException(
        'Você não tem permissão para registrar abastecimento em veículo de outra empresa.',
      );
    }

    const targetClientId = clientId || vehicle.clientId;
    const driver = await this.resolveAuthenticatedDriver(userId, targetClientId);

    if (!driver) {
      throw new BadRequestException(
        'Nenhum perfil de motorista vinculado à sua conta foi encontrado para registrar o abastecimento.',
      );
    }
    const totalCost = Number((body.liters * body.pricePerLiter).toFixed(2));
    const recordDate = validateOccurredAt(body.occurredAt || body.date);

    // Avaliação de odômetro e concorrência / eventos fora de ordem
    const isDelayed = !!vehicle.lastEventAt && recordDate.getTime() < vehicle.lastEventAt.getTime();
    let prevNeighborOdometer: number | null = null;
    let nextNeighborOdometer: number | null = null;

    if (isDelayed) {
      const [prevNeighbor, nextNeighbor] = await Promise.all([
        this.prisma.fuelRecord.findFirst({
          where: {
            vehicleId: body.vehicleId,
            fueledAt: { lt: recordDate },
          },
          orderBy: { fueledAt: 'desc' },
          select: { odometerAtFueling: true },
        }),
        this.prisma.fuelRecord.findFirst({
          where: {
            vehicleId: body.vehicleId,
            fueledAt: { gt: recordDate },
          },
          orderBy: { fueledAt: 'asc' },
          select: { odometerAtFueling: true },
        }),
      ]);

      prevNeighborOdometer = prevNeighbor?.odometerAtFueling ?? null;
      nextNeighborOdometer = nextNeighbor?.odometerAtFueling ?? null;
    }

    let odoEval;
    try {
      odoEval = VehicleOdometerValidator.evaluateEvent({
        newOdometer: body.currentKm,
        occurredAt: recordDate,
        lastEventAt: vehicle.lastEventAt,
        currentVehicleKm: vehicle.currentKm,
        prevNeighborOdometer,
        nextNeighborOdometer,
        contextName: 'Abastecimento',
      });
    } catch (err: any) {
      if (err instanceof InvalidOdometerReadingException) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

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
          fullTank: body.fullTank !== undefined ? body.fullTank : body.fuelType !== 'ARLA_32',
          notes: body.notes || null,
          receiptUrl: body.receiptUrl || null,
          fueledAt: recordDate,
          odometerInconsistent: odoEval.odometerInconsistent,
        },
      }),
      // Atualiza o odômetro e lastEventAt do veículo apenas se não for evento atrasado
      ...(!isDelayed
        ? [
            this.prisma.vehicle.update({
              where: { id: body.vehicleId },
              data: {
                ...(odoEval.shouldUpdateVehicleKm ? { currentKm: body.currentKm } : {}),
                lastEventAt: recordDate,
                updatedAt: new Date(),
              },
            }),
            ...(odoEval.shouldUpdateVehicleKm && (this.prisma as any).odometerReading?.create
              ? [
                  this.prisma.odometerReading.create({
                    data: {
                      vehicleId: body.vehicleId,
                      clientId: targetClientId,
                      ownerId: vehicle.ownerId,
                      previousKm: vehicle.currentKm,
                      currentKm: body.currentKm,
                      source: 'FUEL',
                      sourceId: body.vehicleId,
                      recordedAt: recordDate,
                    },
                  }),
                ]
              : []),
          ]
        : []),
    ]);

    return {
      message: 'Abastecimento registrado com sucesso!',
      id: fuelRecord.id,
      totalCost: fuelRecord.totalCost,
      odometerInconsistent: fuelRecord.odometerInconsistent,
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
    let driver = await this.resolveAuthenticatedDriver(userId, clientId);

    let trip = null;
    if (body.tripId) {
      trip = await this.prisma.trip.findUnique({
        where: { id: body.tripId },
        include: { driver: true, vehicle: true },
      });
      if (trip && clientId && trip.clientId && trip.clientId !== clientId) {
        throw new ForbiddenException('Você não tem permissão para reportar ocorrência em viagem de outra empresa.');
      }
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
      if (vehicle && clientId && vehicle.clientId && vehicle.clientId !== clientId) {
        throw new ForbiddenException('Você não tem permissão para reportar ocorrência em veículo de outra empresa.');
      }
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

    // Gera protocolo único anti-colisão (#XXXXXX-YY)
    const count = await this.prisma.incident.count({
      where: { clientId: effectiveClientId || undefined },
    });
    const suffix = String(Math.floor(10 + Math.random() * 90));
    const protocol = `#${String(count + 1).padStart(4, '0')}-${suffix}`;

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

    // 3. Apenas se for falha mecânica, pneu ou elétrica e tiver veículo, abre manutenção corretiva
    const maintenanceCategories = ['PNEU', 'MECANICA', 'ELETRICA'];
    if (vehicleId && effectiveClientId && maintenanceCategories.includes(category)) {
      await this.prisma.maintenance.create({
        data: {
          vehicleId,
          clientId: effectiveClientId,
          ownerId: vehicle?.ownerId || userId,
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
    @CurrentUser('clientId') clientId: string | null,
    @CurrentUser('role') role: string,
    @Body() body: SaveTripChecklistDto,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: body.tripId },
      include: { driver: true },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    await this.assertTripAccess(trip, userId, clientId, role);

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
  async getHistory(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
  ) {
    return this.getDriverHistoryUseCase.execute(userId, clientId);
  }

  @Get('fuel-history')
  @ApiOperation({ summary: 'Histórico de abastecimentos do motorista com status de comprovante' })
  async getFuelHistory(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Query() query: GetDriverFuelHistoryQueryDto,
  ) {
    const pendingOnly = query?.pendingReceiptOnly === 'true' || query?.pendingReceiptOnly === '1';
    const omitReceipts = query?.omitReceipts === 'true' || query?.omitReceipts === '1';
    return this.getDriverFuelHistoryUseCase.execute(userId, pendingOnly, clientId, omitReceipts);
  }

  @Get('fuel-records/:id/receipt')
  @ApiOperation({ summary: 'Obter foto sob demanda do comprovante fiscal de um abastecimento' })
  async getFuelReceipt(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    const record = await this.prisma.fuelRecord.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        driverId: true,
        receiptUrl: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Registro de abastecimento não encontrado.');
    }

    if (clientId && record.clientId && record.clientId !== clientId) {
      throw new ForbiddenException('Você não tem permissão para acessar este comprovante.');
    }

    if (role === 'DRIVER' || !role) {
      const driver = await this.resolveAuthenticatedDriver(userId, clientId ?? record.clientId);
      if (!driver || record.driverId !== driver.id) {
        throw new ForbiddenException('Este comprovante pertence a outro motorista.');
      }
    }

    return {
      id: record.id,
      receiptUrl: record.receiptUrl || null,
    };
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

  @Patch('profile/photo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar foto do perfil do motorista' })
  async updateProfilePhoto(
    @CurrentUser('userId') userId: string,
    @Body() body: { photoUrl: string | null },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    const driver = await this.prisma.driver.findFirst({
      where: {
        OR: [
          { userId },
          {
            clientId: user.clientId ?? undefined,
            name: { equals: user.name, mode: 'insensitive' },
          },
        ],
      },
    });

    if (!driver) {
      throw new NotFoundException('Perfil de motorista não encontrado.');
    }

    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { photoUrl: body.photoUrl ?? null },
    });

    return {
      success: true,
      photoUrl: updated.photoUrl,
      message: 'Foto atualizada com sucesso.',
    };
  }

  @Post('device/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincronizar telemetria e versão do app do dispositivo do usuário' })
  @ApiResponse({ status: 200, description: 'Dados do dispositivo atualizados ou mantidos em cache.' })
  async syncDevice(
    @CurrentUser('userId') userId: string,
    @Body() dto: SyncUserDeviceDto,
  ) {
    const existing = await this.prisma.userDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
    });

    const now = new Date();
    const THROTTLE_MINUTES = 5;

    // Se já existe e a versão/build não mudou e foi atualizado há menos de 5 min, poupa write no banco
    if (existing) {
      const minutesSinceLastActive = (now.getTime() - existing.lastActiveAt.getTime()) / (1000 * 60);
      const versionChanged = existing.buildNumber !== dto.buildNumber || existing.appVersion !== dto.appVersion;

      if (!versionChanged && minutesSinceLastActive < THROTTLE_MINUTES) {
        return {
          success: true,
          throttled: true,
          message: 'Dispositivo já sincronizado recentemente.',
        };
      }
    }

    const device = await this.prisma.userDevice.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
      update: {
        buildNumber: dto.buildNumber,
        appVersion: dto.appVersion,
        platform: dto.platform,
        deviceModel: dto.deviceModel ?? null,
        osVersion: dto.osVersion ?? null,
        lastActiveAt: now,
      },
      create: {
        userId,
        deviceId: dto.deviceId,
        buildNumber: dto.buildNumber,
        appVersion: dto.appVersion,
        platform: dto.platform,
        deviceModel: dto.deviceModel ?? null,
        osVersion: dto.osVersion ?? null,
        lastActiveAt: now,
      },
    });

    return {
      success: true,
      throttled: false,
      deviceId: device.deviceId,
      buildNumber: device.buildNumber,
      appVersion: device.appVersion,
      lastActiveAt: device.lastActiveAt,
    };
  }
}
