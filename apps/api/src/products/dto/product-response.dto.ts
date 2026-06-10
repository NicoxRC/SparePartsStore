import { Product } from '../entities/product.entity';

export class ProductResponseDto {
  id: string;
  reference: string;
  description: string;
  cost: number;
  salePrice: number;
  department: string;
  group: string;
  line: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(product: Product): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.reference = product.reference;
    dto.description = product.description;
    dto.cost = product.cost;
    dto.salePrice = product.salePrice;
    dto.department = product.department;
    dto.group = product.group;
    dto.line = product.line;
    dto.createdAt = product.createdAt.toISOString();
    dto.updatedAt = product.updatedAt.toISOString();
    return dto;
  }
}
