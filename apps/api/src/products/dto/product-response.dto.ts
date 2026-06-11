import { Product } from '../entities/product.entity';

export interface ProductLookupRef {
  id: string;
  code: string;
  name: string;
}

export class ProductResponseDto {
  id: string;
  reference: string;
  description: string;
  cost: number;
  salePrice: number;
  stock: number;
  department: ProductLookupRef;
  group: ProductLookupRef;
  brand: ProductLookupRef;
  createdAt: string;
  updatedAt: string;

  static fromEntity(product: Product): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.reference = product.reference;
    dto.description = product.description;
    dto.cost = product.cost;
    dto.salePrice = product.salePrice;
    dto.stock = product.stock;
    dto.department = {
      id: product.department.id,
      code: product.department.code,
      name: product.department.name,
    };
    dto.group = {
      id: product.group.id,
      code: product.group.code,
      name: product.group.name,
    };
    dto.brand = {
      id: product.brand.id,
      code: product.brand.code,
      name: product.brand.name,
    };
    dto.createdAt = product.createdAt.toISOString();
    dto.updatedAt = product.updatedAt.toISOString();
    return dto;
  }
}
