import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { CurrencyField } from '../CurrencyField';
import { SearchableSelect } from '../SearchableSelect';
import { SelectField } from '../SelectField';
import {
  newProductPriceSchema,
  type NewProductPriceValues,
} from '../../lib/schemas/purchaseImport';
import type { SaleType } from '../../services/products';
import type {
  PurchaseImportItem,
  UpdatePurchaseImportItemInput,
} from '../../services/purchaseImports';

interface NewProductFieldsProps {
  item: PurchaseImportItem;
  onPatch: (input: UpdatePurchaseImportItemInput) => void;
}

/** The data a "Nuevo" line needs so confirming can create its product. Each change saves right away. */
export function NewProductFields({ item, onPatch }: NewProductFieldsProps) {
  const { newProduct } = item;

  const {
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<NewProductPriceValues>({
    resolver: zodResolver(newProductPriceSchema),
    defaultValues: { salePrice: newProduct.salePrice ?? 0 },
  });

  const commitPrice = async () => {
    const salePrice = getValues('salePrice');
    if (salePrice === (newProduct.salePrice ?? 0)) return;
    if (salePrice === 0) {
      onPatch({ salePrice: null });
      return;
    }
    if (!(await trigger('salePrice'))) return;
    onPatch({ salePrice });
  };

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-line bg-canvas p-3">
      <SearchableSelect
        label="Departamento"
        resource="departments"
        id={`line-department-${item.id}`}
        value={newProduct.departmentId ?? ''}
        onChange={(value) => onPatch({ departmentId: value || null })}
        allowCreate
      />
      <SearchableSelect
        label="Grupo"
        resource="groups"
        id={`line-group-${item.id}`}
        value={newProduct.groupId ?? ''}
        onChange={(value) => onPatch({ groupId: value || null })}
        allowCreate
      />
      <SearchableSelect
        label="Marca"
        resource="brands"
        id={`line-brand-${item.id}`}
        value={newProduct.brandId ?? ''}
        onChange={(value) => onPatch({ brandId: value || null })}
        allowCreate
      />

      <Controller
        name="salePrice"
        control={control}
        render={({ field }) => (
          <CurrencyField
            label="Precio de venta"
            id={`line-price-${item.id}`}
            placeholder="0"
            error={errors.salePrice?.message}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={() => {
              field.onBlur();
              void commitPrice();
            }}
          />
        )}
      />

      <SelectField
        label="Tipo de venta"
        id={`line-sale-type-${item.id}`}
        value={newProduct.saleType}
        onChange={(e) => onPatch({ saleType: e.target.value as SaleType })}
      >
        <option value="normal">Normal</option>
        <option value="neto">Neto</option>
      </SelectField>

      <label className="flex min-h-11 items-center gap-2 text-sm text-steel">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={newProduct.taxExempt}
          onChange={(e) => onPatch({ taxExempt: e.target.checked })}
        />
        Exento de IVA
      </label>
    </div>
  );
}
