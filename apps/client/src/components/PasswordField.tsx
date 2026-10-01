import { forwardRef, useState, type ComponentProps } from 'react';
import { IconEye, IconEyeOff } from './icons';
import { TextField } from './TextField';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'endAdornment'>;

/** A password TextField with an eye toggle to show what's being typed. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(props, ref) {
    const [isVisible, setIsVisible] = useState(false);
    const Icon = isVisible ? IconEyeOff : IconEye;

    return (
      <TextField
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        endAdornment={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsVisible((visible) => !visible)}
            aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="flex h-10 w-10 items-center justify-center text-fog hover:text-ink"
          >
            <Icon className="h-5 w-5" />
          </button>
        }
        {...props}
      />
    );
  },
);
