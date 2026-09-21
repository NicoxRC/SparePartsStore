import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { CurrencyField } from './CurrencyField';
import { TextField } from './TextField';
import { handleEnterAsTab } from '../lib/formNavigation';

interface CustomLineDialogProps {
  /** Pre-fills the description with whatever was typed in the product search. */
  initialDescription?: string;
  onClose: () => void;
  onAdd: (line: { description: string; price: number; quantity: number }) => void;
}

/**
 * A one-off line for something that isn't in the catalog: just a description
 * and a price. It goes on this sale/quotation only — nothing is created in the
 * catalog and no stock is involved.
 */
export function CustomLineDialog({
  initialDescription = '',
  onClose,
  onAdd,
}: CustomLineDialogProps) {
  const [description, setDescription] = useState(initialDescription);
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState('1');
  const [submitted, setSubmitted] = useState(false);

  const descriptionError =
    submitted && !description.trim() ? 'La descripción es obligatoria.' : undefined;
  const priceError = submitted && price < 1 ? 'El precio debe ser mayor a 0.' : undefined;
  const quantityNumber = Math.max(1, Math.floor(Number(quantity) || 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The dialog sits inside the sale form in the DOM tree (React portal
    // events still bubble) — don't let this submit the sale too.
    e.stopPropagation();
    setSubmitted(true);
    if (!description.trim() || price < 1) return;
    onAdd({ description: description.trim(), price, quantity: quantityNumber });
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Agregar sin producto</h2>
        <p className="mt-1 text-sm text-fog">
          Solo para esta venta o cotización: no se crea en el catálogo ni mueve stock.
        </p>

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleEnterAsTab}
          className="mt-3 flex flex-col gap-4"
          noValidate
        >
          <TextField
            label="Descripción"
            placeholder="Ej: Instalación de llantas"
            error={descriptionError}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyField
              label="Precio"
              name="customLinePrice"
              placeholder="0"
              error={priceError}
              value={price}
              onChange={setPrice}
            />
            <TextField
              label="Cantidad"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Agregar</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
