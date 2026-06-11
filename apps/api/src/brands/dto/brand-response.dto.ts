import { Brand } from '../entities/brand.entity';

export class BrandResponseDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(brand: Brand): BrandResponseDto {
    const dto = new BrandResponseDto();
    dto.id = brand.id;
    dto.name = brand.name;
    dto.createdAt = brand.createdAt.toISOString();
    dto.updatedAt = brand.updatedAt.toISOString();
    return dto;
  }
}
