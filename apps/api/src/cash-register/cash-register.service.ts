import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { isUniqueViolation } from '../common/utils/database-error.util';
import { CASH_REGISTER_NUMBERS } from '../common/constants/cash-register.constant';
import { getStoreToday } from '../common/utils/store-date.util';
import { CreditNote } from '../invoicing/credit-notes/entities/credit-note.entity';
import { DebitNote } from '../invoicing/debit-notes/entities/debit-note.entity';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { CashRegisterNoteResponseDto } from './dto/cash-register-note.dto';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { CashRegisterStatusDto } from './dto/cash-register-status.dto';
import { DayInvoicesReportDto } from './dto/day-invoices-report.dto';
import { buildDayInvoicesReport } from './day-invoices-report.util';
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
    registerNumber: number,
    openingAmount: number,
  ): Promise<CashRegisterResponseDto> {
    const today = getStoreToday();
    const existing = await this.findToday(registerNumber);
    if (existing) {
      throw new ConflictException(
        `La Caja ${registerNumber} de hoy ya fue abierta.`,
      );
    }

    const register = this.cashRegisterRepository.create({
      registerDate: today,
      registerNumber,
      openedAt: new Date(),
      openedBy: { id: userId } as CashRegister['openedBy'],
      openingAmount,
    });

    try {
      const saved = await this.cashRegisterRepository.save(register);
      return this.buildResponse(await this.findWithRelations(saved.id));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `La Caja ${registerNumber} de hoy ya fue abierta.`,
        );
      }
      throw error;
    }
  }

  async close(
    userId: string,
    registerNumber: number,
    countedCash: number,
  ): Promise<CashRegisterResponseDto> {
    const register = await this.findToday(registerNumber);
    if (!register) {
      throw new NotFoundException(
        `La Caja ${registerNumber} no está abierta hoy.`,
      );
    }
    if (register.closedAt !== null) {
      throw new ConflictException(
        `La Caja ${registerNumber} de hoy ya fue cerrada.`,
      );
    }

    return this.closeRegister(register, userId, countedCash);
  }

  /** Closes a register from an earlier day that was never closed. Totals are
   * computed for *that* register, same as a normal close. `countedCash` may be
   * left out when nobody counted the drawer back then: the expected cash is
   * taken as counted (no discrepancy) — it can be corrected afterwards with
   * `updateCountedCash`. Today's register goes through `close()` instead. */
  async closePast(
    id: string,
    userId: string,
    allowedNumbers: readonly number[],
    countedCash?: number,
  ): Promise<CashRegisterResponseDto> {
    const register = await this.findAllowed(id, allowedNumbers);
    if (register.closedAt !== null) {
      throw new ConflictException('Esa caja ya fue cerrada.');
    }
    if (register.registerDate >= getStoreToday()) {
      throw new BadRequestException(
        'Esa es la caja de hoy: ciérrala con "Cerrar caja".',
      );
    }
    return this.closeRegister(register, userId, countedCash);
  }

  private async closeRegister(
    register: CashRegister,
    userId: string,
    countedCash?: number,
  ): Promise<CashRegisterResponseDto> {
    const breakdown = await this.computePaymentBreakdown(register.id);
    const netMovements = await this.computeCashMovementsNet(register.id);
    const expectedCash = register.openingAmount + breakdown.cash + netMovements;
    const counted = countedCash ?? expectedCash;

    register.totalAmount = await this.computeTotal(register.id);
    register.totalOwed = await this.computeOwedTotal(register.id);
    register.totalCash = breakdown.cash;
    register.totalCard = breakdown.card;
    register.totalTransfer = breakdown.transfer;
    register.expectedCash = expectedCash;
    register.countedCash = counted;
    register.cashDiscrepancy = counted - expectedCash;
    register.closedAt = new Date();
    register.closedBy = { id: userId } as CashRegister['closedBy'];

    const saved = await this.cashRegisterRepository.save(register);
    return this.buildResponse(await this.findWithRelations(saved.id));
  }

  /** Undoes an accidental close of today's register — nulls `closedAt`/
   * `closedBy` and the totals `close()` had frozen, so the day resumes as
   * open on the *same* row (invoices/quotations/movements point at it by
   * FK and are never touched by this). Re-closing later recomputes
   * everything from scratch. Only today's register can be reopened, same
   * "today" scoping as the rest of this service. */
  async reopen(registerNumber: number): Promise<CashRegisterResponseDto> {
    const register = await this.findToday(registerNumber);
    if (!register) {
      throw new NotFoundException(
        `La Caja ${registerNumber} no se ha abierto hoy.`,
      );
    }
    if (register.closedAt === null) {
      throw new ConflictException(
        `La Caja ${registerNumber} de hoy ya está abierta.`,
      );
    }

    register.closedAt = null;
    register.closedBy = null;
    register.totalAmount = null;
    register.totalOwed = null;
    register.totalCash = null;
    register.totalCard = null;
    register.totalTransfer = null;
    register.expectedCash = null;
    register.countedCash = null;
    register.cashDiscrepancy = null;

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
    allowedNumbers: readonly number[],
  ): Promise<CashRegisterResponseDto> {
    const register = await this.findAllowed(id, allowedNumbers);
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
   * pulling cash out for a supplier payment) against that till's open
   * register. */
  async addMovement(
    dto: CreateCashMovementDto,
    userId: string,
    registerNumber: number,
  ): Promise<CashRegisterResponseDto> {
    const register = await this.findToday(registerNumber);
    if (!register || register.closedAt !== null) {
      throw new BadRequestException(
        `La Caja ${registerNumber} no está abierta hoy. Ábrela antes de registrar movimientos.`,
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

  async getTodayStatus(registerNumber: number): Promise<CashRegisterStatusDto> {
    const register = await this.cashRegisterRepository.findOne({
      where: { registerDate: getStoreToday(), registerNumber },
      relations: ['openedBy', 'closedBy', 'movements', 'movements.createdBy'],
    });

    if (!register) {
      return {
        isOpen: false,
        register: null,
        totalSoFar: null,
        totalOwedSoFar: null,
        expectedCashSoFar: null,
        previousClosingCash: await this.findPreviousClosingCash(registerNumber),
      };
    }

    const isOpen = register.closedAt === null;
    let expectedCashSoFar: number | null = null;
    if (isOpen) {
      const breakdown = await this.computePaymentBreakdown(register.id);
      const netMovements = await this.computeCashMovementsNet(register.id);
      expectedCashSoFar =
        register.openingAmount + breakdown.cash + netMovements;
    }

    return {
      isOpen,
      register: await this.buildResponse(register),
      totalSoFar: isOpen ? await this.computeTotal(register.id) : null,
      totalOwedSoFar: isOpen ? await this.computeOwedTotal(register.id) : null,
      expectedCashSoFar,
      previousClosingCash: null,
    };
  }

  /** Store-wide picture of today for the admin dashboard: every till added
   * up, plus each till on its own. The added-up totals keep the "only while
   * open" rule of `getTodayStatus()`, with open meaning at least one till
   * is; a till's own figures stay visible once it's closed (null only if it
   * wasn't opened today). */
  async getTodayStoreSummary(): Promise<{
    isOpen: boolean;
    totalSoFar: number | null;
    totalOwedSoFar: number | null;
    registers: {
      registerNumber: number;
      isOpen: boolean;
      collected: number | null;
      owed: number | null;
    }[];
  }> {
    const todays = await this.cashRegisterRepository.find({
      where: { registerDate: getStoreToday() },
    });

    const registers = await Promise.all(
      CASH_REGISTER_NUMBERS.map(async (registerNumber) => {
        const register = todays.find(
          (candidate) => candidate.registerNumber === registerNumber,
        );
        if (!register) {
          return { registerNumber, isOpen: false, collected: null, owed: null };
        }
        return {
          registerNumber,
          isOpen: register.closedAt === null,
          collected: await this.computeTotal(register.id),
          owed: await this.computeOwedTotal(register.id),
        };
      }),
    );

    const isOpen = registers.some((register) => register.isOpen);
    return {
      isOpen,
      totalSoFar: isOpen
        ? registers.reduce(
            (sum, register) => sum + (register.collected ?? 0),
            0,
          )
        : null,
      totalOwedSoFar: isOpen
        ? registers.reduce((sum, register) => sum + (register.owed ?? 0), 0)
        : null,
      registers,
    };
  }

  /** `allowedNumbers` — the caller's tills; other tills' registers are
   * left out (see allowedCashRegisterNumbers). */
  async findAll(
    query: QueryCashRegisterDto,
    allowedNumbers: readonly number[],
  ): Promise<PaginatedResponseDto<CashRegisterResponseDto>> {
    const { page, limit } = query;

    const [registers, total] = await this.cashRegisterRepository.findAndCount({
      where: { registerNumber: In([...allowedNumbers]) },
      relations: ['openedBy', 'closedBy', 'movements', 'movements.createdBy'],
      order: { registerDate: 'DESC', registerNumber: 'ASC' },
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

  /** Gate used by `InvoicesService.create` and the other sale documents —
   * throws if that till has no open register today, otherwise returns the
   * register so the caller can tie the document to it. */
  async assertOpenToday(registerNumber: number): Promise<CashRegister> {
    const register = await this.findToday(registerNumber);
    if (!register || register.closedAt !== null) {
      throw new BadRequestException(
        `La Caja ${registerNumber} no está abierta hoy. Ábrela antes de facturar.`,
      );
    }
    return register;
  }

  /** Sum of `invoices.total_amount` made in the given register — what was
   * actually collected ("lo recaudado"). */
  private async computeTotal(cashRegisterId: string): Promise<number> {
    const result = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'sum')
      .where('invoice.cash_register_id = :cashRegisterId', { cashRegisterId })
      .getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0);
  }

  /** Sum of `quotations.total_amount` made in the given register that are
   * still open (not yet invoiced or cancelled) — what was handed out on
   * credit and not yet collected ("lo adeudado"). A quotation only ever
   * counts in the register it was created in: one opened yesterday and
   * still unpaid is yesterday's debt, already in that close, and doesn't
   * roll forward. */
  private async computeOwedTotal(cashRegisterId: string): Promise<number> {
    const result = await this.quotationsRepository
      .createQueryBuilder('quotation')
      .select('COALESCE(SUM(quotation.totalAmount), 0)', 'sum')
      .where('quotation.cash_register_id = :cashRegisterId', {
        cashRegisterId,
      })
      .andWhere('quotation.invoicedAt IS NULL')
      .andWhere('quotation.cancelledAt IS NULL')
      .getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0);
  }

  /** `total_amount` broken down by `payment_means`, read out of that
   * register's invoices' stored `request_payload` (never its own invoices column —
   * see the interface above). Debit/credit notes are deliberately excluded
   * — see the comment on CashRegister.totalCash. Any payment_means outside
   * the three confirmed values (shouldn't happen — the invoice form only
   * offers these) is silently left out of the breakdown, though it's still
   * part of `total_amount` itself. */
  private async computePaymentBreakdown(
    cashRegisterId: string,
  ): Promise<{ cash: number; card: number; transfer: number }> {
    const invoices = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select(['invoice.id', 'invoice.totalAmount', 'invoice.requestPayload'])
      .where('invoice.cash_register_id = :cashRegisterId', { cashRegisterId })
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

  /** Net of the manual cash movements (entradas positive, salidas
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

  /** That till's last closed day's counted cash — surfaced by
   * `getTodayStatus()` only while it isn't open yet, purely as a frontend
   * placeholder for the next "abrir caja" input (see CashRegisterStatusDto). */
  private async findPreviousClosingCash(
    registerNumber: number,
  ): Promise<number | null> {
    const previous = await this.cashRegisterRepository.findOne({
      where: { registerNumber, closedAt: Not(IsNull()) },
      order: { registerDate: 'DESC' },
    });
    return previous?.countedCash ?? null;
  }

  /** Attaches the register's debit/credit notes (informational only) to an
   * already-built response — see CashRegisterResponseDto.notes. */
  private async buildResponse(
    register: CashRegister,
  ): Promise<CashRegisterResponseDto> {
    const dto = CashRegisterResponseDto.fromEntity(register);
    dto.notes = await this.findNotes(register.id);
    return dto;
  }

  /** Debit/credit notes issued in the given register, read straight off
   * their own tables (not folded into totalCash/expectedCash — see the
   * comment on CashRegister.totalCash for why). Shown purely so a manager
   * closing/reviewing the day can see a note happened, since it can move
   * real money without being a sale. */
  private async findNotes(
    cashRegisterId: string,
  ): Promise<CashRegisterNoteResponseDto[]> {
    const [debitNotes, creditNotes] = await Promise.all([
      this.debitNotesRepository.find({
        where: { cashRegister: { id: cashRegisterId } },
        relations: ['invoice'],
      }),
      this.creditNotesRepository.find({
        where: { cashRegister: { id: cashRegisterId } },
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

  /**
   * Every invoice of a register, with how they add up — printed as the
   * second page of the cash-register slip. Matches invoices the same way as
   * the closing totals, so its total matches "recaudado".
   */
  async getDayInvoicesReport(
    id: string,
    allowedNumbers: readonly number[],
  ): Promise<DayInvoicesReportDto> {
    const register = await this.findAllowed(id, allowedNumbers);

    const invoices = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select([
        'invoice.id',
        'invoice.number',
        'invoice.prefix',
        'invoice.dataicoNumber',
        'invoice.totalAmount',
        'invoice.requestPayload',
      ])
      .where('invoice.cash_register_id = :cashRegisterId', {
        cashRegisterId: register.id,
      })
      .orderBy('invoice.createdAt', 'ASC')
      // Invoices created in the same instant would otherwise list in any order.
      .addOrderBy('invoice.number', 'ASC')
      .getMany();

    return buildDayInvoicesReport(register.registerDate, invoices);
  }

  private findToday(registerNumber: number): Promise<CashRegister | null> {
    return this.cashRegisterRepository.findOne({
      where: { registerDate: getStoreToday(), registerNumber },
    });
  }

  /** A register by id, for the by-id actions of the history page — refused
   * when it belongs to a till the caller doesn't work at. */
  private async findAllowed(
    id: string,
    allowedNumbers: readonly number[],
  ): Promise<CashRegister> {
    const register = await this.cashRegisterRepository.findOne({
      where: { id },
    });
    if (!register) {
      throw new NotFoundException('Cash register not found');
    }
    if (!allowedNumbers.includes(register.registerNumber)) {
      throw new ForbiddenException(
        `No tienes permiso para la Caja ${register.registerNumber}.`,
      );
    }
    return register;
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
