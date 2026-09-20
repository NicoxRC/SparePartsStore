import type { ConfirmPurchaseImportResponse } from '../../services/purchaseImports';

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** What a confirmed import did — shared by the confirm dialog and the page banner. */
export function ConfirmResult({ result }: { result: ConfirmPurchaseImportResponse }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Se {result.createdProducts === 1 ? 'creó' : 'crearon'}{' '}
        {plural(result.createdProducts, 'producto', 'productos')} y se sumó stock a{' '}
        {plural(result.restockedProducts, 'producto', 'productos')} (
        {plural(result.unitsAdded, 'unidad', 'unidades')}).
      </p>
      {result.relinked.length > 0 && (
        <div>
          <p className="font-medium">
            {plural(result.relinked.length, 'línea', 'líneas')} ya existían en el catálogo:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {result.relinked.map((line) => (
              <li key={line.lineNumber}>
                Línea {line.lineNumber} — <span className="font-mono">{line.reference}</span>: se
                sumó stock al producto existente y se descartó el precio escrito.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
