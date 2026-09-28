import { SaleType } from '../../common/enums/sale-type.enum';
import { isInitialInventorySupplier } from '../../suppliers/initial-inventory-supplier.constant';
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
  cost: number;
  saleType: SaleType;
  /** True while the supplier is "INVENTARIO INICIAL": the cost follows the sale price. */
  costDerived: boolean;
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
    dto.cost = product.cost;
    dto.saleType = product.saleType;
    dto.costDerived = isInitialInventorySupplier(product.supplier);
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
