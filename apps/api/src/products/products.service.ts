import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { SaleType } from '../common/enums/sale-type.enum';
import { isUniqueViolation } from '../common/utils/database-error.util';
import { escapeLike } from '../common/utils/escape-like.util';
import { Department } from '../departments/entities/department.entity';
import { Group } from '../groups/entities/group.entity';
import { Brand } from '../brands/entities/brand.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

const COST_FACTORS: Record<SaleType, number> = {
  [SaleType.NORMAL]: 1.65,
  [SaleType.NETO]: 1.3,
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Department)
    private readonly departmentsRepository: Repository<Department>,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
  ) {}

  async create(
    dto: CreateProductDto,
    createdById: string,
  ): Promise<ProductResponseDto> {
    const existing = await this.findByReference(dto.reference);
    if (existing) {
      throw new ConflictException('Reference already in use');
    }

    const department = await this.departmentsRepository.findOne({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Invalid departmentId: department not found');
    }

    const group = await this.groupsRepository.findOne({
      where: { id: dto.groupId },
    });
    if (!group) {
      throw new NotFoundException('Invalid groupId: group not found');
    }

    const brand = await this.brandsRepository.findOne({
      where: { id: dto.brandId },
    });
    if (!brand) {
      throw new NotFoundException('Invalid brandId: brand not found');
    }

    const product = this.productsRepository.create({
      reference: dto.reference,
      description: dto.description,
      salePrice: dto.salePrice,
      saleType: dto.saleType,
      cost: this.calculateCost(dto.salePrice, dto.saleType),
      stock: dto.stock,
      department,
      group,
      brand,
      createdBy: { id: createdById } as Product['createdBy'],
      updatedBy: { id: createdById } as Product['updatedBy'],
    });

    try {
      const saved = await this.productsRepository.save(product);
      return ProductResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Reference already in use');
      }
      throw error;
    }
  }

  async findAll(
    query: QueryProductsDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const { page, limit, search, departmentId, groupId, brandId } = query;
    const qb = this.productsRepository
      .createQueryBuilder('product')
      // .withDeleted() disables TypeORM's automatic "deleted_at IS NULL" filter
      // for both the product and its joined lookups, so a product whose
      // department/group/brand was later soft-deleted still resolves (see
      // docs/ApiContract.md §6.6: lookups can be deactivated while still
      // referenced). The product's own soft-delete filter is re-added below.
      .withDeleted()
      .leftJoinAndSelect('product.department', 'department')
      .leftJoinAndSelect('product.group', 'group')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.deletedAt IS NULL');

    if (search) {
      qb.andWhere(
        "(product.reference ILIKE :search ESCAPE '\\' OR product.description ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (departmentId) {
      qb.andWhere('product.department_id = :departmentId', { departmentId });
    }

    if (groupId) {
      qb.andWhere('product.group_id = :groupId', { groupId });
    }

    if (brandId) {
      qb.andWhere('product.brand_id = :brandId', { brandId });
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await qb.getManyAndCount();

    return {
      data: products.map((product) => ProductResponseDto.fromEntity(product)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Product> {
    // See findAll() for why .withDeleted() + an explicit product.deletedAt
    // filter are needed: a product's department/group/brand may have been
    // soft-deleted after the product was created, but the product should
    // still resolve and display that lookup's data.
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .withDeleted()
      .leftJoinAndSelect('product.department', 'department')
      .leftJoinAndSelect('product.group', 'group')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.id = :id', { id })
      .andWhere('product.deletedAt IS NULL')
      .getOne();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findByReference(reference: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { reference } });
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    updatedById: string,
  ): Promise<ProductResponseDto> {
    const product = await this.findOne(id);

    if (dto.reference && dto.reference !== product.reference) {
      const existing = await this.findByReference(dto.reference);
      if (existing && existing.id !== id) {
        throw new ConflictException('Reference already in use');
      }
      product.reference = dto.reference;
    }

    if (dto.description !== undefined) product.description = dto.description;

    if (dto.departmentId !== undefined) {
      const department = await this.departmentsRepository.findOne({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException(
          'Invalid departmentId: department not found',
        );
      }
      product.department = department;
    }

    if (dto.groupId !== undefined) {
      const group = await this.groupsRepository.findOne({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException('Invalid groupId: group not found');
      }
      product.group = group;
    }

    if (dto.brandId !== undefined) {
      const brand = await this.brandsRepository.findOne({
        where: { id: dto.brandId },
      });
      if (!brand) {
        throw new NotFoundException('Invalid brandId: brand not found');
      }
      product.brand = brand;
    }

    if (dto.salePrice !== undefined) product.salePrice = dto.salePrice;
    if (dto.saleType !== undefined) product.saleType = dto.saleType;

    if (dto.salePrice !== undefined || dto.saleType !== undefined) {
      product.cost = this.calculateCost(product.salePrice, product.saleType);
    }

    if (dto.stock !== undefined) product.stock = dto.stock;

    product.updatedBy = { id: updatedById } as Product['updatedBy'];

    try {
      const saved = await this.productsRepository.save(product);
      return ProductResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Reference already in use');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.softRemove(product);
  }

  private calculateCost(salePrice: number, saleType: SaleType): number {
    return Math.round(salePrice / COST_FACTORS[saleType]);
  }
}
