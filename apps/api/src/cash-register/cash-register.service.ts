import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { isUniqueViolation } from '../common/utils/database-error.util';
import {
  getStoreDayRangeUtc,
  getStoreToday,
} from '../common/utils/store-date.util';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { CashRegisterStatusDto } from './dto/cash-register-status.dto';
import { QueryCashRegisterDto } from './dto/query-cash-register.dto';
import { CashRegister } from './entities/cash-register.entity';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    // Reads Invoice directly (not via InvoicesService) for the read-only
    // daily-total aggregate below — InvoicesService itself depends on this
    // service for the open-register gate, so going through it here would
    // create a circular module dependency. A deliberate, narrow exception
    // to "reach another domain through its service" for a single SUM query.
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
  ) {}

  async open(userId: string): Promise<CashRegisterResponseDto> {
    const today = getStoreToday();
    const existing = await this.cashRegisterRepository.findOne({
      where: { registerDate: today },
    });
    if (existing) {
      throw new ConflictException('La caja de hoy ya fue abierta.');
    }

    const register = this.cashRegisterRepository.create({
      registerDate: today,
      openedAt: new Date(),
      openedBy: { id: userId } as CashRegister['openedBy'],
    });

    try {
      const saved = await this.cashRegisterRepository.save(register);
      return CashRegisterResponseDto.fromEntity(
        await this.findWithRelations(saved.id),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('La caja de hoy ya fue abierta.');
      }
      throw error;
    }
  }

  async close(userId: string): Promise<CashRegisterResponseDto> {
    const today = getStoreToday();
    const register = await this.cashRegisterRepository.findOne({
      where: { registerDate: today },
    });
    if (!register) {
      throw new NotFoundException('No hay una caja abierta para hoy.');
    }
    if (register.closedAt !== null) {
      throw new ConflictException('La caja de hoy ya fue cerrada.');
    }

    const pendingCount = await this.countPendingInvoices(today);
    if (pendingCount > 0) {
      throw new ConflictException(
        `No se puede cerrar la caja: hay ${pendingCount} factura(s) sin confirmar por la DIAN. Usa "Consultar" o "Reenviar" en Facturas antes de cerrar.`,
      );
    }

    register.totalAmount = await this.computeTotal(today);
    register.closedAt = new Date();
    register.closedBy = { id: userId } as CashRegister['closedBy'];

    const saved = await this.cashRegisterRepository.save(register);
    return CashRegisterResponseDto.fromEntity(
      await this.findWithRelations(saved.id),
    );
  }

  async getTodayStatus(): Promise<CashRegisterStatusDto> {
    const today = getStoreToday();
    const register = await this.cashRegisterRepository.findOne({
      where: { registerDate: today },
      relations: ['openedBy', 'closedBy'],
    });

    if (!register) {
      return { isOpen: false, register: null, totalSoFar: null };
    }

    const isOpen = register.closedAt === null;
    return {
      isOpen,
      register: CashRegisterResponseDto.fromEntity(register),
      totalSoFar: isOpen ? await this.computeTotal(today) : null,
    };
  }

  async findAll(
    query: QueryCashRegisterDto,
  ): Promise<PaginatedResponseDto<CashRegisterResponseDto>> {
    const { page, limit } = query;

    const [registers, total] = await this.cashRegisterRepository.findAndCount({
      relations: ['openedBy', 'closedBy'],
      order: { registerDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: registers.map((register) =>
        CashRegisterResponseDto.fromEntity(register),
      ),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Gate used by `InvoicesService.create` — throws if today has no open register. */
  async assertOpenToday(): Promise<void> {
    const today = getStoreToday();
    const register = await this.cashRegisterRepository.findOne({
      where: { registerDate: today },
    });
    if (!register || register.closedAt !== null) {
      throw new BadRequestException(
        'No hay una caja abierta para hoy. Abre la caja antes de facturar.',
      );
    }
  }

  /** Invoices created during the given store day that DIAN hasn't accepted
   * yet — `dianStatus` is still null (never confirmed) or a rejection.
   * Closing the register with these open invites the day's paperwork
   * getting forgotten; staff must resolve them ("Consultar"/"Reenviar")
   * first. */
  private async countPendingInvoices(storeDate: string): Promise<number> {
    const { start, end } = getStoreDayRangeUtc(storeDate);
    return this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.createdAt >= :start AND invoice.createdAt < :end', {
        start,
        end,
      })
      .andWhere(
        '(invoice.dianStatus IS NULL OR invoice.dianStatus != :accepted)',
        { accepted: 'DIAN_ACEPTADO' },
      )
      .getCount();
  }

  /** Sum of `invoices.total_amount` created during the given store day. */
  private async computeTotal(storeDate: string): Promise<number> {
    const { start, end } = getStoreDayRangeUtc(storeDate);
    const result = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'sum')
      .where('invoice.createdAt >= :start AND invoice.createdAt < :end', {
        start,
        end,
      })
      .getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0);
  }

  private async findWithRelations(id: string): Promise<CashRegister> {
    const register = await this.cashRegisterRepository.findOne({
      where: { id },
      relations: ['openedBy', 'closedBy'],
    });
    if (!register) {
      throw new NotFoundException('Cash register not found');
    }
    return register;
  }
}
