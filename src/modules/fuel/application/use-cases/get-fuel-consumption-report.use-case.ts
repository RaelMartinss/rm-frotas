import { Injectable, NotFoundException } from '@nestjs/common';
import { IFuelRecordsRepository } from '../../domain/repositories/fuel-records.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { FuelRecord } from '../../domain/entities/fuel-record.entity';

export interface GetFuelConsumptionReportInput {
  ownerId: string;
  vehicleId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ConsumptionSegment {
  startDate: Date;
  endDate: Date;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  litersConsumed: number;
  kmPerLiter: number;
  totalCost: number;
}

export interface VehicleConsumptionReport {
  vehicleId: string;
  plate: string;
  model: string;
  brand?: string | null;
  totalFuelings: number;
  fullTankFuelings: number;
  totalDistanceKm: number;
  totalLiters: number;
  totalCost: number;
  averageKmPerLiter: number | null;
  segments: ConsumptionSegment[];
}

export interface FuelConsumptionReportOutput {
  vehicles: VehicleConsumptionReport[];
  fleetAverageKmPerLiter: number | null;
  fleetTotalDistanceKm: number;
  fleetTotalLiters: number;
  fleetTotalCost: number;
}

@Injectable()
export class GetFuelConsumptionReportUseCase {
  constructor(
    private readonly fuelRecordsRepository: IFuelRecordsRepository,
    private readonly vehiclesRepository: IVehiclesRepository
  ) {}

  async execute(input: GetFuelConsumptionReportInput): Promise<FuelConsumptionReportOutput> {
    let vehiclesToReport = [];

    if (input.vehicleId) {
      const vehicle = await this.vehiclesRepository.findById(input.vehicleId);
      if (!vehicle || vehicle.getOwnerId() !== input.ownerId) {
        throw new NotFoundException('Veículo não encontrado ou não pertence a esta frota.');
      }
      vehiclesToReport.push(vehicle);
    } else {
      vehiclesToReport = await this.vehiclesRepository.findAll(input.ownerId);
    }

    const vehicleReports: VehicleConsumptionReport[] = [];
    let fleetTotalDistance = 0;
    let fleetTotalLiters = 0;
    let fleetTotalCost = 0;

    for (const vehicle of vehiclesToReport) {
      const records = await this.fuelRecordsRepository.findAllByVehicleChronological(
        vehicle.getId(),
        input.startDate,
        input.endDate
      );

      const segments: ConsumptionSegment[] = [];
      let lastFullTankRecord: FuelRecord | null = null;
      let accumulatedLiters = 0;
      let accumulatedCost = 0;
      let vehicleTotalCost = 0;
      let fullTankCount = 0;

      for (const record of records) {
        vehicleTotalCost += record.getTotalCost().amount;

        if (record.isFullTank()) {
          fullTankCount++;

          if (lastFullTankRecord !== null) {
            accumulatedLiters += record.getLiters();
            accumulatedCost += record.getTotalCost().amount;

            const distance = record.getOdometerAtFueling() - lastFullTankRecord.getOdometerAtFueling();

            if (distance > 0 && accumulatedLiters > 0) {
              const kmPerLiter = Math.round((distance / accumulatedLiters) * 100) / 100;
              segments.push({
                startDate: lastFullTankRecord.getFueledAt(),
                endDate: record.getFueledAt(),
                startOdometer: lastFullTankRecord.getOdometerAtFueling(),
                endOdometer: record.getOdometerAtFueling(),
                distanceKm: distance,
                litersConsumed: Math.round(accumulatedLiters * 100) / 100,
                kmPerLiter,
                totalCost: Math.round(accumulatedCost * 100) / 100,
              });
            }

            // Reinicia os acumuladores para o próximo segmento
            accumulatedLiters = 0;
            accumulatedCost = 0;
          }

          lastFullTankRecord = record;
        } else {
          // Abastecimento parcial: acumula os litros e custos para quando o tanque voltar a ficar cheio
          if (lastFullTankRecord !== null) {
            accumulatedLiters += record.getLiters();
            accumulatedCost += record.getTotalCost().amount;
          }
        }
      }

      const totalDistanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);
      const totalLitersConsumed = segments.reduce((sum, s) => sum + s.litersConsumed, 0);
      const averageKmPerLiter =
        totalLitersConsumed > 0 && totalDistanceKm > 0
          ? Math.round((totalDistanceKm / totalLitersConsumed) * 100) / 100
          : null;

      vehicleReports.push({
        vehicleId: vehicle.getId(),
        plate: vehicle.getPlate().getValue(),
        model: vehicle.getModel(),
        brand: vehicle.getBrand(),
        totalFuelings: records.length,
        fullTankFuelings: fullTankCount,
        totalDistanceKm,
        totalLiters: Math.round(records.reduce((sum, r) => sum + r.getLiters(), 0) * 100) / 100,
        totalCost: Math.round(vehicleTotalCost * 100) / 100,
        averageKmPerLiter,
        segments,
      });

      fleetTotalDistance += totalDistanceKm;
      fleetTotalLiters += totalLitersConsumed;
      fleetTotalCost += vehicleTotalCost;
    }

    const fleetAverageKmPerLiter =
      fleetTotalLiters > 0 && fleetTotalDistance > 0
        ? Math.round((fleetTotalDistance / fleetTotalLiters) * 100) / 100
        : null;

    return {
      vehicles: vehicleReports,
      fleetAverageKmPerLiter,
      fleetTotalDistanceKm: fleetTotalDistance,
      fleetTotalLiters: Math.round(fleetTotalLiters * 100) / 100,
      fleetTotalCost: Math.round(fleetTotalCost * 100) / 100,
    };
  }
}
