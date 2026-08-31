import { InvalidKilometrageException } from '../exceptions/invalid-kilometrage.exception';
import { VehicleAlreadyInMaintenanceException, VehicleInUseException } from '../exceptions/vehicle-status.exception';
import { LicensePlate } from '../value-objects/license-plate.vo';
import { randomUUID } from 'node:crypto';

export type VehicleStatus = 'AVAILABLE' | 'IN_MAINTENANCE' | 'IN_USE';

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
    private readonly id: string;
    private readonly plate: LicensePlate;
    private model: string;
    private year: number;
    private currentKm: number;
    private status: VehicleStatus;
    private readonly createdAt: Date;
    private updatedAt: Date;

    constructor(props: VehicleProps) {
        this.id = props.id ?? randomUUID();
        this.plate = props.plate;
        this.model = props.model;
        this.year = props.year;
        this.currentKm = props.currentKm;
        this.status = props.status ?? 'AVAILABLE';
        this.createdAt = props.createdAt ?? new Date();
        this.updatedAt = props.updatedAt ?? new Date();
    }

    public sendToMaintenance(): void {
        if (this.status === 'IN_MAINTENANCE') {
            throw new VehicleAlreadyInMaintenanceException();
        }
        if (this.status === 'IN_USE') {
            throw new VehicleInUseException();
        }
        this.status = 'IN_MAINTENANCE';
        this.touch();
    }

    public returnFromMaintenance(): void {
        if (this.status !== 'IN_MAINTENANCE') {
            throw new Error('O veículo não está em manutenção.');
        }
        this.status = 'AVAILABLE';
        this.touch();
    }

    public updateKm(newKm: number): void {
        if (newKm < this.currentKm) {
            throw new InvalidKilometrageException();
        }
        this.currentKm = newKm;
        this.touch();
    }

    private touch(): void {
        this.updatedAt = new Date();
    }

    // -- Getters ---
    public getId(): string { return this.id; }
    public getPlate(): LicensePlate { return this.plate; }
    public getModel(): string { return this.model; }
    public getYear(): number { return this.year; }
    public getCurrentKm(): number { return this.currentKm; }
    public getStatus(): VehicleStatus { return this.status; }
    public getCreatedAt(): Date { return this.createdAt; }
    public getUpdatedAt(): Date { return this.updatedAt; }

}