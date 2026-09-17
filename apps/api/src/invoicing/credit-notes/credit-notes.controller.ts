import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
} from '../../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreditNoteResponseDto } from './dto/credit-note-response.dto';
import { QueryCreditNotesDto } from './dto/query-credit-notes.dto';
import { CreditNotesService } from './credit-notes.service';

@ApiTags('Invoicing — credit notes')
@ApiBearerAuth()
@Controller('invoicing/credit-notes')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @ApiOperation({
    summary:
      'Issue a nota crédito against an already-sent invoice (a returned product, an overcharge, an error correction) — also returns inventory',
  })
  @ApiResponse({ status: 201, type: CreditNoteResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'The invoice has no Dataico uuid, or its stored payload is missing customer/payment data',
  })
  @ApiResponse({ status: 502, description: 'Dataico/DIAN rejected the note' })
  @Post()
  create(
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreditNoteResponseDto> {
    return this.creditNotesService.create(dto, user.id);
  }

  @ApiOperation({ summary: 'List credit notes, most recent first' })
  @ApiResponse({ status: 200, type: [CreditNoteResponseDto] })
  @Get()
  findAll(
    @Query() query: QueryCreditNotesDto,
  ): Promise<PaginatedResponseDto<CreditNoteResponseDto>> {
    return this.creditNotesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one credit note by id' })
  @ApiResponse({ status: 200, type: CreditNoteResponseDto })
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreditNoteResponseDto> {
    const note = await this.creditNotesService.findOne(id);
    return CreditNoteResponseDto.fromEntity(note);
  }
}
