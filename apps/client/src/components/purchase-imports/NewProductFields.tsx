import { SearchableSelect } from '../SearchableSelect';
import { DraftAmountField } from './DraftAmountField';
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

      <div className="grid grid-cols-2 gap-3">
        <DraftAmountField
          field="cost"
          saved={newProduct.cost}
          label="Costo"
          id={`line-cost-${item.id}`}
          onPatch={onPatch}
        />
        <DraftAmountField
          field="salePrice"
          saved={newProduct.salePrice}
          label="Precio de venta"
          id={`line-price-${item.id}`}
          onPatch={onPatch}
        />
      </div>

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
