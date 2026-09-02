import { Module } from '@nestjs/common';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TripsModule } from './modules/trips/trips.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    DriversModule,
    VehiclesModule,
    TripsModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
