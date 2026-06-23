import { MovementType } from '../../common/enums/movement-type.enum';
import { InventoryMovement } from '../entities/inventory-movement.entity';

export class MovementResponseDto {
  id: string;
  productId: string;
  productReference: string;
  productDescription: string;
  movementType: MovementType;
  quantity: number;
  newStock: number;
  notes: string | null;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;

  static fromEntity(
    movement: InventoryMovement,
    newStock: number,
  ): MovementResponseDto {
    const dto = new MovementResponseDto();
    dto.id = movement.id;
    dto.productId = movement.product.id;
    dto.productReference = movement.product.reference;
    dto.productDescription = movement.product.description;
    dto.movementType = movement.movementType;
    dto.quantity = movement.quantity;
    dto.newStock = newStock;
    dto.notes = movement.notes;
    dto.createdBy = movement.createdBy
      ? {
          id: movement.createdBy.id,
          firstName: movement.createdBy.firstName,
          lastName: movement.createdBy.lastName,
        }
      : null;
    dto.createdAt = movement.createdAt.toISOString();
    return dto;
  }
}
