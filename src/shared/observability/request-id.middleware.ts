import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from './request-context.service';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers['x-request-id'];
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    let requestId: string;

    if (
      typeof headerValue === 'string' &&
      headerValue.length <= 64 &&
      UUID_V4_REGEX.test(headerValue.trim())
    ) {
      requestId = headerValue.trim();
    } else {
      requestId = randomUUID();
    }

    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    this.requestContextService.run({ requestId }, () => {
      next();
    });
  }
}
