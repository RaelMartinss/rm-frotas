import { DriverSuspension } from '../entities/driver-suspension.entity';

export interface FindDriverSuspensionsPaginatedParams {
  page: number;
  limit: number;
}

export interface DriverSuspensionWithDriverDetails {
  suspension: DriverSuspension;
  driverName?: string;
  driverCpf?: string;
}

export interface IDriverSuspensionsRepository {
  create(suspension: DriverSuspension): Promise<void>;
  save(suspension: DriverSuspension): Promise<void>;
  findById(id: string): Promise<DriverSuspension | null>;
  findActiveByDriverId(driverId: string): Promise<DriverSuspension | null>;
  findAllByDriverId(
    driverId: string,
    params: FindDriverSuspensionsPaginatedParams,
  ): Promise<{
    suspensions: DriverSuspension[];
    total: number;
  }>;
  findAllActiveByOwnerId(
    ownerId: string,
    params: FindDriverSuspensionsPaginatedParams,
  ): Promise<{
    suspensions: DriverSuspensionWithDriverDetails[];
    total: number;
  }>;
}
