import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
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
    const brand = this.brandsRepository.create({
      code: await this.generateCode(),
      name: dto.name,
      createdBy: { id: createdById } as Brand['createdBy'],
      updatedBy: { id: createdById } as Brand['updatedBy'],
    });

    const saved = await this.brandsRepository.save(brand);
    return BrandResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryBrandsDto,
  ): Promise<PaginatedResponseDto<BrandResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.brandsRepository.createQueryBuilder('brand');

    if (search) {
      qb.andWhere("brand.name ILIKE :search ESCAPE '\\'", {
        search: `%${escapeLike(search)}%`,
      });
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

  async update(
    id: string,
    dto: UpdateBrandDto,
    updatedById: string,
  ): Promise<BrandResponseDto> {
    const brand = await this.findOne(id);

    if (dto.name !== undefined) brand.name = dto.name;

    brand.updatedBy = { id: updatedById } as Brand['updatedBy'];

    const saved = await this.brandsRepository.save(brand);
    return BrandResponseDto.fromEntity(saved);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    await this.brandsRepository.softRemove(brand);
  }

  /**
   * Brands still carry an internal `code` (used by the Sisco export), but
   * it is no longer managed from the UI, so new entries get the next free
   * numeric code automatically.
   */
  private async generateCode(): Promise<string> {
    const result = await this.brandsRepository
      .createQueryBuilder('brand')
      .withDeleted()
      .select('MAX(CAST(brand.code AS INTEGER))', 'max')
      .where("brand.code ~ '^[0-9]+$'")
      .getRawOne<{ max: string | null }>();

    return String((result?.max ? Number(result.max) : 0) + 1);
  }
}
