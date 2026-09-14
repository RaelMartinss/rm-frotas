import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TripsModule } from './modules/trips/trips.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { FuelModule } from './modules/fuel/fuel.module';
import { HealthModule } from './health/health.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DriverPortalModule } from './modules/driver-portal/driver-portal.module';
import { NotificationsModule } from './shared/infrastructure/notifications/notifications.module';
import { OdometerModule } from './modules/odometer/odometer.module';
import { ImpersonationModule } from './modules/impersonation/impersonation.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { RequestIdMiddleware } from './shared/observability/request-id.middleware';

@Module({
  imports: [
    ObservabilityModule,
    NotificationsModule,
    ClientsModule,
    DriversModule,
    VehiclesModule,
    TripsModule,
    AuthModule,
    DashboardModule,
    MaintenanceModule,
    FuelModule,
    OdometerModule,
    HealthModule,
    DriverPortalModule,
    ImpersonationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}


