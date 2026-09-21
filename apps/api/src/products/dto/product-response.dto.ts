import { Product } from '../entities/product.entity';

export interface ProductLookupRef {
  id: string;
  name: string;
}

export class ProductResponseDto {
  id: string;
  reference: string;
  description: string;
  salePrice: number;
  stock: number;
  taxExempt: boolean;
  department: ProductLookupRef;
  group: ProductLookupRef;
  brand: ProductLookupRef;
  supplier: ProductLookupRef | null;
  createdAt: string;
  updatedAt: string;

  static fromEntity(product: Product): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.reference = product.reference;
    dto.description = product.description;
    dto.salePrice = product.salePrice;
    dto.stock = product.stock;
    dto.taxExempt = product.taxExempt;
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
    dto.supplier = product.supplier
      ? { id: product.supplier.id, name: product.supplier.name }
      : null;
    dto.createdAt = product.createdAt.toISOString();
    dto.updatedAt = product.updatedAt.toISOString();
    return dto;
  }
}
