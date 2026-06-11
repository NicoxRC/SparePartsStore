import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CreateLookupDialog } from './CreateLookupDialog';
import { useLookupItem, useLookupList } from '../hooks/useLookups';
import type { LookupResource, LookupResponse } from '../services/lookups';

interface SearchableSelectProps {
  label: string;
  resource: LookupResource;
  value: string;
  onChange: (value: string) => void;
  /** Text shown when nothing is selected. */
  placeholder?: string;
  /** When set, shows an extra option at the top of the list to clear the selection (e.g. "Todos"). */
  clearLabel?: string;
  /** When true, shows a "+ Crear..." option that opens an inline form to create a new entry. */
  allowCreate?: boolean;
  error?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}

const PAGE_SIZE = 50;

export function SearchableSelect({
  label,
  resource,
  value,
  onChange,
  placeholder = 'Selecciona...',
  clearLabel,
  allowCreate,
  error,
  id,
  name,
  disabled,
}: SearchableSelectProps) {
  const fieldId = id ?? name ?? resource;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const listQuery = useLookupList(resource, {
    limit: PAGE_SIZE,
    ...(debouncedQuery ? { search: debouncedQuery } : {}),
  });
  const selectedQuery = useLookupItem(resource, value || undefined);

  const options = listQuery.data?.data ?? [];
  const selectedLabel = selectedQuery.data?.name ?? '';

  const optionCount = options.length + (clearLabel ? 1 : 0) + (allowCreate ? 1 : 0);
  const safeHighlightedIndex = Math.min(highlightedIndex, Math.max(optionCount - 1, 0));

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setQuery('');
  };

  const openCreateDialog = () => {
    setCreateInitialName(query.trim());
    setIsCreateOpen(true);
    setIsOpen(false);
  };

  const handleCreated = (item: LookupResponse) => {
    onChange(item.id);
    setIsCreateOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => Math.min(prev + 1, optionCount - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (clearLabel && safeHighlightedIndex === 0) {
        handleSelect('');
        return;
      }
      if (allowCreate && safeHighlightedIndex === optionCount - 1) {
        openCreateDialog();
        return;
      }
      const option = options[safeHighlightedIndex - (clearLabel ? 1 : 0)];
      if (option) handleSelect(option.id);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor={fieldId} className="text-sm font-medium text-[#3F4654]">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${fieldId}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={isOpen ? query : selectedLabel}
          placeholder={isOpen ? 'Escribe para buscar...' : placeholder}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={`min-h-12 w-full rounded-lg border bg-white px-4 py-3 pr-9 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/30 focus:border-[#1E2A4A] disabled:bg-[#F7F6F4] disabled:text-[#8B92A3] sm:min-h-11 sm:py-2.5 sm:text-sm ${
            error ? 'border-[#C2483A]' : 'border-[#D8DCE6]'
          }`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B92A3]">
          ▾
        </span>

        {isOpen && (
          <ul
            id={`${fieldId}-listbox`}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#D8DCE6] bg-white py-1 shadow-lg"
          >
            {clearLabel && (
              <li
                role="option"
                aria-selected={value === ''}
                onClick={() => handleSelect('')}
                className={`cursor-pointer px-4 py-2.5 text-sm ${
                  safeHighlightedIndex === 0 ? 'bg-[#F2F4F8]' : ''
                } ${value === '' ? 'font-semibold text-[#1E2A4A]' : 'text-gray-900'}`}
              >
                {clearLabel}
              </li>
            )}

            {listQuery.isLoading && (
              <li className="px-4 py-2.5 text-sm text-[#8B92A3]">Buscando…</li>
            )}

            {!listQuery.isLoading && options.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-[#8B92A3]">Sin resultados</li>
            )}

            {options.map((option, index) => {
              const optionIndex = index + (clearLabel ? 1 : 0);
              return (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={value === option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`cursor-pointer px-4 py-2.5 text-sm ${
                    safeHighlightedIndex === optionIndex ? 'bg-[#F2F4F8]' : ''
                  } ${value === option.id ? 'font-semibold text-[#1E2A4A]' : 'text-gray-900'}`}
                >
                  {option.name}
                </li>
              );
            })}

            {allowCreate && (
              <li
                role="option"
                aria-selected={false}
                onClick={openCreateDialog}
                className={`cursor-pointer border-t border-[#E4E8EF] px-4 py-2.5 text-sm font-medium text-[#1E2A4A] ${
                  safeHighlightedIndex === optionCount - 1 ? 'bg-[#F2F4F8]' : ''
                }`}
              >
                + Crear {label.toLowerCase()}
                {query.trim() ? `: "${query.trim()}"` : ''}
              </li>
            )}
          </ul>
        )}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-[#C2483A]">
          {error}
        </p>
      )}

      {isCreateOpen && (
        <CreateLookupDialog
          resource={resource}
          label={label.toLowerCase()}
          initialName={createInitialName}
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
