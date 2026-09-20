import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { TextField } from '../TextField';
import { formatQuantity } from '../../lib/purchaseImports';
import {
  purchaseImportLineSchema,
  type PurchaseImportLineInput,
  type PurchaseImportLineValues,
} from '../../lib/schemas/purchaseImport';
import type {
  PurchaseImportItem,
  UpdatePurchaseImportItemInput,
} from '../../services/purchaseImports';

interface LineFieldsFormProps {
  item: PurchaseImportItem;
  /** Saves one field; `onSaved` receives the line as the server now has it (it normalizes text). */
  onPatch: (
    input: UpdatePurchaseImportItemInput,
    onSaved?: (fresh: PurchaseImportItem) => void,
  ) => void;
}

/**
 * The three inline-editable fields of a draft line. Each one is validated
 * and sent on its own when it loses focus — never as one big submit — so a
 * reviewer can fix a line field by field without a save button.
 */
export function LineFieldsForm({ item, onPatch }: LineFieldsFormProps) {
  const {
    register,
    trigger,
    getValues,
    resetField,
    formState: { errors },
  } = useForm<PurchaseImportLineInput, unknown, PurchaseImportLineValues>({
    resolver: zodResolver(purchaseImportLineSchema),
    defaultValues: {
      reference: item.reference ?? '',
      description: item.description ?? '',
      quantity: item.quantity === null ? '' : String(item.quantity),
    },
  });

  const commitReference = async () => {
    const value = getValues('reference').trim();
    if (value.toUpperCase() === (item.reference ?? '')) return;
    if (!(await trigger('reference'))) return;
    onPatch({ reference: value }, (fresh) =>
      resetField('reference', { defaultValue: fresh.reference ?? '' }),
    );
  };

  const commitDescription = async () => {
    const value = getValues('description').trim();
    if (value === (item.description ?? '')) return;
    if (!(await trigger('description'))) return;
    onPatch({ description: value }, (fresh) =>
      resetField('description', { defaultValue: fresh.description ?? '' }),
    );
  };

  const commitQuantity = async () => {
    const raw = getValues('quantity').trim();
    if (raw === String(item.quantity ?? '')) return;
    if (!(await trigger('quantity'))) return;
    const quantity = purchaseImportLineSchema.shape.quantity.parse(raw);
    onPatch({ quantity }, (fresh) =>
      resetField('quantity', { defaultValue: fresh.quantity === null ? '' : String(fresh.quantity) }),
    );
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
      <TextField
        label="Referencia"
        id={`line-reference-${item.id}`}
        className="font-mono uppercase"
        error={errors.reference?.message}
        {...register('reference', { onBlur: () => void commitReference() })}
      />
      <div className="flex flex-col gap-1">
        <TextField
          label="Cantidad"
          id={`line-quantity-${item.id}`}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          className="font-mono"
          error={errors.quantity?.message}
          onFocus={(e) => e.target.select()}
          {...register('quantity', { onBlur: () => void commitQuantity() })}
        />
        {item.quantity !== item.xmlQuantity && (
          <p className="font-mono text-xs text-fog">Factura: {formatQuantity(item.xmlQuantity)}</p>
        )}
      </div>
      <div className="col-span-2">
        <TextField
          label="Descripción"
          id={`line-description-${item.id}`}
          error={errors.description?.message}
          {...register('description', { onBlur: () => void commitDescription() })}
        />
      </div>
    </div>
  );
}
