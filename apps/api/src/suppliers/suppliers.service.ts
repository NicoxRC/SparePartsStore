import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { isUniqueViolation } from '../common/utils/database-error.util';
import { escapeLike } from '../common/utils/escape-like.util';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  async findAll(
    query: QuerySuppliersDto,
  ): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.suppliersRepository.createQueryBuilder('supplier');

    if (search) {
      qb.andWhere(
        "(supplier.name ILIKE :search ESCAPE '\\' OR supplier.nit ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    qb.orderBy('supplier.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [suppliers, total] = await qb.getManyAndCount();

    return {
      data: suppliers.map((supplier) =>
        SupplierResponseDto.fromEntity(supplier),
      ),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    updatedById: string,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.findOne(id);
    supplier.name = dto.name;
    supplier.updatedBy = { id: updatedById } as Supplier['updatedBy'];
    const saved = await this.suppliersRepository.save(supplier);
    return SupplierResponseDto.fromEntity(saved);
  }

  /**
   * Finds the supplier by NIT or creates it. The name (and DV) only ever come
   * from the XML on creation — an existing supplier's name may have been
   * renamed by an admin and must not be overwritten by a later upload.
   */
  async findOrCreateByNit(
    data: { nit: string; dv: string | null; name: string | null },
    createdById: string,
    manager?: EntityManager,
  ): Promise<Supplier> {
    const repository = manager
      ? manager.getRepository(Supplier)
      : this.suppliersRepository;

    const existing = await repository.findOne({ where: { nit: data.nit } });
    if (existing) return existing;

    // The Excel template can leave the name empty when the supplier is
    // expected to exist already; creating one with no name is not allowed.
    if (!data.name?.trim()) {
      throw new UnprocessableEntityException({
        code: 'MISSING_SUPPLIER_NAME',
        message:
          'El proveedor con este NIT no existe todavía: escribe también su nombre.',
      });
    }

    const supplier = repository.create({
      nit: data.nit,
      dv: data.dv,
      name: data.name.toUpperCase().trim().slice(0, 255),
      createdBy: { id: createdById } as Supplier['createdBy'],
      updatedBy: { id: createdById } as Supplier['updatedBy'],
    });

    try {
      return await repository.save(supplier);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await repository.findOne({ where: { nit: data.nit } });
        if (raced) return raced;
      }
      throw error;
    }
  }
}
