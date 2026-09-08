import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { usePayrollEntries, useRefreshPayrollEntryStatus } from '../hooks/usePayroll';
import { getApiErrorMessage } from '../lib/errors';

const PAGE_SIZE = 20;

const DIAN_STATUS_STYLE: Record<string, string> = {
  DIAN_ACEPTADO: 'bg-[#E9F3EC] text-[#2F6B45]',
  DIAN_RECHAZADO: 'bg-[#FBEAE7] text-[#A93C30]',
};

export function PayrollListPage() {
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const entriesQuery = usePayrollEntries({ page, limit: PAGE_SIZE });
  const refreshMutation = useRefreshPayrollEntryStatus();

  const handleRefresh = async (id: string) => {
    setActionError(null);
    setActioningId(id);
    try {
      await refreshMutation.mutateAsync(id);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
          Nómina electrónica
        </h1>
        <Link to="/invoicing/payroll-entries/new">
          <Button className="sm:w-auto sm:px-6">+ Nuevo período</Button>
        </Link>
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {entriesQuery.isPending && <Spinner label="Cargando…" />}

      {entriesQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(entriesQuery.error)}</Alert>
      )}

      {entriesQuery.data && (
        <>
          {entriesQuery.data.data.length === 0 ? (
            <Alert variant="info">
              Todavía no se ha enviado ningún período de nómina.
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E4E8EF] bg-white shadow-sm">
              <table className="min-w-full divide-y divide-[#E4E8EF] text-sm">
                <thead className="bg-[#F7F6F4] text-left text-xs font-medium uppercase tracking-wide text-[#8B92A3]">
                  <tr>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Salario</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Estado DIAN</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E8EF]">
                  {entriesQuery.data.data.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-medium text-[#1E2A4A]">
                        {entry.prefix}
                        {entry.number}
                      </td>
                      <td className="px-4 py-3">
                        {entry.employeeName}
                        <span className="block text-xs text-[#8B92A3]">
                          {entry.employeeIdentification}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        ${entry.salary.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3">
                        {entry.initialSettlementDate} — {entry.finalSettlementDate}
                      </td>
                      <td className="px-4 py-3">
                        {entry.dianStatus ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              DIAN_STATUS_STYLE[entry.dianStatus] ?? 'bg-[#EEF1F7] text-[#1E2A4A]'
                            }`}
                          >
                            {entry.dianStatus}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={actioningId === entry.id}
                          onClick={() => void handleRefresh(entry.id)}
                          className="text-sm font-medium text-[#1E2A4A] hover:underline disabled:opacity-40"
                        >
                          Consultar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination meta={entriesQuery.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
