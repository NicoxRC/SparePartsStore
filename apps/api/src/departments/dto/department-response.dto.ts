import { Department } from '../entities/department.entity';

export class DepartmentResponseDto {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(department: Department): DepartmentResponseDto {
    const dto = new DepartmentResponseDto();
    dto.id = department.id;
    dto.code = department.code;
    dto.name = department.name;
    dto.createdAt = department.createdAt.toISOString();
    dto.updatedAt = department.updatedAt.toISOString();
    return dto;
  }
}
