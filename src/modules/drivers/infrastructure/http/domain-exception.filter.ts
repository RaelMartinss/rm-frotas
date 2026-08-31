import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { InvalidCpfException } from '../../domain/exceptions/invalid-cpf.exception';
import { InvalidCnhException } from '../../domain/exceptions/invalid-cnh.exception';


@Catch(InvalidCpfException, InvalidCnhException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
      error: 'Bad Request',
    });
  }
}