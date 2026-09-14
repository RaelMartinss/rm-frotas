import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { RequestContextService } from './request-context.service';
import { RequestIdMiddleware } from './request-id.middleware';
import { DomainLoggerService } from './domain-logger.service';
import { SentryFilter } from './sentry.filter';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const isTest = config.get<string>('NODE_ENV') === 'test' || !!process.env.VITEST;

        return {
          pinoHttp: {
            level: isTest ? 'silent' : isProd ? 'info' : 'debug',
            transport:
              isProd || isTest
                ? undefined
                : {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                    },
                  },
            genReqId: (req: any) =>
              req.requestId || req.headers['x-request-id'] || undefined,
            customProps: (req: any) => {
              const store = RequestContextService.getStore();
              return {
                requestId: store?.requestId || req.requestId,
                userId: store?.userId,
                clientId: store?.clientId,
              };
            },
            serializers: {
              req: (req: any) => ({
                id: req.id,
                method: req.method,
                url: req.url,
              }),
              res: (res: any) => ({
                statusCode: res.statusCode,
              }),
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'password',
                '*.password',
                'currentPassword',
                'newPassword',
                'token',
                '*.token',
                'refreshToken',
                '*.refreshToken',
              ],
              censor: '[REDACTED]',
            },
            customSuccessMessage: (req: any, res: any, responseTime: number) => {
              return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
            },
            customErrorMessage: (req: any, res: any, error: Error) => {
              return `${req.method} ${req.url} ${res.statusCode} - ${error.message}`;
            },
          },
        };
      },
    }),
  ],
  providers: [
    RequestContextService,
    RequestIdMiddleware,
    DomainLoggerService,
    SentryFilter,
  ],
  exports: [
    RequestContextService,
    RequestIdMiddleware,
    DomainLoggerService,
    SentryFilter,
    LoggerModule,
  ],
})
export class ObservabilityModule {}
