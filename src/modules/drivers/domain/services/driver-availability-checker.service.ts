import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface IDriverTripAvailabilitySource {
  hasActiveTrip(driverId: string): Promise<boolean>;
}

@Injectable()
export class DriverAvailabilityChecker {
  constructor(
    @Optional()
    @Inject('IDriverTripAvailabilitySource')
    private readonly availabilitySource?: IDriverTripAvailabilitySource,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  async hasActiveTrip(driverId: string): Promise<boolean> {
    if (this.availabilitySource) {
      return this.availabilitySource.hasActiveTrip(driverId);
    }

    if (this.prisma) {
      const activeTrip = await this.prisma.trip.findFirst({
        where: {
          driverId,
          status: 'IN_PROGRESS',
        },
        select: { id: true },
      });
      return !!activeTrip;
    }

    return false;
  }
}
