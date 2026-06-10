import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { isUniqueViolation } from '../common/utils/database-error.util';
import { escapeLike } from '../common/utils/escape-like.util';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

const COST_FACTOR = 1.5;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async create(
    dto: CreateProductDto,
    createdById: string,
  ): Promise<ProductResponseDto> {
    const existing = await this.findByReference(dto.reference);
    if (existing) {
      throw new ConflictException('Reference already in use');
    }

    const product = this.productsRepository.create({
      reference: dto.reference,
      description: dto.description,
      salePrice: dto.salePrice,
      cost: this.calculateCost(dto.salePrice),
      department: dto.department,
      group: dto.group,
      line: dto.line,
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
    const { page, limit, search, department, group, line } = query;
    const qb = this.productsRepository.createQueryBuilder('product');

    if (search) {
      qb.andWhere(
        "(product.reference ILIKE :search ESCAPE '\\' OR product.description ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (department) {
      qb.andWhere('product.department = :department', { department });
    }

    if (group) {
      qb.andWhere('product.group = :group', { group });
    }

    if (line) {
      qb.andWhere('product.line = :line', { line });
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
    const product = await this.productsRepository.findOne({ where: { id } });
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
    if (dto.department !== undefined) product.department = dto.department;
    if (dto.group !== undefined) product.group = dto.group;
    if (dto.line !== undefined) product.line = dto.line;

    if (dto.salePrice !== undefined) {
      product.salePrice = dto.salePrice;
      product.cost = this.calculateCost(dto.salePrice);
    }

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

  private calculateCost(salePrice: number): number {
    return Math.round((salePrice / COST_FACTOR) * 100) / 100;
  }
}
