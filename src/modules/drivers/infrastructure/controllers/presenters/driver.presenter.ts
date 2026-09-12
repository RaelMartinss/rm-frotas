import { Driver } from '../../../domain/entities/driver.entity';

export class DriverPresenter {
  static toHTTP(driver: Driver) {
    return {
      id: driver.getId(),
      name: driver.getName(),
      email: driver.getEmail() ?? null,
      phone: driver.getPhone() ?? null,
      cpf: driver.getCpf().getFormatted(),
      cnh: {
        number: driver.getCnh().getNumber(),
        category: driver.getCnh().getCategory(),
        expirationDate: driver.getCnh().getExpirationDate().toISOString(),
        isExpired: driver.getCnh().isExpired(),
      },
      status: driver.getStatus(),
      createdAt: driver.getCreatedAt().toISOString(),
      updatedAt: driver.getUpdatedAt().toISOString(),
    };
  }
}