import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { andWhereEveryWord } from '../common/utils/search.util';
import { getStoreDayRangeUtc } from '../common/utils/store-date.util';
import { QuotationPayment } from '../quotations/entities/quotation-payment.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { withQuotationLock } from '../quotations/quotation-lock.util';
import {
  formatCop,
  isOpenQuotation,
  openQuotationCondition,
  sumPaidByQuotation,
  toCents,
} from '../quotations/quotation-payments.util';
import { User } from '../users/entities/user.entity';
import { CreateQuotationPaymentDto } from './dto/create-quotation-payment.dto';
import { PortfolioDateRangeDto } from './dto/portfolio-date-range.dto';
import {
  CreateQuotationPaymentResultDto,
  CustomerPortfolioResponseDto,
  PortfolioCustomerDto,
  PortfolioCustomerSummaryDto,
  PortfolioQuotationDto,
  PortfolioSummaryResponseDto,
  PortfolioTotalsDto,
  QuotationPaymentResponseDto,
  VoidQuotationPaymentResultDto,
} from './dto/portfolio-response.dto';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';

/**
 * "Cartera" — what customers still owe on their open quotations, net of
 * the abonos they've paid, plus registering and voiding those abonos. See
 * docs/GLOSSARY.md ("Cartera"). Local only: no Dataico, no stock, and —
 * decided with the store — no cash-register effect.
 *
 * Reads the quotation tables directly (not through QuotationsService), the
 * same way CustomersModule builds a customer's history; abono writes take
 * the very same per-quotation advisory lock QuotationsService uses, so an
 * abono can't race an invoice, a cancel, a merge or an items edit.
 */
@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    @InjectRepository(QuotationPayment)
    private readonly paymentsRepository: Repository<QuotationPayment>,
  ) {}

  /** Cartera general: one row per customer with an open quotation in range. */
  async getSummary(
    query: QueryPortfolioDto,
  ): Promise<PortfolioSummaryResponseDto> {
    const qb = this.openQuotationsQuery(query);

    if (query.customerType === 'empresa') {
      qb.andWhere("quotation.customerIdentificationType = 'NIT'");
    } else if (query.customerType === 'empleado') {
      qb.andWhere("quotation.customerIdentificationType <> 'NIT'");
    }

    // Unlike the quotations list, digits here are an identification: the
    // cartera is looked up by customer, never by document number.
    const digits = /^\d+$/.exec(query.search?.trim() ?? '');
    if (digits) {
      qb.andWhere('quotation.customerIdentification LIKE :idPrefix', {
        idPrefix: `${digits[0]}%`,
      });
    } else {
      andWhereEveryWord(
        qb,
        [
          'quotation.customerCompanyName',
          'quotation.customerFirstName',
          'quotation.customerFamilyName',
        ],
        query.search,
      );
    }

    const quotations = await qb.getMany();
    const paid = await sumPaidByQuotation(
      this.paymentsRepository,
      quotations.map((q) => q.id),
    );

    // Newest first, so the first quotation seen per customer names them.
    const byCustomer = new Map<string, Quotation[]>();
    for (const quotation of quotations) {
      const key = quotation.customerIdentification;
      byCustomer.set(key, [...(byCustomer.get(key) ?? []), quotation]);
    }

    const customers: PortfolioCustomerSummaryDto[] = [
      ...byCustomer.values(),
    ].map((own) => ({
      ...this.customerOf(own[0]),
      totals: this.totalsOf(own, paid),
      oldestCreatedAt: own[own.length - 1].createdAt.toISOString(),
      lastChangedAt: new Date(
        Math.max(...own.map((q) => q.updatedAt.getTime())),
      ).toISOString(),
    }));
    customers.sort((a, b) => b.totals.balance - a.totals.balance);

    return { totals: this.totalsOf(quotations, paid), customers };
  }

  /** Cartera individual: one customer's open quotations, abono by abono. */
  async getCustomer(
    identification: string,
    range: PortfolioDateRangeDto,
  ): Promise<CustomerPortfolioResponseDto> {
    const quotations = await this.openQuotationsQuery(range)
      .andWhere('quotation.customerIdentification = :identification', {
        identification,
      })
      .getMany();

    // Nothing pending in range still shows who the customer is, as long as
    // they ever had a quotation.
    const latest =
      quotations[0] ??
      (await this.quotationsRepository.findOne({
        where: { customerIdentification: identification },
        order: { createdAt: 'DESC' },
      }));
    if (!latest) {
      throw new NotFoundException('Este cliente no tiene cotizaciones.');
    }

    const payments = quotations.length
      ? await this.paymentsRepository.find({
          where: { quotation: { id: In(quotations.map((q) => q.id)) } },
          relations: { quotation: true, createdBy: true, voidedBy: true },
          order: { createdAt: 'ASC' },
        })
      : [];
    const paymentsByQuotation = new Map<string, QuotationPayment[]>();
    const paid = new Map<string, number>();
    for (const payment of payments) {
      const id = payment.quotation.id;
      paymentsByQuotation.set(id, [
        ...(paymentsByQuotation.get(id) ?? []),
        payment,
      ]);
      if (!payment.voidedAt) {
        paid.set(id, (paid.get(id) ?? 0) + payment.amount);
      }
    }

    const oldestFirst = [...quotations].sort((a, b) => a.number - b.number);
    return {
      customer: this.customerOf(latest),
      totals: this.totalsOf(quotations, paid),
      quotations: oldestFirst.map((quotation): PortfolioQuotationDto => {
        const paidAmount = paid.get(quotation.id) ?? 0;
        return {
          id: quotation.id,
          number: quotation.number,
          createdAt: quotation.createdAt.toISOString(),
          lastChangedAt: quotation.updatedAt.toISOString(),
          totalAmount: quotation.totalAmount,
          paidAmount,
          balance: this.subtract(quotation.totalAmount, paidAmount),
          payments: (paymentsByQuotation.get(quotation.id) ?? []).map(
            (payment) => this.paymentDto(payment),
          ),
        };
      }),
    };
  }

  /**
   * Registers an abono. It can't exceed what is still owed; paying exactly
   * that closes the quotation as completed (decided with the store), the
   * same outcome as "Completar" — no invoice, no cash-register effect.
   */
  createPayment(
    quotationId: string,
    dto: CreateQuotationPaymentDto,
    userId: string,
  ): Promise<CreateQuotationPaymentResultDto> {
    return withQuotationLock(
      this.quotationsRepository.manager,
      [quotationId],
      async (manager) => {
        const quotation = await manager.findOne(Quotation, {
          where: { id: quotationId },
        });
        if (!quotation) {
          throw new NotFoundException('Cotización no encontrada.');
        }
        if (!isOpenQuotation(quotation)) {
          throw new BadRequestException(
            'Esta cotización ya no está pendiente (fue facturada, completada, anulada o unida).',
          );
        }

        const paid =
          (
            await sumPaidByQuotation(manager.getRepository(QuotationPayment), [
              quotation.id,
            ])
          ).get(quotation.id) ?? 0;
        const balanceCents = toCents(quotation.totalAmount) - toCents(paid);
        const amountCents = toCents(dto.amount);
        if (amountCents > balanceCents) {
          throw new BadRequestException(
            `El abono (${formatCop(dto.amount)}) supera el saldo pendiente (${formatCop(balanceCents / 100)}).`,
          );
        }

        const payment = await manager.save(
          QuotationPayment,
          manager.create(QuotationPayment, {
            quotation: { id: quotation.id } as Quotation,
            amount: dto.amount,
            paymentMeans: dto.paymentMeans,
            notes: dto.notes ?? null,
            voidedAt: null,
            voidedBy: null,
            createdBy: { id: userId } as User,
          }),
        );

        const quotationCompleted = amountCents === balanceCents;
        if (quotationCompleted) {
          await manager.update(Quotation, quotation.id, {
            completedAt: new Date(),
            updatedBy: { id: userId },
          });
        }

        return {
          paymentId: payment.id,
          quotationId: quotation.id,
          balance: (balanceCents - amountCents) / 100,
          quotationCompleted,
        };
      },
    );
  }

  /**
   * Voids a wrong abono (admin only — enforced by the controller). It stays
   * in the history, marked. Allowed while the quotation is open, or when
   * it was completed by its own abonos — then it opens again with the
   * balance back. Not once it was invoiced, cancelled or merged, nor
   * completed by hand with a balance still left: those closings didn't
   * depend on the abonos.
   */
  async voidPayment(
    paymentId: string,
    userId: string,
  ): Promise<VoidQuotationPaymentResultDto> {
    const found = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: { quotation: true },
    });
    if (!found) {
      throw new NotFoundException('Abono no encontrado.');
    }

    return withQuotationLock(
      this.quotationsRepository.manager,
      [found.quotation.id],
      async (manager) => {
        const payment = await manager.findOne(QuotationPayment, {
          where: { id: paymentId },
          relations: { quotation: true },
        });
        if (!payment) {
          throw new NotFoundException('Abono no encontrado.');
        }
        // A merge moved it to another quotation between the read above and
        // the lock — that quotation isn't the one locked.
        if (payment.quotation.id !== found.quotation.id) {
          throw new ConflictException(
            'La cotización de este abono cambió. Vuelve a intentarlo.',
          );
        }
        if (payment.voidedAt) {
          throw new BadRequestException('Este abono ya fue anulado.');
        }

        const quotation = payment.quotation;
        if (
          quotation.invoicedAt ||
          quotation.cancelledAt ||
          quotation.mergedAt
        ) {
          throw new BadRequestException(
            'La cotización ya fue facturada, anulada o unida: este abono ya no se puede anular.',
          );
        }

        let quotationReopened = false;
        if (quotation.completedAt) {
          const paid =
            (
              await sumPaidByQuotation(
                manager.getRepository(QuotationPayment),
                [quotation.id],
              )
            ).get(quotation.id) ?? 0;
          if (toCents(paid) < toCents(quotation.totalAmount)) {
            throw new BadRequestException(
              'La cotización fue completada a mano: este abono ya no se puede anular.',
            );
          }
          quotationReopened = true;
        }

        await manager.update(QuotationPayment, payment.id, {
          voidedAt: new Date(),
          voidedBy: { id: userId },
        });
        if (quotationReopened) {
          // updated_at written back unchanged: reopening isn't a change to
          // the items, so the "último cambio" counter must not restart.
          await manager.update(Quotation, quotation.id, {
            completedAt: null,
            updatedBy: { id: userId },
            updatedAt: quotation.updatedAt,
          });
        }

        return { quotationId: quotation.id, quotationReopened };
      },
    );
  }

  private openQuotationsQuery(
    range: PortfolioDateRangeDto,
  ): SelectQueryBuilder<Quotation> {
    if (range.from && range.to && range.from > range.to) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la final.',
      );
    }
    const qb = this.quotationsRepository
      .createQueryBuilder('quotation')
      .where(openQuotationCondition('quotation'))
      .orderBy('quotation.createdAt', 'DESC');
    // created_at is a TIMESTAMPTZ: widen each bound to its whole Bogotá day.
    if (range.from) {
      qb.andWhere('quotation.createdAt >= :from', {
        from: getStoreDayRangeUtc(range.from).start,
      });
    }
    if (range.to) {
      qb.andWhere('quotation.createdAt < :to', {
        to: getStoreDayRangeUtc(range.to).end,
      });
    }
    return qb;
  }

  private totalsOf(
    quotations: Quotation[],
    paid: Map<string, number>,
  ): PortfolioTotalsDto {
    let totalCents = 0;
    let paidCents = 0;
    for (const quotation of quotations) {
      totalCents += toCents(quotation.totalAmount);
      paidCents += toCents(paid.get(quotation.id) ?? 0);
    }
    return {
      totalAmount: totalCents / 100,
      paidAmount: paidCents / 100,
      balance: (totalCents - paidCents) / 100,
      quotationCount: quotations.length,
    };
  }

  private subtract(a: number, b: number): number {
    return (toCents(a) - toCents(b)) / 100;
  }

  private customerOf(quotation: Quotation): PortfolioCustomerDto {
    const personName = [
      quotation.customerFirstName,
      quotation.customerFamilyName,
    ]
      .filter(Boolean)
      .join(' ');
    return {
      identificationType: quotation.customerIdentificationType,
      identification: quotation.customerIdentification,
      name: quotation.customerCompanyName || personName,
      phone: quotation.customerPhone,
    };
  }

  private paymentDto(payment: QuotationPayment): QuotationPaymentResponseDto {
    const nameOf = (user: User | null) =>
      user ? `${user.firstName} ${user.lastName}`.trim() : null;
    return {
      id: payment.id,
      amount: payment.amount,
      paymentMeans: payment.paymentMeans,
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString(),
      createdByName: nameOf(payment.createdBy),
      voidedAt: payment.voidedAt?.toISOString() ?? null,
      voidedByName: nameOf(payment.voidedBy),
    };
  }
}
