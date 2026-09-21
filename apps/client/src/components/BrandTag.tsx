/** A product's brand ("marca") under its name in the sale/quotation/note tables. Nothing when it has none. */
export function BrandTag({ brand }: { brand?: string | null }) {
  if (!brand) return null;
  return (
    <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wide text-steel">
      {brand}
    </span>
  );
}
