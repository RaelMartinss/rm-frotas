import { Module } from '@nestjs/common';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TripsModule } from './modules/trips/trips.module';

@Module({
  imports: [
    DriversModule,
    VehiclesModule,
    TripsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
