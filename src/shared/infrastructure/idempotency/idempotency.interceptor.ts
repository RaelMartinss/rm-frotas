import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  UnprocessableEntityException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { mergeMap, tap, catchError } from 'rxjs/operators';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_IDEMPOTENT_KEY } from './idempotent.decorator';

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(
      IS_IDEMPOTENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isIdempotent) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const rawKey = req.headers['idempotency-key'];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!key || typeof key !== 'string' || key.trim() === '') {
      // Sem header: segue o fluxo normal (compatível com clientes legados)
      return next.handle();
    }

    const trimmedKey = key.trim();
    const user = (req as any).user;
    const userId: string = user?.userId || user?.id || user?.sub;

    if (!userId) {
      // Se não houver contexto de usuário autenticado, segue normalmente
      return next.handle();
    }

    const route = `${req.method} ${req.baseUrl || ''}${req.route?.path || req.path}`;
    const requestHash = createHash('sha256')
      .update(stableStringify(req.body ?? {}))
      .digest('hex');

    this.cleanOldKeysOpportunistically();

    return from(
      this.prisma.idempotencyKey.findUnique({
        where: {
          userId_key: {
            userId,
            key: trimmedKey,
          },
        },
      }),
    ).pipe(
      mergeMap((existing) => {
        if (existing) {
          if (existing.status === 'COMPLETED') {
            if (existing.requestHash === requestHash) {
              res.setHeader('Idempotent-Replayed', 'true');
              res.status(existing.responseStatus ?? HttpStatus.OK);
              return of(existing.responseBody);
            }
            throw new UnprocessableEntityException({
              statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
              code: 'IDEMPOTENCY_KEY_REUSED',
              message:
                'A chave de idempotência já foi utilizada com um payload diferente.',
            });
          }

          if (existing.status === 'PROCESSING') {
            res.setHeader('Retry-After', '2');
            throw new ConflictException(
              'Requisição concorrente em processamento para esta Idempotency-Key.',
            );
          }
        }

        // Criar registro PROCESSING
        return from(
          this.prisma.idempotencyKey
            .create({
              data: {
                key: trimmedKey,
                userId,
                route,
                requestHash,
                status: 'PROCESSING',
              },
            })
            .catch((createErr: any) => {
              if (createErr?.code === 'P2002') {
                res.setHeader('Retry-After', '2');
                throw new ConflictException(
                  'Requisição concorrente em processamento para esta Idempotency-Key.',
                );
              }
              throw createErr;
            }),
        ).pipe(
          mergeMap(() => {
            return next.handle().pipe(
              tap(async (responseBody) => {
                try {
                  await this.prisma.idempotencyKey.update({
                    where: {
                      userId_key: {
                        userId,
                        key: trimmedKey,
                      },
                    },
                    data: {
                      status: 'COMPLETED',
                      responseStatus: res.statusCode || HttpStatus.CREATED,
                      responseBody: responseBody !== undefined ? responseBody : null,
                    },
                  });
                } catch (updateErr) {
                  this.logger.warn(
                    `Falha ao marcar Idempotency-Key como COMPLETED: ${(updateErr as Error).message}`,
                  );
                }
              }),
              catchError((error) => {
                // Se o handler falhar (não-2xx), apaga o registro PROCESSING para permitir retry com a mesma chave
                return from(
                  this.prisma.idempotencyKey
                    .deleteMany({
                      where: {
                        userId,
                        key: trimmedKey,
                        status: 'PROCESSING',
                      },
                    })
                    .catch(() => {}),
                ).pipe(
                  mergeMap(() => {
                    throw error;
                  }),
                );
              }),
            );
          }),
        );
      }),
    );
  }

  private cleanOldKeysOpportunistically(): void {
    if (Math.random() < 0.05) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.prisma.idempotencyKey
        .deleteMany({
          where: {
            createdAt: { lt: thirtyDaysAgo },
          },
        })
        .catch((err) => {
          this.logger.debug(`Erro na limpeza oportunista de chaves antigas: ${err.message}`);
        });
    }
  }
}
