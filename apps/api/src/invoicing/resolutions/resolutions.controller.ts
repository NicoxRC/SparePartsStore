import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { QueryResolutionsDto } from './dto/query-resolutions.dto';
import { ResolutionResponseDto } from './dto/resolution-response.dto';
import { ResolutionsService } from './resolutions.service';

@ApiTags('Invoicing — DIAN resolutions')
@ApiBearerAuth()
@Controller('invoicing/resolutions')
@Roles(UserRole.ADMIN)
export class ResolutionsController {
  constructor(private readonly resolutionsService: ResolutionsService) {}

  @ApiOperation({
    summary: 'Associate/sync a DIAN numbering resolution with Dataico',
  })
  @ApiResponse({ status: 201, type: ResolutionResponseDto })
  @ApiResponse({ status: 502, description: 'Dataico rejected the resolution' })
  @Post()
  create(
    @Body() dto: CreateResolutionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResolutionResponseDto> {
    return this.resolutionsService.create(dto, user.id);
  }

  @ApiOperation({ summary: 'List synced DIAN resolutions, most recent first' })
  @ApiResponse({ status: 200, type: [ResolutionResponseDto] })
  @Get()
  findAll(
    @Query() query: QueryResolutionsDto,
  ): Promise<PaginatedResponseDto<ResolutionResponseDto>> {
    return this.resolutionsService.findAll(query);
  }
}
