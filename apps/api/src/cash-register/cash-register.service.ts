import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { isUniqueViolation } from '../common/utils/database-error.util';
import {
  getStoreDayRangeUtc,
  getStoreToday,
} from '../common/utils/store-date.util';
import { CreditNote } from '../invoicing/credit-notes/entities/credit-note.entity';
import { DebitNote } from '../invoicing/debit-notes/entities/debit-note.entity';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { CashRegisterNoteResponseDto } from './dto/cash-register-note.dto';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { CashRegisterStatusDto } from './dto/cash-register-status.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { QueryCashRegisterDto } from './dto/query-cash-register.dto';
import { CashMovement } from './entities/cash-movement.entity';
import { CashRegister } from './entities/cash-register.entity';

// Only field this service actually reads off an invoice's stored request
// payload — see the "totalCash/totalCard/totalTransfer" comment on
// CashRegister for why payment_means isn't promoted to its own invoices
// column just for this.
interface InvoiceRequestPayload {
  invoice?: { payment_means?: string };
}

const PAYMENT_MEANS = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    @InjectRepository(CashMovement)
    private readonly cashMovementRepository: Repository<CashMovement>,
    // Reads Invoice/Quotation directly (not via InvoicesService/
    // QuotationsService) for the read-only daily-total aggregates below —
    // both of those services depend on this one for the open-register
    // gate, so going through them here would create a circular module
    // dependency. A deliberate, narrow exception to "reach another domain
    // through its service" for a couple of SUM queries.
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    // Read directly for the same reason as Invoice/Quotation above — both
    // DebitNotesModule/CreditNotesModule import CashRegisterModule for the
    // open-register gate, so going the other way would be circular.
    @InjectRepository(DebitNote)
    private readonly debitNotesRepository: Repository<DebitNote>,
    @InjectRepository(CreditNote)
    private readonly creditNotesRepository: Repository<CreditNote>,
  ) {}

  async open(
    userId: string,
    openingAmount: number,
  ): Promise<CashRegisterResponseDto> {
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
      openingAmount,
    });

    try {
      const saved = await this.cashRegisterRepository.save(register);
      return this.buildResponse(await this.findWithRelations(saved.id));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('La caja de hoy ya fue abierta.');
      }
      throw error;
    }
  }

  async close(
    userId: string,
    countedCash: number,
  ): Promise<CashRegisterResponseDto> {
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

    const breakdown = await this.computePaymentBreakdown(today);
    const netMovements = await this.computeCashMovementsNet(register.id);
    const expectedCash = register.openingAmount + breakdown.cash + netMovements;

    register.totalAmount = await this.computeTotal(today);
    register.totalOwed = await this.computeOwedTotal(today);
    register.totalCash = breakdown.cash;
    register.totalCard = breakdown.card;
    register.totalTransfer = breakdown.transfer;
    register.expectedCash = expectedCash;
    register.countedCash = countedCash;
    register.cashDiscrepancy = countedCash - expectedCash;
    register.closedAt = new Date();
    register.closedBy = { id: userId } as CashRegister['closedBy'];

    const saved = await this.cashRegisterRepository.save(register);
    return this.buildResponse(await this.findWithRelations(saved.id));
  }

  /** Corrects a closed day's physical cash count — e.g. it was miscounted
   * or mistyped at close. Only `countedCash`/`cashDiscrepancy` change;
   * everything else about that day (invoices, movements, totals) stays
   * frozen, same append-only spirit as the rest of this table. */
  async updateCountedCash(
    id: string,
    countedCash: number,
  ): Promise<CashRegisterResponseDto> {
    const register = await this.cashRegisterRepository.findOne({
      where: { id },
    });
    if (!register) {
      throw new NotFoundException('Cash register not found');
    }
    if (register.closedAt === null || register.expectedCash === null) {
      throw new BadRequestException(
        'Solo se puede corregir el efectivo contado de una caja ya cerrada.',
      );
    }

    register.countedCash = countedCash;
    register.cashDiscrepancy = countedCash - register.expectedCash;

    const saved = await this.cashRegisterRepository.save(register);
    return this.buildResponse(await this.findWithRelations(saved.id));
  }

  /** Records a cash movement that isn't a sale (e.g. bringing in change,
   * pulling cash out for a supplier payment) against today's open
   * register. */
  async addMovement(
    dto: CreateCashMovementDto,
    userId: string,
  ): Promise<CashRegisterResponseDto> {
    const today = getStoreToday();
    const register = await this.cashRegisterRepository.findOne({
      where: { registerDate: today },
    });
    if (!register || register.closedAt !== null) {
      throw new BadRequestException(
        'No hay una caja abierta para hoy. Abre la caja antes de registrar movimientos.',
      );
    }

    const movement = this.cashMovementRepository.create({
      cashRegister: { id: register.id } as CashMovement['cashRegister'],
      amount: dto.amount,
      reason: dto.reason,
      createdBy: { id: userId } as CashMovement['createdBy'],
    });
    await this.cashMovementRepository.save(movement);

    return this.buildResponse(await this.findWithRelations(register.id));
  }

  async getTodayStatus(): Promise<CashRegisterStatusDto> {
    const today = getStoreToday();
    const register = await this.cashRegisterRepository.findOne({
      where: { registerDate: today },
      relations: ['openedBy', 'closedBy', 'movements', 'movements.createdBy'],
    });

    if (!register) {
      return {
        isOpen: false,
        register: null,
        totalSoFar: null,
        totalOwedSoFar: null,
        expectedCashSoFar: null,
        previousClosingCash: await this.findPreviousClosingCash(),
      };
    }

    const isOpen = register.closedAt === null;
    let expectedCashSoFar: number | null = null;
    if (isOpen) {
      const breakdown = await this.computePaymentBreakdown(today);
      const netMovements = await this.computeCashMovementsNet(register.id);
      expectedCashSoFar =
        register.openingAmount + breakdown.cash + netMovements;
    }

    return {
      isOpen,
      register: await this.buildResponse(register),
      totalSoFar: isOpen ? await this.computeTotal(today) : null,
      totalOwedSoFar: isOpen ? await this.computeOwedTotal(today) : null,
      expectedCashSoFar,
      previousClosingCash: null,
    };
  }

  async findAll(
    query: QueryCashRegisterDto,
  ): Promise<PaginatedResponseDto<CashRegisterResponseDto>> {
    const { page, limit } = query;

    const [registers, total] = await this.cashRegisterRepository.findAndCount({
      relations: ['openedBy', 'closedBy', 'movements', 'movements.createdBy'],
      order: { registerDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: await Promise.all(
        registers.map((register) => this.buildResponse(register)),
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

  /** Sum of `invoices.total_amount` created during the given store day —
   * what was actually collected ("lo recaudado"). */
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

  /** Sum of `quotations.total_amount` created during the given store day
   * that are still open (not yet invoiced or cancelled) — what was handed
   * out on credit and not yet collected ("lo adeudado"). Deliberately
   * scoped to quotations *created that day*: a quotation opened yesterday
   * and still unpaid is yesterday's debt, not today's — it was already
   * counted in yesterday's close and doesn't roll forward. */
  private async computeOwedTotal(storeDate: string): Promise<number> {
    const { start, end } = getStoreDayRangeUtc(storeDate);
    const result = await this.quotationsRepository
      .createQueryBuilder('quotation')
      .select('COALESCE(SUM(quotation.totalAmount), 0)', 'sum')
      .where('quotation.createdAt >= :start AND quotation.createdAt < :end', {
        start,
        end,
      })
      .andWhere('quotation.invoicedAt IS NULL')
      .andWhere('quotation.cancelledAt IS NULL')
      .getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0);
  }

  /** `total_amount` broken down by `payment_means`, read out of that day's
   * invoices' stored `request_payload` (never its own invoices column —
   * see the interface above). Debit/credit notes are deliberately excluded
   * — see the comment on CashRegister.totalCash. Any payment_means outside
   * the three confirmed values (shouldn't happen — the invoice form only
   * offers these) is silently left out of the breakdown, though it's still
   * part of `total_amount` itself. */
  private async computePaymentBreakdown(
    storeDate: string,
  ): Promise<{ cash: number; card: number; transfer: number }> {
    const { start, end } = getStoreDayRangeUtc(storeDate);
    const invoices = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select(['invoice.id', 'invoice.totalAmount', 'invoice.requestPayload'])
      .where('invoice.createdAt >= :start AND invoice.createdAt < :end', {
        start,
        end,
      })
      .getMany();

    return invoices.reduce(
      (acc, invoice) => {
        const paymentMeans = (invoice.requestPayload as InvoiceRequestPayload)
          ?.invoice?.payment_means;
        if (paymentMeans === PAYMENT_MEANS.CASH) {
          acc.cash += invoice.totalAmount;
        } else if (paymentMeans === PAYMENT_MEANS.CARD) {
          acc.card += invoice.totalAmount;
        } else if (paymentMeans === PAYMENT_MEANS.BANK_TRANSFER) {
          acc.transfer += invoice.totalAmount;
        }
        return acc;
      },
      { cash: 0, card: 0, transfer: 0 },
    );
  }

  /** Net of today's manual cash movements (entradas positive, salidas
   * negative) for the given register. */
  private async computeCashMovementsNet(
    cashRegisterId: string,
  ): Promise<number> {
    const result = await this.cashMovementRepository
      .createQueryBuilder('movement')
      .select('COALESCE(SUM(movement.amount), 0)', 'sum')
      .where('movement.cash_register_id = :cashRegisterId', { cashRegisterId })
      .getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0);
  }

  /** The last closed day's counted cash — surfaced by `getTodayStatus()`
   * only while nothing is open yet, purely as a frontend placeholder for
   * the next "abrir caja" input (see CashRegisterStatusDto). */
  private async findPreviousClosingCash(): Promise<number | null> {
    const previous = await this.cashRegisterRepository.findOne({
      where: { closedAt: Not(IsNull()) },
      order: { registerDate: 'DESC' },
    });
    return previous?.countedCash ?? null;
  }

  /** Attaches that day's debit/credit notes (informational only) to an
   * already-built response — see CashRegisterResponseDto.notes. */
  private async buildResponse(
    register: CashRegister,
  ): Promise<CashRegisterResponseDto> {
    const dto = CashRegisterResponseDto.fromEntity(register);
    dto.notes = await this.findNotesForDay(register.registerDate);
    return dto;
  }

  /** Debit/credit notes issued on the given store day, read straight off
   * their own tables (not folded into totalCash/expectedCash — see the
   * comment on CashRegister.totalCash for why). Shown purely so a manager
   * closing/reviewing the day can see a note happened, since it can move
   * real money without being a sale. */
  private async findNotesForDay(
    storeDate: string,
  ): Promise<CashRegisterNoteResponseDto[]> {
    const { start, end } = getStoreDayRangeUtc(storeDate);
    const [debitNotes, creditNotes] = await Promise.all([
      this.debitNotesRepository.find({
        where: { createdAt: Between(start, end) },
        relations: ['invoice'],
      }),
      this.creditNotesRepository.find({
        where: { createdAt: Between(start, end) },
        relations: ['invoice'],
      }),
    ]);

    const toDto = (
      note: DebitNote | CreditNote,
      type: 'debit' | 'credit',
    ): CashRegisterNoteResponseDto => ({
      id: note.id,
      type,
      number: note.number,
      prefix: note.prefix,
      totalAmount: note.totalAmount,
      invoiceNumber: note.invoice.number,
      invoicePrefix: note.invoice.prefix,
      createdAt: note.createdAt.toISOString(),
    });

    return [
      ...debitNotes.map((note) => toDto(note, 'debit')),
      ...creditNotes.map((note) => toDto(note, 'credit')),
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private async findWithRelations(id: string): Promise<CashRegister> {
    const register = await this.cashRegisterRepository.findOne({
      where: { id },
      relations: ['openedBy', 'closedBy', 'movements', 'movements.createdBy'],
    });
    if (!register) {
      throw new NotFoundException('Cash register not found');
    }
    return register;
  }
}
