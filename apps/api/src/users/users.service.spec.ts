import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    create: jest.Mock<Partial<User>, [Partial<User>]>;
    save: jest.Mock<Promise<User>, [Partial<User>]>;
    findOne: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const employee: User = {
    id: 'user-1',
    email: 'empleado@casa.com',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Gomez',
    role: UserRole.EMPLOYEE,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    permissions: ['products.view'],
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  } as User;

  beforeEach(() => {
    usersRepository = {
      create: jest.fn<Partial<User>, [Partial<User>]>((entity) => entity),
      save: jest.fn<Promise<User>, [Partial<User>]>((entity) =>
        Promise.resolve({ ...employee, ...entity }),
      ),
      findOne: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue('4') };

    service = new UsersService(
      usersRepository as unknown as Repository<User>,
      configService as unknown as ConfigService,
    );

    jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed');
  });

  describe('create', () => {
    it('expands the given permissions when creating an employee', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);

      await service.create(
        {
          email: 'nuevo@casa.com',
          password: 'password123',
          firstName: 'Nuevo',
          lastName: 'Empleado',
          role: UserRole.EMPLOYEE,
          permissions: ['products.create'],
        },
        'admin-1',
      );

      const created = usersRepository.create.mock.calls[0][0];
      // products.create implies products.view + catalogs.view
      expect(created.permissions).toEqual(
        expect.arrayContaining([
          'products.create',
          'products.view',
          'catalogs.view',
        ]),
      );
    });

    it('ignores any submitted permissions for a non-employee role', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);

      await service.create(
        {
          email: 'admin2@casa.com',
          password: 'password123',
          firstName: 'Otro',
          lastName: 'Admin',
          role: UserRole.ADMIN,
          permissions: ['products.create'],
        },
        'admin-1',
      );

      const created = usersRepository.create.mock.calls[0][0];
      expect(created.permissions).toEqual([]);
    });

    it('defaults to no permissions when none are given for a new employee', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);

      await service.create(
        {
          email: 'nuevo2@casa.com',
          password: 'password123',
          firstName: 'Nuevo',
          lastName: 'Empleado',
          role: UserRole.EMPLOYEE,
        },
        'admin-1',
      );

      const created = usersRepository.create.mock.calls[0][0];
      expect(created.permissions).toEqual([]);
    });
  });

  describe('update', () => {
    it('clears permissions when the role changes away from employee', async () => {
      usersRepository.findOne.mockResolvedValue({ ...employee });

      await service.update(employee.id, { role: UserRole.ADMIN }, 'admin-1');

      const saved = usersRepository.save.mock.calls[0][0] as User;
      expect(saved.permissions).toEqual([]);
    });

    it('leaves permissions untouched when the role stays employee', async () => {
      usersRepository.findOne.mockResolvedValue({ ...employee });

      await service.update(employee.id, { firstName: 'Ana María' }, 'admin-1');

      const saved = usersRepository.save.mock.calls[0][0] as User;
      expect(saved.permissions).toEqual(['products.view']);
    });
  });

  describe('updatePermissions', () => {
    it('expands and persists the given permissions for an employee', async () => {
      usersRepository.findOne.mockResolvedValue({ ...employee });

      const result = await service.updatePermissions(
        employee.id,
        ['quotations.create'],
        'admin-1',
      );

      const saved = usersRepository.save.mock.calls[0][0] as User;
      expect(saved.permissions).toEqual(
        expect.arrayContaining([
          'quotations.create',
          'quotations.view',
          'products.view',
        ]),
      );
      expect(result.permissions).toEqual(saved.permissions);
    });

    it('rejects with BadRequestException for a non-employee user', async () => {
      usersRepository.findOne.mockResolvedValue({
        ...employee,
        role: UserRole.ADMIN,
      });

      await expect(
        service.updatePermissions(employee.id, ['products.view'], 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });
});
