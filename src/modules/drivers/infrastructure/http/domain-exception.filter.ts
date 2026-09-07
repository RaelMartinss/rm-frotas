import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidCpfException } from '../../domain/exceptions/invalid-cpf.exception';
import { InvalidCnhException } from '../../domain/exceptions/invalid-cnh.exception';
import { InvalidDriverStatusTransitionException } from '../../domain/exceptions/invalid-driver-status-transition.exception';
import { DriverAlreadySuspendedException } from '../../domain/exceptions/driver-already-suspended.exception';
import { DriverHasActiveTripException } from '../../domain/exceptions/driver-has-active-trip.exception';
import { SuspensionAlreadyLiftedException } from '../../domain/exceptions/suspension-already-lifted.exception';
import { InvalidSuspensionDateRangeException } from '../../domain/exceptions/invalid-suspension-date-range.exception';
import { InvalidSuspensionReasonException } from '../../domain/exceptions/invalid-suspension-reason.exception';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';
import { DriverSuspensionNotFoundException } from '../../domain/exceptions/driver-suspension-not-found.exception';
import { DriverAlreadyExistsException } from '../../domain/exceptions/driver-already-exists.exception';

@Catch(
  InvalidCpfException,
  InvalidCnhException,
  InvalidDriverStatusTransitionException,
  DriverAlreadySuspendedException,
  DriverHasActiveTripException,
  SuspensionAlreadyLiftedException,
  InvalidSuspensionDateRangeException,
  InvalidSuspensionReasonException,
  DriverNotFoundException,
  DriverSuspensionNotFoundException,
  DriverAlreadyExistsException,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.BAD_REQUEST;
    let errorName = 'Bad Request';

    if (
      exception instanceof DriverNotFoundException ||
      exception instanceof DriverSuspensionNotFoundException
    ) {
      statusCode = HttpStatus.NOT_FOUND;
      errorName = 'Not Found';
    } else if (
      exception instanceof DriverAlreadySuspendedException ||
      exception instanceof DriverHasActiveTripException ||
      exception instanceof DriverAlreadyExistsException
    ) {
      statusCode = HttpStatus.CONFLICT;
      errorName = 'Conflict';
    }

    response.status(statusCode).json({
      statusCode,
      message: exception.message,
      error: errorName,
    });
  }
}