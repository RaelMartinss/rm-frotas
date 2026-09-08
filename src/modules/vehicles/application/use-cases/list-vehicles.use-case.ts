import { Injectable } from "@nestjs/common";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";
import { Vehicle, VehicleStatus } from "../../domain/entities/vehicle.entity";

export interface ListVehiclesInput {
  ownerId?: string;
  clientId?: string;
  status?: VehicleStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListVehiclesOutput {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListVehiclesUseCase {
  constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

  async execute(input: ListVehiclesInput = {}): Promise<ListVehiclesOutput> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { vehicles, total } = await this.vehiclesRepository.findManyPaginated({
      ownerId: input.ownerId,
      clientId: input.clientId,
      status: input.status,
      search: input.search,
      page,
      limit,
    });

    return {
      data: vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}