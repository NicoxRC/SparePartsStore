import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useCreateResolution } from '../hooks/useResolutions';
import { getApiErrorMessage } from '../lib/errors';
import {
  resolutionFormSchema,
  type ResolutionFormInput,
  type ResolutionFormValues,
} from '../lib/schemas/resolution';

export function ResolutionFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateResolution();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResolutionFormInput, unknown, ResolutionFormValues>({
    resolver: zodResolver(resolutionFormSchema),
    defaultValues: {
      documentType: 'invoice',
      prefix: '',
      subtype: '',
      resolutionCode: '',
      resolutionCodeMessage: '',
      resolutionNumber: '',
      rangeStart: 0,
      rangeEnd: 0,
      technicalKey: '',
      startDate: '',
      endDate: '',
    },
  });

  const documentType = useWatch({ control, name: 'documentType' });

  const onSubmit = async (values: ResolutionFormValues) => {
    await createMutation.mutateAsync({
      ...values,
      resolutionCodeMessage: values.resolutionCodeMessage || undefined,
      technicalKey: values.technicalKey || undefined,
    });
    navigate('/invoicing/resolutions');
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        Nueva resolución DIAN
      </h1>

      {createMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(createMutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6"
        noValidate
      >
        <SelectField
          label="Tipo de documento"
          error={errors.documentType?.message}
          {...register('documentType')}
        >
          <option value="invoice">Factura electrónica</option>
          <option value="support_docs">Documento soporte</option>
        </SelectField>

        <TextField
          label="Prefijo"
          placeholder="FE"
          error={errors.prefix?.message}
          {...register('prefix')}
        />

        <TextField
          label="Subtipo"
          placeholder="ELECTRONICO"
          error={errors.subtype?.message}
          {...register('subtype')}
        />

        <TextField
          label="Código de la resolución"
          placeholder="SDJ-002"
          error={errors.resolutionCode?.message}
          {...register('resolutionCode')}
        />

        <TextField
          label="Mensaje del código (opcional)"
          error={errors.resolutionCodeMessage?.message}
          {...register('resolutionCodeMessage')}
        />

        <TextField
          label="Número de resolución"
          placeholder="18764075467155"
          error={errors.resolutionNumber?.message}
          {...register('resolutionNumber')}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Rango inicial"
            type="number"
            error={errors.rangeStart?.message}
            {...register('rangeStart')}
          />
          <TextField
            label="Rango final"
            type="number"
            error={errors.rangeEnd?.message}
            {...register('rangeEnd')}
          />
        </div>

        {documentType === 'invoice' && (
          <TextField
            label="Clave técnica (opcional)"
            error={errors.technicalKey?.message}
            {...register('technicalKey')}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Fecha de inicio"
            type="date"
            error={errors.startDate?.message}
            {...register('startDate')}
          />
          <TextField
            label="Fecha de fin"
            type="date"
            error={errors.endDate?.message}
            {...register('endDate')}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/invoicing/resolutions')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="sm:w-auto sm:px-6"
            isLoading={createMutation.isPending}
          >
            Asociar resolución
          </Button>
        </div>
      </form>
    </div>
  );
}
