import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CurrencyField } from '../CurrencyField';
import {
  draftAmountSchema,
  MIN_COST,
  MIN_SALE_PRICE,
  type DraftAmountValues,
} from '../../lib/schemas/purchaseImport';
import type { UpdatePurchaseImportItemInput } from '../../services/purchaseImports';

type AmountField = 'salePrice' | 'cost';

const RULES: Record<AmountField, { min: number; noun: 'precio' | 'costo' }> = {
  salePrice: { min: MIN_SALE_PRICE, noun: 'precio' },
  cost: { min: MIN_COST, noun: 'costo' },
};

interface DraftAmountFieldProps {
  field: AmountField;
  /** What the line has saved; null = blank. */
  saved: number | null;
  label: string;
  id: string;
  placeholder?: string;
  onPatch: (input: UpdatePurchaseImportItemInput) => void;
}

/** A price or cost typed on a draft line, saved on blur. Clearing it saves blank. */
export function DraftAmountField({
  field,
  saved,
  label,
  id,
  placeholder = '0',
  onPatch,
}: DraftAmountFieldProps) {
  const { min, noun } = RULES[field];
  const schema = useMemo(() => draftAmountSchema(min, noun), [min, noun]);

  const {
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<DraftAmountValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: saved ?? 0 },
  });

  const commit = async () => {
    const amount = getValues('amount');
    if (amount === (saved ?? 0)) return;
    if (amount === 0) {
      onPatch({ [field]: null });
      return;
    }
    if (!(await trigger('amount'))) return;
    onPatch({ [field]: amount });
  };

  return (
    <Controller
      name="amount"
      control={control}
      render={({ field: input }) => (
        <CurrencyField
          label={label}
          id={id}
          placeholder={placeholder}
          error={errors.amount?.message}
          name={`${field}-${id}`}
          value={input.value}
          onChange={input.onChange}
          onBlur={() => {
            input.onBlur();
            void commit();
          }}
        />
      )}
    />
  );
}
