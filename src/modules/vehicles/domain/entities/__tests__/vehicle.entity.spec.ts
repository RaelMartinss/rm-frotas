import { Vehicle } from '../vehicle.entity';
import { LicensePlate } from '../../value-objects/license-plate.vo';


describe('Vehicle Entity', () => {
    const makeVehicle = (status: 'AVAILABLE' | 'IN_MAINTENANCE' | 'IN_USE' = 'AVAILABLE') => {
        return new Vehicle({
            id: 'vehicle-uuid-1',
            plate: new LicensePlate('ABC-1234'),
            model: 'Volvo FH 540',
            year: 2023,
            currentKm: 50000,
            status,
        });
    };

    it('deve criar um entidade de veículo com status padronizados AVAILABLE', () => {
        const vehicle = makeVehicle();
        expect(vehicle.getId()).toBe('vehicle-uuid-1');
        expect(vehicle.getStatus()).toBe('AVAILABLE');
    });

    it('deve enviar um veículo disponível para manutenção com sucesso', () => {
        const vehicle = makeVehicle('AVAILABLE');
        vehicle.sendToMaintenance();
        expect(vehicle.getStatus()).toBe('IN_MAINTENANCE');
    });

    it('deve lançar erro ao tentar enviar para manutenção um veículo já em manutenção', () => {
        const vehicle = makeVehicle('IN_MAINTENANCE');
        expect(() => vehicle.sendToMaintenance()).toThrow('O veículo já está em manutenção.');
    });

    it('deve lançar erro ao tentar enviar para manutenção um veículo em uso', () => {
        const vehicle = makeVehicle('IN_USE');
        expect(() => vehicle.sendToMaintenance()).toThrow('Não é possível enviar um veículo em uso para a manutenção.');
    });

    it('deve atualizar a quilometragem do veículo se o novo valor for maior', () => {
        const vehicle = makeVehicle();
        vehicle.updateKm(55000);
        expect(vehicle.getCurrentKm()).toBe(55000);
    });

    it('deve lançar erro se a nova quilometragem for menor que a atual', () => {
        const vehicle = makeVehicle();
        expect(() => vehicle.updateKm(49000)).toThrow(
        'A nova quilometragem não pode ser menor que a quilometragem atual.',
        );
    });

})