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
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { QueryGroupsDto } from './dto/query-groups.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
  ) {}

  async create(
    dto: CreateGroupDto,
    createdById: string,
  ): Promise<GroupResponseDto> {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Code already in use');
    }

    const group = this.groupsRepository.create({
      code: dto.code,
      name: dto.name,
      createdBy: { id: createdById } as Group['createdBy'],
      updatedBy: { id: createdById } as Group['updatedBy'],
    });

    try {
      const saved = await this.groupsRepository.save(group);
      return GroupResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Code already in use');
      }
      throw error;
    }
  }

  async findAll(
    query: QueryGroupsDto,
  ): Promise<PaginatedResponseDto<GroupResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.groupsRepository.createQueryBuilder('group');

    if (search) {
      qb.andWhere(
        "(group.code ILIKE :search ESCAPE '\\' OR group.name ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    qb.orderBy('group.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [groups, total] = await qb.getManyAndCount();

    return {
      data: groups.map((group) => GroupResponseDto.fromEntity(group)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupsRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async findByCode(code: string): Promise<Group | null> {
    return this.groupsRepository.findOne({ where: { code } });
  }

  async update(
    id: string,
    dto: UpdateGroupDto,
    updatedById: string,
  ): Promise<GroupResponseDto> {
    const group = await this.findOne(id);

    if (dto.code && dto.code !== group.code) {
      const existing = await this.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Code already in use');
      }
      group.code = dto.code;
    }

    if (dto.name !== undefined) group.name = dto.name;

    group.updatedBy = { id: updatedById } as Group['updatedBy'];

    try {
      const saved = await this.groupsRepository.save(group);
      return GroupResponseDto.fromEntity(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Code already in use');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.groupsRepository.softRemove(group);
  }
}
