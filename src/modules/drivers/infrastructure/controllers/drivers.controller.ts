import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateDriverUseCase } from '../../application/use-cases/create-driver.use-case';
import { ActivateDriverUseCase } from '../../application/use-cases/activate-driver.use-case';
import { DeactivateDriverUseCase } from '../../application/use-cases/deactivate-driver.use-case';
import { SuspendDriverUseCase } from '../../application/use-cases/suspend-driver.use-case';
import { UpdateDriverCnhUseCase } from '../../application/use-cases/update-driver-cnh.use-case';
import { CreateDriverHttpDto } from './dtos/create-driver-http.dto';
import { UpdateDriverCnhHttpDto } from './dtos/update-driver-cnh-http.dto';
import { DriverPresenter } from './presenters/driver.presenter';

@Controller('drivers')
export class DriversController {
  constructor(
    private readonly createDriverUseCase: CreateDriverUseCase,
    private readonly activateDriverUseCase: ActivateDriverUseCase,
    private readonly deactivateDriverUseCase: DeactivateDriverUseCase,
    private readonly suspendDriverUseCase: SuspendDriverUseCase,
    private readonly updateDriverCnhUseCase: UpdateDriverCnhUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateDriverHttpDto) {
    const driver = await this.createDriverUseCase.execute({
      name: dto.name,
      cpf: dto.cpf,
      cnhNumber: dto.cnhNumber,
      cnhCategory: dto.cnhCategory,
      cnhExpirationDate: new Date(dto.cnhExpirationDate),
    });

    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    const driver = await this.activateDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    const driver = await this.deactivateDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string) {
    const driver = await this.suspendDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/cnh')
  @HttpCode(HttpStatus.OK)
  async updateCnh(
    @Param('id') id: string,
    @Body() dto: UpdateDriverCnhHttpDto,
  ) {
    const driver = await this.updateDriverCnhUseCase.execute({
      driverId: id,
      cnhNumber: dto.cnhNumber,
      cnhCategory: dto.cnhCategory,
      cnhExpirationDate: new Date(dto.cnhExpirationDate),
    });

    return DriverPresenter.toHTTP(driver);
  }
}