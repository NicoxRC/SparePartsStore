import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementResponseDto } from './dto/movement-response.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MovementResponseDto> {
    return this.inventoryService.createMovement(dto, user.id);
  }

  @Get('movements')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.AUDITOR)
  findMovements(
    @Query() query: QueryMovementsDto,
  ): Promise<PaginatedResponseDto<MovementResponseDto>> {
    return this.inventoryService.findMovements(query);
  }
}
