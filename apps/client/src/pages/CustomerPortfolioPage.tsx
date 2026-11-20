import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { PortfolioQuotationEntry } from '../components/portfolio/PortfolioQuotationEntry';
import { PortfolioRangeFilter } from '../components/portfolio/PortfolioRangeFilter';
import { PortfolioTotalsLedger } from '../components/portfolio/PortfolioTotalsLedger';
import { RegisterPaymentDialog } from '../components/portfolio/RegisterPaymentDialog';
import { VoidPaymentDialog } from '../components/portfolio/VoidPaymentDialog';
import { CustomerPortfolioReport } from '../components/print/PortfolioReport';
import { PrintTicket } from '../components/print/PrintTicket';
import { Spinner } from '../components/Spinner';
import { Toast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useCustomerPortfolio } from '../hooks/usePortfolio';
import { usePortfolioRange } from '../hooks/usePortfolioRange';
import { getApiErrorMessage } from '../lib/errors';
import { money, quotationNumberLabel } from '../lib/portfolio';
import type { PortfolioQuotation, QuotationPayment } from '../services/portfolio';

/** Cartera individual — one customer's open quotations, abono by abono. */
export function CustomerPortfolioPage() {
  const { identification } = useParams<{ identification: string }>();
  const { from, to, setRange, apiRange, queryString } = usePortfolioRange();
  const { user } = useAuth();
  const { has } = usePermissions();
  const portfolioQuery = useCustomerPortfolio(identification, apiRange);
  const portfolio = portfolioQuery.data;

  const [payingQuotation, setPayingQuotation] = useState<PortfolioQuotation | null>(null);
  const [voidingPayment, setVoidingPayment] = useState<QuotationPayment | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={`/cartera${queryString}`}
        className="self-start text-sm font-medium text-steel underline underline-offset-4 hover:text-ink"
      >
        ← Cartera general
      </Link>

      {portfolioQuery.isPending && <Spinner label="Cargando cliente…" />}

      {portfolioQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(portfolioQuery.error)}</Alert>
      )}

      {portfolio && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {portfolio.customer.name}
              </h1>
              <p className="mt-0.5 text-sm text-steel">
                <span className="font-mono">
                  {portfolio.customer.identificationType} {portfolio.customer.identification}
                </span>
                {portfolio.customer.phone && (
                  <>
                    {' · Tel. '}
                    <span className="font-mono">{portfolio.customer.phone}</span>
                  </>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="sm:w-auto sm:px-6"
              disabled={portfolio.quotations.length === 0}
              onClick={() => setIsPrinting(true)}
            >
              Imprimir PDF
            </Button>
          </div>

          <PortfolioRangeFilter from={from} to={to} onChange={setRange} />

          <PortfolioTotalsLedger totals={portfolio.totals} />

          {portfolio.quotations.length === 0 ? (
            <Alert variant="info">
              Este cliente no debe nada{from || to ? ' en estas fechas' : ''}.
            </Alert>
          ) : (
            <ul className="divide-y divide-line border border-line bg-paper">
              {portfolio.quotations.map((quotation) => (
                <PortfolioQuotationEntry
                  key={quotation.id}
                  quotation={quotation}
                  canRegisterPayment={has('portfolio.payments.create')}
                  canVoidPayment={user?.role === 'admin'}
                  canOpenQuotation={has('quotations.view')}
                  onRegisterPayment={setPayingQuotation}
                  onVoidPayment={setVoidingPayment}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {payingQuotation && (
        <RegisterPaymentDialog
          quotation={payingQuotation}
          onClose={() => setPayingQuotation(null)}
          onRegistered={(result) => {
            const label = quotationNumberLabel(payingQuotation.number);
            setPayingQuotation(null);
            setToast(
              result.quotationCompleted
                ? `${label} quedó pagada y se completó.`
                : `Abono registrado. Saldo de ${label}: ${money(result.balance)}.`,
            );
          }}
        />
      )}

      {voidingPayment && (
        <VoidPaymentDialog
          payment={voidingPayment}
          onClose={() => setVoidingPayment(null)}
          onVoided={(result) => {
            setVoidingPayment(null);
            setToast(
              result.quotationReopened
                ? 'Abono anulado. La cotización volvió a quedar abierta.'
                : 'Abono anulado.',
            );
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {isPrinting && portfolio && (
        <PrintTicket format="letter" onClose={() => setIsPrinting(false)}>
          <CustomerPortfolioReport portfolio={portfolio} range={apiRange} />
        </PrintTicket>
      )}
    </div>
  );
}
