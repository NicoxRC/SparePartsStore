import { SaleType } from '../../common/enums/sale-type.enum';
import { Product } from '../entities/product.entity';

export interface ProductLookupRef {
  id: string;
  name: string;
}

export class ProductResponseDto {
  id: string;
  reference: string;
  description: string;
  cost: number;
  salePrice: number;
  saleType: SaleType;
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
    dto.saleType = product.saleType;
    dto.stock = product.stock;
    dto.department = {
      id: product.department.id,
      name: product.department.name,
    };
    dto.group = {
      id: product.group.id,
      name: product.group.name,
    };
    dto.brand = {
      id: product.brand.id,
      name: product.brand.name,
    };
    dto.createdAt = product.createdAt.toISOString();
    dto.updatedAt = product.updatedAt.toISOString();
    return dto;
  }
}
