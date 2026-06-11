import { Group } from '../entities/group.entity';

export class GroupResponseDto {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(group: Group): GroupResponseDto {
    const dto = new GroupResponseDto();
    dto.id = group.id;
    dto.code = group.code;
    dto.name = group.name;
    dto.createdAt = group.createdAt.toISOString();
    dto.updatedAt = group.updatedAt.toISOString();
    return dto;
  }
}
