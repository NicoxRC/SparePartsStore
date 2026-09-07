import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { QueryThirdPartyDto } from './dto/query-third-party.dto';
import { ThirdPartyResponseDto } from './dto/third-party-response.dto';
import { ThirdPartiesService } from './third-parties.service';

@ApiTags('Invoicing — DIAN third parties')
@ApiBearerAuth()
@Controller('invoicing/third-parties')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class ThirdPartiesController {
  constructor(private readonly thirdPartiesService: ThirdPartiesService) {}

  @ApiOperation({
    summary: 'Look up a customer/tercero by DIAN identification',
  })
  @ApiResponse({ status: 200, type: ThirdPartyResponseDto })
  @ApiResponse({
    status: 404,
    description: 'No tercero found for this identification',
  })
  @Get()
  lookup(@Query() query: QueryThirdPartyDto): Promise<ThirdPartyResponseDto> {
    return this.thirdPartiesService.lookup(query);
  }
}
