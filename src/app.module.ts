import { Module } from '@nestjs/common';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TripsModule } from './modules/trips/trips.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { FuelModule } from './modules/fuel/fuel.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    DriversModule,
    VehiclesModule,
    TripsModule,
    AuthModule,
    DashboardModule,
    MaintenanceModule,
    FuelModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}


