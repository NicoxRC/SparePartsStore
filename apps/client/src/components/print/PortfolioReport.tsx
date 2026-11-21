import type { ReactNode } from 'react';
import { BUSINESS_PROFILE } from '../../config/business';
import {
  PAYMENT_MEANS_LABEL,
  quotationNumberLabel,
  rangeLabel,
  storeDateLabel,
} from '../../lib/portfolio';
import { daysSince } from '../../lib/quotationDays';
import { ticketDateTime } from '../../lib/ticketFormat';
import type {
  CustomerPortfolio,
  PortfolioSummary,
  PortfolioTotals,
} from '../../services/portfolio';

/** "$150.000" — reports are for people, so whole pesos with Colombian separators. */
function cop(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

const cell = 'border-b border-black/30 px-1.5 py-1 align-top';
const num = `${cell} text-right tabular-nums whitespace-nowrap`;
const head = 'border-b-2 border-black px-1.5 py-1 text-left text-[10px] font-bold uppercase';
const headNum = `${head} text-right`;

interface ReportFrameProps {
  title: string;
  range: { from?: string; to?: string };
  children: ReactNode;
}

function ReportFrame({ title, range, children }: ReportFrameProps) {
  const header = BUSINESS_PROFILE.quotationHeader;
  return (
    <div className="mx-auto w-full max-w-[190mm] text-[11px] leading-snug">
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-2">
        <div>
          <p className="text-base font-bold">{header.title}</p>
          <p>{header.taxId}</p>
          <p>
            {header.address} · Tel. {BUSINESS_PROFILE.phone}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold uppercase">{title}</p>
          <p>{rangeLabel(range.from, range.to)}</p>
          <p>Impreso {ticketDateTime(new Date().toISOString())}</p>
        </div>
      </header>
      {children}
      <p className="mt-4 text-[10px]">
        Solo cotizaciones pendientes (sin facturar, completar ni anular). Los abonos anulados no
        se descuentan.
      </p>
    </div>
  );
}

function TotalsBlock({ totals }: { totals: PortfolioTotals }) {
  return (
    <table className="mt-3 ml-auto w-72 border-collapse">
      <tbody>
        <tr>
          <td className="px-1.5 py-0.5">Total cotizaciones ({totals.quotationCount})</td>
          <td className="px-1.5 py-0.5 text-right tabular-nums">{cop(totals.totalAmount)}</td>
        </tr>
        <tr>
          <td className="px-1.5 py-0.5">Abonado</td>
          <td className="px-1.5 py-0.5 text-right tabular-nums">{cop(totals.paidAmount)}</td>
        </tr>
        <tr className="font-bold">
          <td className="border-t border-black px-1.5 py-1">PENDIENTE POR COBRAR</td>
          <td className="border-t border-black border-b-[3px] border-b-black px-1.5 py-1 text-right tabular-nums [border-bottom-style:double]">
            {cop(totals.balance)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

interface PortfolioSummaryReportProps {
  summary: PortfolioSummary;
  range: { from?: string; to?: string };
}

/** Cartera general, one line per customer. */
export function PortfolioSummaryReport({ summary, range }: PortfolioSummaryReportProps) {
  return (
    <ReportFrame title="Cartera general" range={range}>
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            <th className={head}>Cliente</th>
            <th className={head}>Identificación</th>
            <th className={headNum}>Cot.</th>
            <th className={headNum}>Más antigua</th>
            <th className={headNum}>Total</th>
            <th className={headNum}>Abonado</th>
            <th className={headNum}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {summary.customers.map((customer) => (
            <tr key={customer.identification} className="break-inside-avoid">
              <td className={cell}>{customer.name}</td>
              <td className={`${cell} whitespace-nowrap`}>
                {customer.identificationType} {customer.identification}
              </td>
              <td className={num}>{customer.totals.quotationCount}</td>
              <td className={num}>{daysSince(customer.oldestCreatedAt)} días</td>
              <td className={num}>{cop(customer.totals.totalAmount)}</td>
              <td className={num}>{cop(customer.totals.paidAmount)}</td>
              <td className={`${num} font-bold`}>{cop(customer.totals.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TotalsBlock totals={summary.totals} />
    </ReportFrame>
  );
}

interface CustomerPortfolioReportProps {
  portfolio: CustomerPortfolio;
  range: { from?: string; to?: string };
}

/** Cartera individual — the customer's statement, quotation by quotation, abono by abono. */
export function CustomerPortfolioReport({ portfolio, range }: CustomerPortfolioReportProps) {
  const { customer } = portfolio;
  return (
    <ReportFrame title="Estado de cuenta" range={range}>
      <section className="mt-2 border-b border-black/30 pb-2">
        <p>
          <span className="font-bold">Cliente:</span> {customer.name}
        </p>
        <p>
          <span className="font-bold">Cédula/NIT:</span> {customer.identificationType}{' '}
          {customer.identification}
          {customer.phone && (
            <>
              {' · '}
              <span className="font-bold">Teléfono:</span> {customer.phone}
            </>
          )}
        </p>
      </section>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            <th className={head}>Cotización</th>
            <th className={head}>Fecha</th>
            <th className={headNum}>Días</th>
            <th className={head}>Abonos</th>
            <th className={headNum}>Total</th>
            <th className={headNum}>Abonado</th>
            <th className={headNum}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.quotations.map((quotation) => {
            const activePayments = quotation.payments.filter((p) => !p.voidedAt);
            return (
              <tr key={quotation.id} className="break-inside-avoid">
                <td className={`${cell} whitespace-nowrap font-bold`}>
                  {quotationNumberLabel(quotation.number)}
                </td>
                <td className={`${cell} whitespace-nowrap`}>
                  {storeDateLabel(quotation.createdAt)}
                </td>
                <td className={num}>{daysSince(quotation.createdAt)}</td>
                <td className={cell}>
                  {activePayments.length === 0
                    ? '—'
                    : activePayments.map((payment) => (
                        <div key={payment.id} className="whitespace-nowrap">
                          {storeDateLabel(payment.createdAt)} ·{' '}
                          {PAYMENT_MEANS_LABEL[payment.paymentMeans]} · {cop(payment.amount)}
                        </div>
                      ))}
                </td>
                <td className={num}>{cop(quotation.totalAmount)}</td>
                <td className={num}>{cop(quotation.paidAmount)}</td>
                <td className={`${num} font-bold`}>{cop(quotation.balance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <TotalsBlock totals={portfolio.totals} />
    </ReportFrame>
  );
}
