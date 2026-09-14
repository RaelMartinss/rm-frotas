import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { RequestContextService } from './request-context.service';

@Catch()
@Injectable()
export class SentryFilter implements ExceptionFilter {
  constructor(private readonly requestContextService?: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestContext =
      this.requestContextService?.get() || RequestContextService.getStore();
    const requestId =
      requestContext?.requestId || (request as any)?.requestId;
    const clientId = requestContext?.clientId;
    const userId = requestContext?.userId;

    // Conforme a spec: não enviar ao Sentry exceções esperadas de validação e domínio (< 500)
    // Enviar apenas exceções não tratadas / status >= 500 (erros de banco, crashes inesperados, etc.)
    const isServerError = status >= 500;

    if (isServerError && process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (requestId) {
          scope.setTag('requestId', requestId);
        }
        if (clientId) {
          scope.setTag('clientId', clientId);
        }
        if (userId) {
          scope.setUser({ id: userId });
        }
        scope.setExtra('path', request.url);
        scope.setExtra('method', request.method);
        scope.setExtra('statusCode', status);

        if (exception instanceof Error) {
          Sentry.captureException(exception);
        } else {
          Sentry.captureMessage(String(exception), 'error');
        }
      });
    }

    if (!response.headersSent) {
      if (isHttpException) {
        const resObj = exception.getResponse();
        if (typeof resObj === 'object' && resObj !== null) {
          response.status(status).json({
            ...resObj,
            requestId,
          });
        } else {
          response.status(status).json({
            statusCode: status,
            message: resObj,
            requestId,
          });
        }
      } else {
        const message =
          process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor.'
            : exception instanceof Error
              ? exception.message
              : 'Erro desconhecido.';

        response.status(status).json({
          statusCode: status,
          message,
          error: 'Internal Server Error',
          requestId,
        });
      }
    }
  }
}
