import { describe, it, expect } from 'vitest';
import { LicensePlate } from '../license-plate.vo';
import { InvalidLicensePlateException } from '../../exceptions/invalid-license-plate.exception'

describe('LicensePlate Value Object', () => {
    it('dever criar um placa válida no padrão tradicional (AAA-1234)', () => {
        const plate = new LicensePlate('ABC-1234');
        expect(plate.getValue()).toBe('ABC1234');
    });

    it('deve criar uma placa válida no padrão Mercosul (AAA1A23)', () => {
        const plate = new LicensePlate('ABC1D23');
        expect(plate.getValue()).toBe('ABC1D23');
    });

    it('deve formatar a placa removendo traços e hífens e convertendo para maiúsculo', () => {
        const plate = new LicensePlate('abc-1234');
        expect(plate.getValue()).toBe('ABC1234');
    });

    it('deve lançar InvalidLicensePlateException para formatos inválidos', () => {
        expect(() => new LicensePlate('123-ABCD')).toThrow(InvalidLicensePlateException);
        expect(() => new LicensePlate('AB123')).toThrow(InvalidLicensePlateException);
        expect(() => new LicensePlate('')).toThrow(InvalidLicensePlateException);
    });

    it('deve comparar duas placas iguais corretamente usando o método equals', () => {
        const plate1 = new LicensePlate('ABC-1234');
        const plate2 = new LicensePlate('abc1234');
        const plate3 = new LicensePlate('XYZ-9999');

        expect(plate1.equals(plate2)).toBe(true);
        expect(plate1.equals(plate3)).toBe(false);
    });
});