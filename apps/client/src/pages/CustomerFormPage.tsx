import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { CustomerPurchaseHistory } from '../components/CustomerPurchaseHistory';
import { SelectField } from '../components/SelectField';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { usePermissions } from '../hooks/usePermissions';
import { DANE_CITIES, DANE_DEPARTMENTS } from '../lib/dane';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import {
  customerFormSchema,
  type CustomerFormInput,
  type CustomerFormValues,
} from '../lib/schemas/customer';
import { lowerCaseField, upperCaseField } from '../lib/textCase';
import type { CustomerPartyType } from '../services/customers';

type Tab = 'data' | 'history';

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canUpdate = has('customers.update');
  // Derived straight from the URL (not local state) so it's always correct
  // regardless of navigation: the "Editar" button links here with no
  // ?tab=, landing on Datos; clicking a customer's card elsewhere links
  // here with ?tab=history — see CustomerCard.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'history' ? 'history' : 'data';
  const setTab = (next: Tab) => {
    setSearchParams(next === 'history' ? { tab: 'history' } : {}, { replace: true });
  };

  const customerQuery = useCustomer(id);
  const updateMutation = useUpdateCustomer(id ?? '');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    values: customerQuery.data
      ? {
          identificationType: customerQuery.data.identificationType,
          identification: customerQuery.data.identification,
          identificationDv: customerQuery.data.identificationDv ?? '',
          partyType: customerQuery.data.partyType,
          taxLevelCode: customerQuery.data.taxLevelCode ?? '',
          regimen: customerQuery.data.regimen ?? '',
          companyName: customerQuery.data.companyName ?? '',
          firstName: customerQuery.data.firstName ?? '',
          familyName: customerQuery.data.familyName ?? '',
          countryCode: customerQuery.data.countryCode ?? 'CO',
          department: customerQuery.data.department ?? '',
          city: customerQuery.data.city ?? '',
          addressLine: customerQuery.data.addressLine ?? '',
          email: customerQuery.data.email,
          phone: customerQuery.data.phone ?? '',
          responsableIva: customerQuery.data.responsableIva ?? false,
        }
      : undefined,
  });

  const identificationType = useWatch({ control, name: 'identificationType' });
  const partyType = useWatch({ control, name: 'partyType' });
  const department = useWatch({ control, name: 'department' });
  const citiesForDepartment = DANE_CITIES.filter(
    (city) => city.departmentCode === department,
  );

  const onSubmit = async (values: CustomerFormValues) => {
    await updateMutation.mutateAsync({
      ...values,
      partyType: values.partyType as CustomerPartyType,
      identificationDv: values.identificationDv || undefined,
      taxLevelCode: values.taxLevelCode || undefined,
      regimen: values.regimen || undefined,
      companyName: values.companyName || undefined,
      firstName: values.firstName || undefined,
      familyName: values.familyName || undefined,
      department: values.department || undefined,
      city: values.city || undefined,
      addressLine: values.addressLine || undefined,
      phone: values.phone || undefined,
    });
    navigate('/customers');
  };

  if (customerQuery.isPending) {
    return <Spinner label="Cargando cliente…" />;
  }

  if (customerQuery.isError) {
    return <Alert variant="error">{getApiErrorMessage(customerQuery.error)}</Alert>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Editar cliente
      </h1>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('data')}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            tab === 'data'
              ? 'border-ink bg-ink text-paper'
              : 'border-line bg-paper text-steel hover:bg-mist'
          }`}
        >
          Datos
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            tab === 'history'
              ? 'border-ink bg-ink text-paper'
              : 'border-line bg-paper text-steel hover:bg-mist'
          }`}
        >
          Historial de compras
        </button>
      </div>

      {tab === 'history' ? (
        id && <CustomerPurchaseHistory customerId={id} />
      ) : (
        <>
      {updateMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(updateMutation.error)}</Alert>
      )}

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        onKeyDown={handleEnterAsTab}
        className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo de identificación"
            error={errors.identificationType?.message}
            {...register('identificationType')}
          >
            <option value="NIT">NIT</option>
            <option value="CC">Cédula de ciudadanía</option>
          </SelectField>
          <TextField
            label="Identificación"
            placeholder="830033494"
            error={errors.identification?.message}
            {...register('identification')}
          />
          {identificationType === 'NIT' && (
            <TextField
              label="Dígito de verificación"
              placeholder="7"
              error={errors.identificationDv?.message}
              {...register('identificationDv')}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo de persona"
            error={errors.partyType?.message}
            {...register('partyType')}
          >
            <option value="PERSONA_JURIDICA">Persona jurídica</option>
            <option value="PERSONA_NATURAL">Persona natural</option>
          </SelectField>
          <SelectField
            label="Responsabilidad tributaria"
            error={errors.taxLevelCode?.message}
            {...register('taxLevelCode')}
          >
            <option value="">Sin especificar</option>
            <option value="COMUN">Responsable de IVA</option>
            <option value="SIMPLIFICADO">No responsable de IVA</option>
          </SelectField>

          {partyType === 'PERSONA_JURIDICA' ? (
            <div className="sm:col-span-2">
              <TextField
                label="Razón social"
                error={errors.companyName?.message}
                {...upperCaseField(register('companyName'))}
              />
            </div>
          ) : (
            <>
              <TextField
                label="Nombres"
                error={errors.firstName?.message}
                {...upperCaseField(register('firstName'))}
              />
              <TextField
                label="Apellidos"
                error={errors.familyName?.message}
                {...upperCaseField(register('familyName'))}
              />
            </>
          )}

          <TextField
            label="Régimen (opcional)"
            error={errors.regimen?.message}
            {...register('regimen')}
          />

          <SelectField
            label="Departamento"
            error={errors.department?.message}
            {...register('department')}
          >
            <option value="">Sin especificar</option>
            {DANE_DEPARTMENTS.map((dept) => (
              <option key={dept.code} value={dept.code}>
                {dept.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Ciudad"
            error={errors.city?.message}
            disabled={citiesForDepartment.length === 0}
            {...register('city')}
          >
            <option value="">Sin especificar</option>
            {citiesForDepartment.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </SelectField>

          <div className="sm:col-span-2">
            <TextField
              label="Dirección"
              error={errors.addressLine?.message}
              {...register('addressLine')}
            />
          </div>
          <TextField
            label="Correo"
            type="email"
            error={errors.email?.message}
            {...lowerCaseField(register('email'))}
          />
          <TextField
            label="Celular (opcional)"
            type="tel"
            placeholder="3001234567"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-steel">
          <input type="checkbox" {...register('responsableIva')} />
          Responsable de IVA
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/customers')}
          >
            Cancelar
          </Button>
          {canUpdate && (
            <Button
              type="submit"
              className="sm:w-auto sm:px-6"
              isLoading={updateMutation.isPending}
            >
              Guardar cambios
            </Button>
          )}
        </div>
      </form>
        </>
      )}
    </div>
  );
}
