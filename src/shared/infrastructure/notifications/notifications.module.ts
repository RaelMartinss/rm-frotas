import { Global, Module } from '@nestjs/common';
import { FcmNotificationService } from './fcm-notification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FcmNotificationService],
  exports: [FcmNotificationService],
})
export class NotificationsModule {}
