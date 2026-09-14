import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ExpireImpersonationSessionsUseCase } from '../../application/use-cases/expire-impersonation-sessions.use-case';

@Injectable()
export class ExpireImpersonationSessionsJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpireImpersonationSessionsJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly expireSessionsUseCase: ExpireImpersonationSessionsUseCase,
  ) {}

  onModuleInit() {
    // Roda a cada 2 minutos para expirar sessões que ultrapassaram os 45 minutos
    this.timer = setInterval(async () => {
      try {
        const count = await this.expireSessionsUseCase.execute();
        if (count > 0) {
          this.logger.log(`Encerradas ${count} sessões de suporte expiradas.`);
        }
      } catch (err: any) {
        this.logger.error(`Erro ao expirar sessões de suporte: ${err.message}`);
      }
    }, 2 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
