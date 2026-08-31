import { InvalidKilometrageException } from '../exceptions/invalid-kilometrage.exception';
import { VehicleAlreadyInMaintenanceException, VehicleInUseException } from '../exceptions/vehicle-status.exception';
import { LicensePlate } from '../value-objects/license-plate.vo';
import { randomUUID } from 'node:crypto';

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  IN_USE = 'IN_USE',
}
export interface VehicleProps {
    id?: string;
    plate: LicensePlate;
    model: string;
    year: number;
    currentKm: number;
    status?: VehicleStatus;
    createdAt?: Date;
    updatedAt?: Date;
}


export class Vehicle {
    private props: Required<VehicleProps>;

    constructor(props: VehicleProps) {
        this.props = {
        ...props,
        id: props.id ?? randomUUID(), // 2. Se não passar ID, gera um UUID v4 nativo do Node
        status: props.status ?? VehicleStatus.AVAILABLE,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
        };  
    }

    public sendToMaintenance(): void {
        if (this.props.status === VehicleStatus.IN_MAINTENANCE) {
            throw new VehicleAlreadyInMaintenanceException();
        }
        if (this.props.status === VehicleStatus.IN_USE) {
            throw new VehicleInUseException();
        }
        this.props.status = VehicleStatus.IN_MAINTENANCE;
        this.touch();
    }

    public returnFromMaintenance(): void {
        if (this.props.status !== VehicleStatus.IN_MAINTENANCE) {
            throw new Error('O veículo não está em manutenção.');
        }
        this.props.status = VehicleStatus.AVAILABLE;
        this.touch();
    }

    public updateKm(newKm: number): void {
        if (newKm < this.props.currentKm) {
            throw new InvalidKilometrageException();
        }
        this.props.currentKm = newKm;
        this.touch();
    }

    private touch(): void {
        this.props.updatedAt = new Date();
    }

    public finishMaintenance(): void {
        if (this.props.status !== VehicleStatus.IN_MAINTENANCE) {
            throw new VehicleAlreadyInMaintenanceException();
        }

        this.props.status = VehicleStatus.AVAILABLE;
        this.props.updatedAt = new Date();
    }

    // -- Getters ---
    public getId(): string { return this.props.id; }
    public getPlate(): LicensePlate { return this.props.plate; }
    public getModel(): string { return this.props.model; }
    public getYear(): number { return this.props.year; }
    public getCurrentKm(): number { return this.props.currentKm; }
    public getStatus(): VehicleStatus { return this.props.status; }
    public getCreatedAt(): Date { return this.props.createdAt; }
    public getUpdatedAt(): Date { return this.props.updatedAt; }

}