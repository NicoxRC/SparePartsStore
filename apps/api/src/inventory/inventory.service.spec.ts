import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { MovementType } from '../common/enums/movement-type.enum';
import { Product } from '../products/entities/product.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService.createMovement', () => {
  let service: InventoryService;
  let queryBuilder: {
    withDeleted: jest.Mock;
    setLock: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let manager: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    transaction: jest.Mock;
  };

  const product = {
    id: 'prod-1',
    reference: 'REF-1',
    description: 'Filtro',
    stock: 5,
  } as Product;

  beforeEach(() => {
    queryBuilder = {
      withDeleted: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(product),
    };
    manager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn((_entity, data: Partial<InventoryMovement>) => data),
      save: jest.fn((_entity, movement: Partial<InventoryMovement>) =>
        Promise.resolve({ ...movement, id: 'mov-1', createdAt: new Date() }),
      ),
      update: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(),
    };
    manager.transaction.mockImplementation(
      (callback: (m: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
    );

    service = new InventoryService(
      { manager } as unknown as Repository<InventoryMovement>,
      {} as Repository<Product>,
    );
  });

  it('derives PURCHASE from a positive quantity and updates stock', async () => {
    const result = await service.createMovement(
      { productId: 'prod-1', quantity: 3 },
      'user-1',
    );

    expect(result.movementType).toBe(MovementType.PURCHASE);
    expect(result.newStock).toBe(8);
    expect(manager.update).toHaveBeenCalledWith(
      Product,
      { id: 'prod-1' },
      { stock: 8 },
    );
  });

  it('derives ADJUSTMENT from a negative quantity', async () => {
    const result = await service.createMovement(
      { productId: 'prod-1', quantity: -2 },
      'user-1',
    );

    expect(result.movementType).toBe(MovementType.ADJUSTMENT);
    expect(result.newStock).toBe(3);
  });

  it('allows a movement that brings stock to exactly 0', async () => {
    const result = await service.createMovement(
      { productId: 'prod-1', quantity: -5 },
      'user-1',
    );

    expect(result.newStock).toBe(0);
  });

  it('rejects a movement that would take stock negative, without writing', async () => {
    await expect(
      service.createMovement({ productId: 'prod-1', quantity: -6 }, 'user-1'),
    ).rejects.toThrow(BadRequestException);

    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('throws NotFound when the product does not exist', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.createMovement({ productId: 'nope', quantity: 1 }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('reads the product including soft-deleted ones, under a row lock', async () => {
    await service.createMovement({ productId: 'prod-1', quantity: 1 }, 'u');

    expect(queryBuilder.withDeleted).toHaveBeenCalled();
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
  });

  it('opens its own transaction when no manager is passed', async () => {
    await service.createMovement({ productId: 'prod-1', quantity: 1 }, 'u');

    expect(manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('runs on the caller-supplied manager without opening a transaction', async () => {
    const callerManager = {
      ...manager,
      transaction: jest.fn(),
    };

    await service.createMovement(
      { productId: 'prod-1', quantity: 1 },
      'u',
      callerManager as unknown as EntityManager,
    );

    expect(callerManager.transaction).not.toHaveBeenCalled();
    expect(manager.transaction).not.toHaveBeenCalled();
    expect(callerManager.update).toHaveBeenCalled();
  });

  it('stores the notes on the movement', async () => {
    await service.createMovement(
      { productId: 'prod-1', quantity: 1, notes: 'Compra X' },
      'u',
    );

    expect(manager.create).toHaveBeenCalledWith(
      InventoryMovement,
      expect.objectContaining({ notes: 'Compra X' }),
    );
  });
});
