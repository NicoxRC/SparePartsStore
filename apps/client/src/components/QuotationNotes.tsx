import { useState, type FormEvent } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { useAddQuotationNote, useRemoveQuotationNote } from '../hooks/useQuotations';
import { getApiErrorMessage } from '../lib/errors';
import { storeDateTimeLabel } from '../lib/portfolio';
import type { QuotationNote } from '../services/quotations';

const NOTE_MAX_LENGTH = 1000;

interface QuotationNotesListProps {
  notes: QuotationNote[];
  /** Admin only. */
  onRemove?: (note: QuotationNote) => void;
  removingId?: string | null;
}

/** The notes history, newest first — read-only unless `onRemove` is given. */
export function QuotationNotesList({ notes, onRemove, removingId }: QuotationNotesListProps) {
  return (
    <ol className="divide-y divide-line border border-line">
      {notes.map((note) => (
        <li key={note.id} className="flex items-start justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="whitespace-pre-line break-words text-sm text-ink">{note.text}</p>
            <p className="mt-0.5 text-xs text-fog">
              {note.createdByName ?? 'Sin usuario'} · {storeDateTimeLabel(note.createdAt)}
            </p>
          </div>
          {onRemove && (
            <button
              type="button"
              disabled={removingId === note.id}
              onClick={() => onRemove(note)}
              className="min-h-10 shrink-0 px-2 text-xs font-medium text-rust underline underline-offset-4 hover:text-rust-2 disabled:opacity-50"
            >
              Borrar
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

interface QuotationNotesSectionProps {
  quotationId: string;
  notes: QuotationNote[];
  /** False on a merged quotation — its notes moved to the survivor. */
  canWrite: boolean;
  canRemove: boolean;
}

/** "Notas" on the quotation detail: write one, see the whole history. */
export function QuotationNotesSection({
  quotationId,
  notes,
  canWrite,
  canRemove,
}: QuotationNotesSectionProps) {
  const [text, setText] = useState('');
  const addNote = useAddQuotationNote();
  const removeNote = useRemoveQuotationNote();
  const trimmed = text.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || addNote.isPending) return;
    await addNote.mutateAsync({ id: quotationId, text: trimmed });
    setText('');
  };

  const handleRemove = (note: QuotationNote) => {
    if (!window.confirm('¿Borrar esta nota? No se puede deshacer.')) return;
    removeNote.mutate({ noteId: note.id, quotationId });
  };

  return (
    <section className="flex flex-col gap-3 rounded border border-line bg-paper p-4 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">Notas</h2>

      {canWrite && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-2"
        >
          <label htmlFor="quotation-note" className="sr-only">
            Nueva nota
          </label>
          <textarea
            id="quotation-note"
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Ej: se hizo un abono de $50.000 en efectivo"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-y border border-line-2 bg-paper px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
          />
          <Button
            type="submit"
            variant="secondary"
            className="sm:w-auto sm:self-end sm:px-6"
            disabled={!trimmed}
            isLoading={addNote.isPending}
          >
            Guardar nota
          </Button>
        </form>
      )}

      {addNote.isError && <Alert variant="error">{getApiErrorMessage(addNote.error)}</Alert>}
      {removeNote.isError && <Alert variant="error">{getApiErrorMessage(removeNote.error)}</Alert>}

      {notes.length === 0 ? (
        <p className="text-sm text-fog">Sin notas todavía.</p>
      ) : (
        <QuotationNotesList
          notes={notes}
          onRemove={canRemove ? handleRemove : undefined}
          removingId={removeNote.isPending ? removeNote.variables?.noteId : null}
        />
      )}
    </section>
  );
}
