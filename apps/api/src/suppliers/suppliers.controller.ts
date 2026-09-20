import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Suppliers (proveedores)')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @ApiOperation({
    summary:
      'Search suppliers by name or NIT (any authenticated role — not sensitive, used by the products filter)',
  })
  @ApiResponse({ status: 200, type: [SupplierResponseDto] })
  @Get()
  findAll(
    @Query() query: QuerySuppliersDto,
  ): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    return this.suppliersService.findAll(query);
  }

  @ApiOperation({
    summary:
      'Rename a supplier (admin only). The NIT is its identity and is not editable.',
  })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, dto, user.id);
  }
}
