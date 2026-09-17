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
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { DebitNoteResponseDto } from './dto/debit-note-response.dto';
import { QueryDebitNotesDto } from './dto/query-debit-notes.dto';
import { DebitNotesService } from './debit-notes.service';

@ApiTags('Invoicing — debit notes')
@ApiBearerAuth()
@Controller('invoicing/debit-notes')
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class DebitNotesController {
  constructor(private readonly debitNotesService: DebitNotesService) {}

  @ApiOperation({
    summary:
      'Issue a nota débito against an already-sent invoice (e.g. a product the original sale missed) — also decrements inventory',
  })
  @ApiResponse({ status: 201, type: DebitNoteResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock or the invoice has no Dataico uuid',
  })
  @ApiResponse({ status: 502, description: 'Dataico/DIAN rejected the note' })
  @Post()
  @RequirePermission('debit_notes.create')
  create(
    @Body() dto: CreateDebitNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DebitNoteResponseDto> {
    return this.debitNotesService.create(dto, user.id);
  }

  @ApiOperation({ summary: 'List debit notes, most recent first' })
  @ApiResponse({ status: 200, type: [DebitNoteResponseDto] })
  @Get()
  @RequirePermission('debit_notes.view')
  findAll(
    @Query() query: QueryDebitNotesDto,
  ): Promise<PaginatedResponseDto<DebitNoteResponseDto>> {
    return this.debitNotesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one debit note by id' })
  @ApiResponse({ status: 200, type: DebitNoteResponseDto })
  @Get(':id')
  @RequirePermission('debit_notes.view')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DebitNoteResponseDto> {
    const note = await this.debitNotesService.findOne(id);
    return DebitNoteResponseDto.fromEntity(note);
  }
}
