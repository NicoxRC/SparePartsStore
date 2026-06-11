import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { escapeLike } from '../common/utils/escape-like.util';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentsRepository: Repository<Department>,
  ) {}

  async create(
    dto: CreateDepartmentDto,
    createdById: string,
  ): Promise<DepartmentResponseDto> {
    const department = this.departmentsRepository.create({
      code: await this.generateCode(),
      name: dto.name,
      createdBy: { id: createdById } as Department['createdBy'],
      updatedBy: { id: createdById } as Department['updatedBy'],
    });

    const saved = await this.departmentsRepository.save(department);
    return DepartmentResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryDepartmentsDto,
  ): Promise<PaginatedResponseDto<DepartmentResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.departmentsRepository.createQueryBuilder('department');

    if (search) {
      qb.andWhere("department.name ILIKE :search ESCAPE '\\'", {
        search: `%${escapeLike(search)}%`,
      });
    }

    qb.orderBy('department.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [departments, total] = await qb.getManyAndCount();

    return {
      data: departments.map((department) =>
        DepartmentResponseDto.fromEntity(department),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findOne({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    updatedById: string,
  ): Promise<DepartmentResponseDto> {
    const department = await this.findOne(id);

    if (dto.name !== undefined) department.name = dto.name;

    department.updatedBy = { id: updatedById } as Department['updatedBy'];

    const saved = await this.departmentsRepository.save(department);
    return DepartmentResponseDto.fromEntity(saved);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentsRepository.softRemove(department);
  }

  /**
   * Departments still carry an internal `code` (used by the Sisco export),
   * but it is no longer managed from the UI, so new entries get the next
   * free numeric code automatically.
   */
  private async generateCode(): Promise<string> {
    const result = await this.departmentsRepository
      .createQueryBuilder('department')
      .withDeleted()
      .select('MAX(CAST(department.code AS INTEGER))', 'max')
      .where("department.code ~ '^[0-9]+$'")
      .getRawOne<{ max: string | null }>();

    return String((result?.max ? Number(result.max) : 0) + 1);
  }
}
