import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Response } from 'express';
import { InvalidLicensePlateException } from "../../../domain/exceptions/invalid-license-plate.exception";
import { VehicleAlreadyExistsException } from "../../../domain/exceptions/vehicle-already-exists.exception";
import { VehicleAlreadyInMaintenanceException, VehicleInUseException, VehicleNotInMaintenanceException } from "../../../domain/exceptions/vehicle-status.exception";
import { InvalidKilometrageException } from "../../../domain/exceptions/invalid-kilometrage.exception";
import { VehicleNotFoundException } from "../../../domain/exceptions/vehicle-not-found.exception";


@Catch(
  VehicleNotFoundException,
  InvalidLicensePlateException,
  VehicleAlreadyExistsException,
  VehicleAlreadyInMaintenanceException,
  VehicleInUseException,
  InvalidKilometrageException,
  VehicleNotInMaintenanceException,
)
export class DomainExceptionFilter implements ExceptionFilter {
    catch(exception: Error, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.BAD_REQUEST;

        if (exception instanceof VehicleNotFoundException) {
            status = HttpStatus.NOT_FOUND // 404
        }else if (exception instanceof VehicleAlreadyExistsException) {
            status = HttpStatus.CONFLICT; // 409
        } else if (
            exception instanceof VehicleAlreadyInMaintenanceException ||
            exception instanceof VehicleInUseException ||
            exception instanceof VehicleNotInMaintenanceException
        ) {
            status = HttpStatus.UNPROCESSABLE_ENTITY // 422
        }

        response.status(status).json({
            statusCode: status,
            error: exception.name,
            message: exception.message,
            timestamp: new Date().toISOString(),
        })
    }
}