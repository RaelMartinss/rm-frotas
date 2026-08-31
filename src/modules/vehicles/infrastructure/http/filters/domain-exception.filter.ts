import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Response } from 'express';
import { InvalidLicensePlateException } from "../../../domain/exceptions/invalid-license-plate.exception";
import { VehicleAlreadyExistsException } from "../../../domain/exceptions/vehicle-already-exists.exception";
import { VehicleAlreadyInMaintenanceException, VehicleInUseException } from "../../../domain/exceptions/vehicle-status.exception";
import { InvalidKilometrageException } from "../../../domain/exceptions/invalid-kilometrage.exception";


@Catch(
  InvalidLicensePlateException,
  VehicleAlreadyExistsException,
  VehicleAlreadyInMaintenanceException,
  VehicleInUseException,
  InvalidKilometrageException,
)
export class DomainExceptionFilter implements ExceptionFilter {
    catch(exception: Error, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.BAD_REQUEST;

        if (exception instanceof VehicleAlreadyExistsException) {
            status = HttpStatus.CONFLICT; 
        } else if (
            exception instanceof VehicleAlreadyInMaintenanceException ||
            exception instanceof VehicleInUseException
        ) {
            status = HttpStatus.UNPROCESSABLE_ENTITY
        }

        response.status(status).json({
            statusCode: status,
            error: exception.name,
            message: exception.message,
            timestamp: new Date().toISOString(),
        })
    }
}