import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Spinner } from '../components/Spinner';
import { useDashboardSummary } from '../hooks/useDashboard';
import { getApiErrorMessage } from '../lib/errors';

function money(value: number) {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

function KpiCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'amber' | 'indigo' | 'rust' | 'neutral';
  hint?: string;
}) {
  const toneClasses: Record<typeof tone, string> = {
    ok: 'bg-ok-tint text-ok',
    amber: 'bg-amber-tint text-amber',
    indigo: 'bg-indigo-tint text-indigo',
    rust: 'bg-rust-tint text-rust-2',
    neutral: 'bg-paper text-ink',
  };

  return (
    <div
      className={`flex flex-col gap-1 rounded border border-line p-4 ${toneClasses[tone]}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
      <span className="font-mono text-2xl font-bold">{value}</span>
      {hint && <span className="text-xs opacity-80">{hint}</span>}
    </div>
  );
}

function SalesTrendChart({ days }: { days: { date: string; total: number }[] }) {
  const max = Math.max(...days.map((day) => day.total), 1);

  return (
    <div className="rounded border border-line bg-paper p-4 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
        Ventas últimos 7 días
      </h2>
      <div className="mt-4 flex items-end gap-2 sm:gap-4">
        {days.map((day) => {
          const heightPct = Math.max((day.total / max) * 100, day.total > 0 ? 4 : 0);
          const isToday = day.date === days[days.length - 1].date;
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-steel">
                {day.total > 0 ? money(day.total) : ''}
              </span>
              <div className="flex h-32 w-full items-end">
                <div
                  className={`w-full rounded-t-sm ${isToday ? 'bg-signal' : 'bg-ink/80'}`}
                  style={{ height: `${heightPct}%` }}
                  title={`${day.date}: ${money(day.total)}`}
                />
              </div>
              <span className="text-xs text-fog">
                {new Date(`${day.date}T12:00:00`).toLocaleDateString('es-CO', {
                  weekday: 'short',
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const summaryQuery = useDashboardSummary();

  if (summaryQuery.isPending) {
    return <Spinner label="Cargando…" />;
  }

  if (summaryQuery.isError) {
    return <Alert variant="error">{getApiErrorMessage(summaryQuery.error)}</Alert>;
  }

  const summary = summaryQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Panel</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Caja hoy"
          value={summary.cashRegisterOpen ? money(summary.todayRecaudado ?? 0) : '—'}
          tone={summary.cashRegisterOpen ? 'ok' : 'neutral'}
          hint={summary.cashRegisterOpen ? 'Recaudado, abierta' : 'Cerrada'}
        />
        <KpiCard
          label="Cotizaciones pendientes"
          value={money(summary.openQuotationsTotal)}
          tone="amber"
          hint={`${summary.openQuotationsCount} sin cobrar`}
        />
        <KpiCard
          label="Productos"
          value={String(summary.totalProducts)}
          tone="indigo"
        />
        <KpiCard
          label="Productos agotados"
          value={String(summary.outOfStockCount)}
          tone={summary.outOfStockCount > 0 ? 'rust' : 'neutral'}
        />
      </div>

      <SalesTrendChart days={summary.salesLast7Days} />

      <div className="rounded border border-line bg-paper p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
          Productos agotados
        </h2>
        {summary.outOfStockProducts.length === 0 ? (
          <p className="mt-3 text-sm text-steel">Ningún producto está agotado ahora mismo.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {summary.outOfStockProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-mono font-medium text-ink">{product.reference}</span>{' '}
                  <span className="text-steel">{product.description}</span>
                </div>
                <Link
                  to={`/products/${product.id}/edit`}
                  className="shrink-0 text-xs font-medium text-steel hover:text-ink hover:underline"
                >
                  Ver producto
                </Link>
              </li>
            ))}
          </ul>
        )}
        {summary.outOfStockCount > summary.outOfStockProducts.length && (
          <p className="mt-2 text-xs text-fog">
            Mostrando {summary.outOfStockProducts.length} de {summary.outOfStockCount}.
          </p>
        )}
      </div>
    </div>
  );
}
