import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async createMovement(
    dto: CreateMovementDto,
    createdById: string,
  ): Promise<MovementResponseDto> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStock = product.stock + dto.quantity;
    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${product.stock}, cambio solicitado: ${dto.quantity}`,
      );
    }

    return this.movementsRepository.manager.transaction(async (manager) => {
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
    });
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
