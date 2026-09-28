import { useRef, type ChangeEvent } from 'react';
import { Button } from '../Button';

interface FilePickerButtonProps {
  label: string;
  accept: string;
  variant?: 'primary' | 'secondary';
  isLoading: boolean;
  onFile: (file: File) => void;
}

export function FilePickerButton({
  label,
  accept,
  variant = 'primary',
  isLoading,
  onFile,
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again (after a discard, say) still fires onChange.
    event.target.value = '';
    if (file) onFile(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant={variant}
        className="sm:w-auto sm:px-6"
        isLoading={isLoading}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}
