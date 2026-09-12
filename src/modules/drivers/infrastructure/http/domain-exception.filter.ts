import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
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
import { UserEmailAlreadyExistsException } from '../../../auth/domain/exceptions/role-hierarchy.exceptions';
import { InvalidEmailException } from '../../../auth/domain/exceptions/invalid-email.exception';
import {
  ClientDocumentAlreadyExistsException,
  ClientNotFoundException,
  ClientSuspendedOrCancelledException,
  ClientAlreadyHasFleetManagerException,
  CrossClientAccessDeniedException,
} from '../../../clients/domain/exceptions/client.exceptions';

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
  UserEmailAlreadyExistsException,
  InvalidEmailException,
  ClientDocumentAlreadyExistsException,
  ClientNotFoundException,
  ClientSuspendedOrCancelledException,
  ClientAlreadyHasFleetManagerException,
  CrossClientAccessDeniedException,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.BAD_REQUEST;
    let errorName = 'Bad Request';

    if (
      exception instanceof DriverNotFoundException ||
      exception instanceof DriverSuspensionNotFoundException ||
      exception instanceof ClientNotFoundException
    ) {
      statusCode = HttpStatus.NOT_FOUND;
      errorName = 'Not Found';
    } else if (
      exception instanceof DriverAlreadySuspendedException ||
      exception instanceof DriverHasActiveTripException ||
      exception instanceof DriverAlreadyExistsException ||
      exception instanceof UserEmailAlreadyExistsException ||
      exception instanceof ClientDocumentAlreadyExistsException ||
      exception instanceof ClientAlreadyHasFleetManagerException
    ) {
      statusCode = HttpStatus.CONFLICT;
      errorName = 'Conflict';
    } else if (
      exception instanceof ClientSuspendedOrCancelledException ||
      exception instanceof CrossClientAccessDeniedException
    ) {
      statusCode = HttpStatus.FORBIDDEN;
      errorName = 'Forbidden';
    }

    response.status(statusCode).json({
      statusCode,
      message: exception.message,
      error: errorName,
    });
  }
}