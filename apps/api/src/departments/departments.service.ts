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
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Code already in use');
    }

    const department = this.departmentsRepository.create({
      code: dto.code,
      name: dto.name,
      createdBy: { id: createdById } as Department['createdBy'],
      updatedBy: { id: createdById } as Department['updatedBy'],
    });

    try {
      const saved = await this.departmentsRepository.save(department);
      return DepartmentResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Code already in use');
      }
      throw error;
    }
  }

  async findAll(
    query: QueryDepartmentsDto,
  ): Promise<PaginatedResponseDto<DepartmentResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.departmentsRepository.createQueryBuilder('department');

    if (search) {
      qb.andWhere(
        "(department.code ILIKE :search ESCAPE '\\' OR department.name ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
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

  async findByCode(code: string): Promise<Department | null> {
    return this.departmentsRepository.findOne({ where: { code } });
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    updatedById: string,
  ): Promise<DepartmentResponseDto> {
    const department = await this.findOne(id);

    if (dto.code && dto.code !== department.code) {
      const existing = await this.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Code already in use');
      }
      department.code = dto.code;
    }

    if (dto.name !== undefined) department.name = dto.name;

    department.updatedBy = { id: updatedById } as Department['updatedBy'];

    try {
      const saved = await this.departmentsRepository.save(department);
      return DepartmentResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Code already in use');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentsRepository.softRemove(department);
  }
}
