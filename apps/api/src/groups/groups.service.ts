import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
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
    const group = this.groupsRepository.create({
      code: await this.generateCode(),
      name: dto.name,
      createdBy: { id: createdById } as Group['createdBy'],
      updatedBy: { id: createdById } as Group['updatedBy'],
    });

    const saved = await this.groupsRepository.save(group);
    return GroupResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryGroupsDto,
  ): Promise<PaginatedResponseDto<GroupResponseDto>> {
    const { page, limit, search } = query;
    const qb = this.groupsRepository.createQueryBuilder('group');

    if (search) {
      qb.andWhere("group.name ILIKE :search ESCAPE '\\'", {
        search: `%${escapeLike(search)}%`,
      });
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

  async update(
    id: string,
    dto: UpdateGroupDto,
    updatedById: string,
  ): Promise<GroupResponseDto> {
    const group = await this.findOne(id);

    if (dto.name !== undefined) group.name = dto.name;

    group.updatedBy = { id: updatedById } as Group['updatedBy'];

    const saved = await this.groupsRepository.save(group);
    return GroupResponseDto.fromEntity(saved);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.groupsRepository.softRemove(group);
  }

  /**
   * Groups still carry an internal `code` (used by the Sisco export), but
   * it is no longer managed from the UI, so new entries get the next free
   * numeric code automatically.
   */
  private async generateCode(): Promise<string> {
    const result = await this.groupsRepository
      .createQueryBuilder('group')
      .withDeleted()
      .select('MAX(CAST(group.code AS INTEGER))', 'max')
      .where("group.code ~ '^[0-9]+$'")
      .getRawOne<{ max: string | null }>();

    return String((result?.max ? Number(result.max) : 0) + 1);
  }
}
