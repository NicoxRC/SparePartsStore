import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('articulos')
  @Roles(UserRole.ADMIN)
  async exportArticulos(@Res() res: Response): Promise<void> {
    const buffer = await this.exportService.generateArticulosWorkbook();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="articulos.xlsx"',
    );
    res.send(buffer);
  }
}
