import { ApiProperty } from '@nestjs/swagger';
import { Supplier } from '../entities/supplier.entity';

export class SupplierResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Digits only, without the check digit.' })
  nit: string;
  @ApiProperty({ nullable: true, type: String }) dv: string | null;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;

  static fromEntity(supplier: Supplier): SupplierResponseDto {
    const dto = new SupplierResponseDto();
    dto.id = supplier.id;
    dto.nit = supplier.nit;
    dto.dv = supplier.dv;
    dto.name = supplier.name;
    dto.createdAt = supplier.createdAt.toISOString();
    dto.updatedAt = supplier.updatedAt.toISOString();
    return dto;
  }
}
