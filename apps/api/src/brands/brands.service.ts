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
import { CreateBrandDto } from './dto/create-brand.dto';
import { BrandResponseDto } from './dto/brand-response.dto';
import { QueryBrandsDto } from './dto/query-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
  ) {}

  async create(
    dto: CreateBrandDto,
    createdById: string,
  ): Promise<BrandResponseDto> {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Code already in use');
    }

    const brand = this.brandsRepository.create({
      code: dto.code,
      name: dto.name,
      createdBy: { id: createdById } as Brand['createdBy'],
      updatedBy: { id: createdById } as Brand['updatedBy'],
    });

    try {
      const saved = await this.brandsRepository.save(brand);
      return BrandResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Code already in use');
      }
      throw error;
    }
  }

  async findAll(
    query: QueryBrandsDto,
  ): Promise<PaginatedResponseDto<BrandResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.brandsRepository.createQueryBuilder('brand');

    if (search) {
      qb.andWhere(
        "(brand.code ILIKE :search ESCAPE '\\' OR brand.name ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    qb.orderBy('brand.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [brands, total] = await qb.getManyAndCount();

    return {
      data: brands.map((brand) => BrandResponseDto.fromEntity(brand)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async findByCode(code: string): Promise<Brand | null> {
    return this.brandsRepository.findOne({ where: { code } });
  }

  async update(
    id: string,
    dto: UpdateBrandDto,
    updatedById: string,
  ): Promise<BrandResponseDto> {
    const brand = await this.findOne(id);

    if (dto.code && dto.code !== brand.code) {
      const existing = await this.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Code already in use');
      }
      brand.code = dto.code;
    }

    if (dto.name !== undefined) brand.name = dto.name;

    brand.updatedBy = { id: updatedById } as Brand['updatedBy'];

    try {
      const saved = await this.brandsRepository.save(brand);
      return BrandResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Code already in use');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    await this.brandsRepository.softRemove(brand);
  }
}
