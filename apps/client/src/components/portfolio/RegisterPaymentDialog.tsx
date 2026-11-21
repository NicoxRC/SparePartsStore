import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { CurrencyField } from '../CurrencyField';
import { SelectField } from '../SelectField';
import { useCreateQuotationPayment } from '../../hooks/usePortfolio';
import { getApiErrorMessage } from '../../lib/errors';
import { money, PAYMENT_MEANS_LABEL, quotationNumberLabel } from '../../lib/portfolio';
import {
  quotationPaymentSchema,
  type QuotationPaymentValues,
} from '../../lib/schemas/quotationPayment';
import type { CreatePaymentResult, PortfolioQuotation } from '../../services/portfolio';

interface RegisterPaymentDialogProps {
  quotation: PortfolioQuotation;
  onClose: () => void;
  onRegistered: (result: CreatePaymentResult) => void;
}

export function RegisterPaymentDialog({
  quotation,
  onClose,
  onRegistered,
}: RegisterPaymentDialogProps) {
  const createPayment = useCreateQuotationPayment();
  const schema = useMemo(() => quotationPaymentSchema(quotation.balance), [quotation.balance]);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<QuotationPaymentValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, paymentMeans: 'CASH', notes: '' },
  });
  const amount = useWatch({ control, name: 'amount' });
  const paysOff = amount > 0 && Math.round(amount * 100) === Math.round(quotation.balance * 100);

  const onSubmit = async (values: QuotationPaymentValues) => {
    const result = await createPayment.mutateAsync({
      quotationId: quotation.id,
      input: {
        amount: values.amount,
        paymentMeans: values.paymentMeans,
        notes: values.notes || undefined,
      },
    });
    onRegistered(result);
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="w-full max-w-sm bg-paper p-5 shadow-lg"
        aria-labelledby="register-payment-title"
      >
        <h2 id="register-payment-title" className="text-lg font-semibold text-ink">
          Abono a <span className="font-mono">{quotationNumberLabel(quotation.number)}</span>
        </h2>
        <p className="mt-1 text-sm text-steel">
          Saldo pendiente <span className="font-mono text-ink">{money(quotation.balance)}</span>.
          El abono queda en la cartera y no se suma a la caja.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <CurrencyField
                  label="Valor del abono"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.amount?.message}
                />
              )}
            />
            <button
              type="button"
              onClick={() => setValue('amount', quotation.balance, { shouldValidate: true })}
              className="self-start text-sm font-medium text-steel underline underline-offset-4 hover:text-ink"
            >
              Pagar el saldo completo
            </button>
          </div>

          <SelectField label="Medio de pago" {...register('paymentMeans')}>
            {Object.entries(PAYMENT_MEANS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment-notes" className="text-sm font-medium text-steel">
              Nota <span className="font-normal text-fog">(opcional)</span>
            </label>
            <textarea
              id="payment-notes"
              rows={2}
              maxLength={500}
              placeholder="Ej: el resto lo paga el viernes"
              {...register('notes')}
              className="w-full resize-none border border-line-2 bg-paper px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
            {errors.notes && <p className="text-sm text-rust">{errors.notes.message}</p>}
          </div>
        </div>

        {paysOff && (
          <p className="mt-3 border border-ok-line bg-ok-tint px-3 py-2 text-sm text-ok">
            Con este abono la cotización queda pagada y se completa (sin factura).
          </p>
        )}

        {createPayment.isError && (
          <div className="mt-3">
            <Alert variant="error">{getApiErrorMessage(createPayment.error)}</Alert>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" isLoading={createPayment.isPending} className="flex-1">
            Registrar abono
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
