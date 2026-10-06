import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';
import {
  allowedCashRegisterNumbers,
  resolveCashRegisterNumber,
} from './cash-register.constant';
import { Permission } from './permission.constant';

describe('cash-register.constant', () => {
  const employee = (...permissions: Permission[]) => ({
    role: UserRole.EMPLOYEE,
    permissions,
  });
  const admin = { role: UserRole.ADMIN, permissions: [] };

  describe('allowedCashRegisterNumbers', () => {
    it('gives an admin every till without any permission', () => {
      expect(allowedCashRegisterNumbers(admin)).toEqual([1, 2]);
    });

    it('gives an employee only the tills granted', () => {
      expect(
        allowedCashRegisterNumbers(employee('cash_register.box_2')),
      ).toEqual([2]);
      expect(
        allowedCashRegisterNumbers(
          employee('cash_register.box_1', 'cash_register.box_2'),
        ),
      ).toEqual([1, 2]);
    });

    it('gives an employee without a till none — viewing caja is not enough', () => {
      expect(
        allowedCashRegisterNumbers(employee('cash_register.view')),
      ).toEqual([]);
    });
  });

  describe('resolveCashRegisterNumber', () => {
    it('uses the requested till when the user works at it', () => {
      expect(resolveCashRegisterNumber(admin, '2')).toBe(2);
      expect(
        resolveCashRegisterNumber(employee('cash_register.box_1'), '1'),
      ).toBe(1);
    });

    it("falls back to the user's only till when none is named", () => {
      expect(
        resolveCashRegisterNumber(employee('cash_register.box_2'), undefined),
      ).toBe(2);
    });

    it('asks which till when none is named and the user has several', () => {
      expect(() => resolveCashRegisterNumber(admin, undefined)).toThrow(
        BadRequestException,
      );
      expect(() => resolveCashRegisterNumber(admin, '')).toThrow(
        BadRequestException,
      );
    });

    it("refuses a till the employee doesn't work at instead of switching to theirs", () => {
      expect(() =>
        resolveCashRegisterNumber(employee('cash_register.box_1'), '2'),
      ).toThrow(ForbiddenException);
    });

    it('refuses an employee with no till at all', () => {
      expect(() =>
        resolveCashRegisterNumber(employee('cash_register.view'), '1'),
      ).toThrow(ForbiddenException);
    });

    it('rejects a till that does not exist', () => {
      for (const header of ['3', '0', 'abc', '1.0']) {
        expect(() => resolveCashRegisterNumber(admin, header)).toThrow(
          BadRequestException,
        );
      }
    });
  });
});
