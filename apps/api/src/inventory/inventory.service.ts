import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MovementType } from '../common/enums/movement-type.enum';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Product } from '../products/entities/product.entity';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementResponseDto } from './dto/movement-response.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { InventoryMovement } from './entities/inventory-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementsRepository: Repository<InventoryMovement>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /**
   * `manager` lets a caller (e.g. the purchase-import confirm) run this inside
   * its own transaction. Without one, the movement opens a transaction of its
   * own, exactly as before.
   */
  async createMovement(
    dto: CreateMovementDto,
    createdById: string,
    manager?: EntityManager,
  ): Promise<MovementResponseDto> {
    if (manager) {
      return this.applyMovement(manager, dto, createdById);
    }
    return this.movementsRepository.manager.transaction((transactionManager) =>
      this.applyMovement(transactionManager, dto, createdById),
    );
  }

  private async applyMovement(
    manager: EntityManager,
    dto: CreateMovementDto,
    createdById: string,
  ): Promise<MovementResponseDto> {
    // .withDeleted() — a movement here can be returning stock for a
    // quotation line whose product was soft-deleted after the sale (see
    // QuotationsService.cancel()/updateItems()); the product still exists
    // and its stock counter still needs updating even though it's no
    // longer sellable. Same pattern as ProductsService.findOne() for
    // soft-deleted lookups.
    //
    // The read happens inside the transaction with a row lock so two
    // concurrent movements on the same product can't both read the same
    // stock and lose one of the updates.
    const product = await manager
      .createQueryBuilder(Product, 'product')
      .withDeleted()
      .setLock('pessimistic_write')
      .where('product.id = :id', { id: dto.productId })
      .getOne();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStock = product.stock + dto.quantity;
    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${product.stock}, cambio solicitado: ${dto.quantity}`,
      );
    }

    const movementType =
      dto.quantity > 0 ? MovementType.PURCHASE : MovementType.ADJUSTMENT;

    const movement = manager.create(InventoryMovement, {
      product: { id: dto.productId } as Product,
      movementType,
      quantity: dto.quantity,
      notes: dto.notes ?? null,
      createdBy: { id: createdById } as InventoryMovement['createdBy'],
    });

    const saved = await manager.save(InventoryMovement, movement);
    await manager.update(Product, { id: dto.productId }, { stock: newStock });

    saved.product = product;
    return MovementResponseDto.fromEntity(saved, newStock);
  }

  async findMovements(
    query: QueryMovementsDto,
  ): Promise<PaginatedResponseDto<MovementResponseDto>> {
    const { page, limit, productId } = query;

    const qb = this.movementsRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.createdBy', 'createdBy')
      .orderBy('movement.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (productId) {
      qb.where('movement.product_id = :productId', { productId });
    }

    const [movements, total] = await qb.getManyAndCount();

    return {
      data: movements.map((m) => {
        const currentStock = m.product.stock;
        return MovementResponseDto.fromEntity(m, currentStock);
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
