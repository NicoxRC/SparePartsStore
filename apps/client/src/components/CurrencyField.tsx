const numberFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

interface CurrencyFieldProps {
  label: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  name: string;
  id?: string;
  placeholder?: string;
}

export function CurrencyField({
  label,
  error,
  value,
  onChange,
  onBlur,
  name,
  id,
  placeholder,
}: CurrencyFieldProps) {
  const fieldId = id ?? name;
  const displayValue = value ? numberFormatter.format(value) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    onChange(digitsOnly ? Number(digitsOnly) : 0);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-[#3F4654]">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        id={fieldId}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`min-h-12 w-full rounded-lg border px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/30 focus:border-[#1E2A4A] sm:min-h-11 sm:py-2.5 sm:text-sm ${
          error ? 'border-[#C2483A]' : 'border-[#D8DCE6]'
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-[#C2483A]">
          {error}
        </p>
      )}
    </div>
  );
}
