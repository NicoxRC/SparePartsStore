import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { CurrencyField } from '../components/CurrencyField';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useCreatePayrollEntry } from '../hooks/usePayroll';
import { getApiErrorMessage } from '../lib/errors';
import {
  payrollEntryFormSchema,
  type PayrollEntryFormInput,
  type PayrollEntryFormValues,
} from '../lib/schemas/payroll';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyLineItem = { code: '', amount: 0, days: undefined, percentage: undefined, description: '' };

export function PayrollFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreatePayrollEntry();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PayrollEntryFormInput, unknown, PayrollEntryFormValues>({
    resolver: zodResolver(payrollEntryFormSchema),
    defaultValues: {
      prefix: 'N',
      number: undefined,
      salary: 0,
      periodicity: 'MENSUAL',
      initialSettlementDate: todayIsoDate(),
      finalSettlementDate: todayIsoDate(),
      issueDate: todayIsoDate(),
      paymentDate: todayIsoDate(),
      notes: '',
      accruals: [emptyLineItem],
      deductions: [],
      employee: {
        identificationType: 'CEDULA_DE_CIUDADANIA',
        identification: '',
        firstName: '',
        otherNames: '',
        lastName: '',
        secondLastName: '',
        email: '',
        integralSalary: false,
        highRisk: false,
        startDate: todayIsoDate(),
        workerType: 'DEPENDIENTE',
        subCode: 'NO_APLICA',
        paymentMeans: 'TRANSFERENCIA_CREDITO_BANCARIO',
        contractType: 'TERMINO_FIJO',
        addressLine: '',
        addressCity: '',
        addressDepartment: '',
      },
    },
  });

  const accrualsArray = useFieldArray({ control, name: 'accruals' });
  const deductionsArray = useFieldArray({ control, name: 'deductions' });

  const onSubmit = async (values: PayrollEntryFormValues) => {
    const notes = (values.notes ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    await createMutation.mutateAsync({
      prefix: values.prefix,
      number: values.number,
      salary: values.salary,
      periodicity: values.periodicity,
      initialSettlementDate: values.initialSettlementDate,
      finalSettlementDate: values.finalSettlementDate,
      issueDate: values.issueDate,
      paymentDate: values.paymentDate,
      notes: notes.length > 0 ? notes : undefined,
      accruals: values.accruals,
      deductions: values.deductions.length > 0 ? values.deductions : undefined,
      employee: {
        identificationType: values.employee.identificationType,
        identification: values.employee.identification,
        firstName: values.employee.firstName,
        otherNames: values.employee.otherNames || undefined,
        lastName: values.employee.lastName,
        secondLastName: values.employee.secondLastName || undefined,
        email: values.employee.email,
        integralSalary: values.employee.integralSalary,
        highRisk: values.employee.highRisk,
        startDate: values.employee.startDate,
        workerType: values.employee.workerType,
        subCode: values.employee.subCode,
        paymentMeans: values.employee.paymentMeans,
        contractType: values.employee.contractType,
        address: {
          line: values.employee.addressLine,
          city: values.employee.addressCity,
          department: values.employee.addressDepartment,
        },
      },
    });
    navigate('/invoicing/payroll-entries');
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        Nuevo período de nómina
      </h1>

      <Alert variant="info">
        Las cifras se calculan fuera de esta app (por ejemplo, por el contador) — aquí
        solo se envían a Dataico para su reporte a la DIAN.
      </Alert>

      {createMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(createMutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-6"
        noValidate
      >
        <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
            Período
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Prefijo"
              error={errors.prefix?.message}
              {...register('prefix')}
            />
            <TextField
              label="Número"
              type="number"
              error={errors.number?.message}
              {...register('number')}
            />
            <SelectField
              label="Periodicidad"
              error={errors.periodicity?.message}
              {...register('periodicity')}
            >
              <option value="MENSUAL">Mensual</option>
            </SelectField>
            <Controller
              name="salary"
              control={control}
              render={({ field }) => (
                <CurrencyField
                  label="Salario"
                  error={errors.salary?.message}
                  name={field.name}
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <TextField
              label="Inicio del período"
              type="date"
              error={errors.initialSettlementDate?.message}
              {...register('initialSettlementDate')}
            />
            <TextField
              label="Fin del período"
              type="date"
              error={errors.finalSettlementDate?.message}
              {...register('finalSettlementDate')}
            />
            <TextField
              label="Fecha de emisión"
              type="date"
              error={errors.issueDate?.message}
              {...register('issueDate')}
            />
            <TextField
              label="Fecha de pago"
              type="date"
              error={errors.paymentDate?.message}
              {...register('paymentDate')}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
              Devengos
            </h2>
            <button
              type="button"
              onClick={() => accrualsArray.append(emptyLineItem)}
              className="text-sm font-medium text-[#1E2A4A] hover:underline"
            >
              + Agregar
            </button>
          </div>

          {errors.accruals?.message && (
            <Alert variant="error">{errors.accruals.message}</Alert>
          )}

          {accrualsArray.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <TextField
                label="Código"
                placeholder="BASICO"
                error={errors.accruals?.[index]?.code?.message}
                {...register(`accruals.${index}.code`)}
              />
              <TextField
                label="Monto"
                type="number"
                error={errors.accruals?.[index]?.amount?.message}
                {...register(`accruals.${index}.amount`)}
              />
              <TextField label="Días" type="number" {...register(`accruals.${index}.days`)} />
              <TextField
                label="Porcentaje"
                type="number"
                {...register(`accruals.${index}.percentage`)}
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => accrualsArray.remove(index)}
                  className="text-sm font-medium text-[#C2483A] hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
              Deducciones
            </h2>
            <button
              type="button"
              onClick={() => deductionsArray.append(emptyLineItem)}
              className="text-sm font-medium text-[#1E2A4A] hover:underline"
            >
              + Agregar
            </button>
          </div>

          {deductionsArray.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <TextField
                label="Código"
                placeholder="SALUD"
                error={errors.deductions?.[index]?.code?.message}
                {...register(`deductions.${index}.code`)}
              />
              <TextField
                label="Monto"
                type="number"
                error={errors.deductions?.[index]?.amount?.message}
                {...register(`deductions.${index}.amount`)}
              />
              <TextField label="Días" type="number" {...register(`deductions.${index}.days`)} />
              <TextField
                label="Porcentaje"
                type="number"
                {...register(`deductions.${index}.percentage`)}
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => deductionsArray.remove(index)}
                  className="text-sm font-medium text-[#C2483A] hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
            Empleado
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Tipo de identificación"
              error={errors.employee?.identificationType?.message}
              {...register('employee.identificationType')}
            >
              <option value="CEDULA_DE_CIUDADANIA">Cédula de ciudadanía</option>
            </SelectField>
            <TextField
              label="Identificación"
              error={errors.employee?.identification?.message}
              {...register('employee.identification')}
            />
            <TextField
              label="Primer nombre"
              error={errors.employee?.firstName?.message}
              {...register('employee.firstName')}
            />
            <TextField label="Otros nombres (opcional)" {...register('employee.otherNames')} />
            <TextField
              label="Primer apellido"
              error={errors.employee?.lastName?.message}
              {...register('employee.lastName')}
            />
            <TextField
              label="Segundo apellido (opcional)"
              {...register('employee.secondLastName')}
            />
            <TextField
              label="Correo"
              type="email"
              error={errors.employee?.email?.message}
              {...register('employee.email')}
            />
            <TextField
              label="Fecha de inicio de contrato"
              type="date"
              error={errors.employee?.startDate?.message}
              {...register('employee.startDate')}
            />
            <SelectField
              label="Tipo de trabajador"
              error={errors.employee?.workerType?.message}
              {...register('employee.workerType')}
            >
              <option value="DEPENDIENTE">Dependiente</option>
            </SelectField>
            <SelectField
              label="Subtipo"
              error={errors.employee?.subCode?.message}
              {...register('employee.subCode')}
            >
              <option value="NO_APLICA">No aplica</option>
            </SelectField>
            <SelectField
              label="Medio de pago"
              error={errors.employee?.paymentMeans?.message}
              {...register('employee.paymentMeans')}
            >
              <option value="TRANSFERENCIA_CREDITO_BANCARIO">
                Transferencia bancaria
              </option>
            </SelectField>
            <SelectField
              label="Tipo de contrato"
              error={errors.employee?.contractType?.message}
              {...register('employee.contractType')}
            >
              <option value="TERMINO_FIJO">Término fijo</option>
            </SelectField>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#3F4654]">
            <input type="checkbox" {...register('employee.integralSalary')} />
            Salario integral
          </label>
          <label className="flex items-center gap-2 text-sm text-[#3F4654]">
            <input type="checkbox" {...register('employee.highRisk')} />
            Alto riesgo
          </label>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
            Dirección
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              label="Dirección"
              error={errors.employee?.addressLine?.message}
              {...register('employee.addressLine')}
            />
            <TextField
              label="Código DANE ciudad"
              error={errors.employee?.addressCity?.message}
              {...register('employee.addressCity')}
            />
            <TextField
              label="Código DANE departamento"
              error={errors.employee?.addressDepartment?.message}
              {...register('employee.addressDepartment')}
            />
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <label htmlFor="notes" className="text-sm font-medium text-[#3F4654]">
            Notas (opcional, una por línea)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="w-full rounded-lg border border-[#D8DCE6] px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/30 focus:border-[#1E2A4A] sm:text-sm"
            {...register('notes')}
          />
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/invoicing/payroll-entries')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={createMutation.isPending}>
            Enviar a Dataico
          </Button>
        </div>
      </form>
    </div>
  );
}
