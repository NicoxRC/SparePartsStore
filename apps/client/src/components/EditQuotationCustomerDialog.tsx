import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useWatch } from 'react-hook-form';
import { Alert } from './Alert';
import { Button } from './Button';
import { CustomerPicker } from './CustomerPicker';
import { SelectField } from './SelectField';
import { TextField } from './TextField';
import { useUpdateQuotationCustomer } from '../hooks/useQuotations';
import { DANE_CITIES, DANE_DEPARTMENTS } from '../lib/dane';
import { getApiErrorMessage } from '../lib/errors';
import { handleEnterAsTab } from '../lib/formNavigation';
import {
  quotationCustomerSchema,
  type QuotationCustomerFormValues,
} from '../lib/schemas/quotationCustomer';
import { lowerCaseField, toLowerCase, toUpperCase, upperCaseField } from '../lib/textCase';
import type { CustomerResponse } from '../services/customers';
import type { QuotationResponse } from '../services/quotations';
import type { ThirdPartyResponse } from '../services/thirdParties';

interface EditQuotationCustomerDialogProps {
  quotation: QuotationResponse;
  onClose: () => void;
  onSaved: () => void;
}

function formValuesFrom(quotation: QuotationResponse): QuotationCustomerFormValues {
  return {
    customerIdentificationType: quotation.customerIdentificationType,
    customerIdentification: quotation.customerIdentification,
    customerIdentificationDv: quotation.customerIdentificationDv ?? '',
    customerPhone: quotation.customerPhone ?? '',
    customerPartyType: quotation.customerPartyType,
    customerTaxLevelCode: quotation.customerTaxLevelCode,
    customerRegimen: quotation.customerRegimen ?? '',
    customerCompanyName: quotation.customerCompanyName ?? '',
    customerFirstName: quotation.customerFirstName ?? '',
    customerFamilyName: quotation.customerFamilyName ?? '',
    customerCountryCode: quotation.customerCountryCode,
    customerDepartment: quotation.customerDepartment,
    customerCity: quotation.customerCity,
    customerAddressLine: quotation.customerAddressLine,
    customerEmail: quotation.customerEmail,
  };
}

/**
 * Fixes the customer data on an open quotation (a typo, or the wrong customer
 * picked): the same fields as when it was made, pre-filled. Only this
 * quotation changes — the saved customer in Clientes is left as is.
 */
export function EditQuotationCustomerDialog({
  quotation,
  onClose,
  onSaved,
}: EditQuotationCustomerDialogProps) {
  const updateMutation = useUpdateQuotationCustomer();
  const [searchQuery, setSearchQuery] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<QuotationCustomerFormValues>({
    resolver: zodResolver(quotationCustomerSchema),
    defaultValues: formValuesFrom(quotation),
  });

  const [identificationType, identification, partyType, department] = useWatch({
    control,
    name: [
      'customerIdentificationType',
      'customerIdentification',
      'customerPartyType',
      'customerDepartment',
    ],
  });
  const citiesForDepartment = DANE_CITIES.filter((city) => city.departmentCode === department);
  const departmentField = register('customerDepartment');

  const handleSelectCustomer = (customer: CustomerResponse) => {
    setValue('customerIdentificationType', customer.identificationType);
    setValue('customerIdentification', customer.identification);
    setValue('customerIdentificationDv', customer.identificationDv ?? '');
    setValue('customerPhone', customer.phone ?? '');
    setValue('customerPartyType', customer.partyType);
    setValue('customerTaxLevelCode', customer.taxLevelCode || 'COMUN');
    setValue('customerRegimen', customer.regimen ?? '');
    setValue('customerCompanyName', toUpperCase(customer.companyName ?? ''));
    setValue('customerFirstName', toUpperCase(customer.firstName ?? ''));
    setValue('customerFamilyName', toUpperCase(customer.familyName ?? ''));
    setValue('customerCountryCode', customer.countryCode ?? 'CO');
    setValue('customerDepartment', customer.department ?? '');
    setValue('customerCity', customer.city ?? '');
    setValue('customerAddressLine', customer.addressLine ?? '');
    setValue('customerEmail', toLowerCase(customer.email));
    setSearchQuery('');
  };

  // Same as Venta: what's typed in the search box is also the identification,
  // so "Buscar en DIAN" works on it right away.
  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setValue('customerIdentification', value);
  };

  const handleDianResult = (result: ThirdPartyResponse) => {
    const isPerson = result.identificationType === 'CC';
    const familyName = [result.familyName, result.secondLastName].filter(Boolean).join(' ');
    setValue('customerIdentificationType', result.identificationType);
    setValue('customerIdentification', result.identification);
    if (result.email) setValue('customerEmail', toLowerCase(result.email));
    setValue('customerPartyType', isPerson ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA');
    setValue('customerTaxLevelCode', isPerson ? 'SIMPLIFICADO' : 'COMUN');
    setValue('customerCompanyName', isPerson ? '' : toUpperCase(result.companyName ?? ''));
    setValue('customerFirstName', isPerson ? toUpperCase(result.firstName ?? '') : '');
    setValue('customerFamilyName', isPerson ? toUpperCase(familyName) : '');
  };

  const onSubmit = async (values: QuotationCustomerFormValues) => {
    const isCompany = values.customerPartyType === 'PERSONA_JURIDICA';
    await updateMutation.mutateAsync({
      id: quotation.id,
      input: {
        customerIdentificationType: values.customerIdentificationType,
        customerIdentification: values.customerIdentification,
        // The check digit only exists for a NIT.
        customerIdentificationDv:
          values.customerIdentificationType === 'NIT'
            ? values.customerIdentificationDv || undefined
            : undefined,
        customerPartyType: values.customerPartyType,
        customerTaxLevelCode: values.customerTaxLevelCode,
        customerRegimen: values.customerRegimen || undefined,
        // Only the name fields for the chosen kind of person, so switching
        // from empresa to persona (or back) doesn't leave the old name behind.
        customerCompanyName: isCompany ? values.customerCompanyName || undefined : undefined,
        customerFirstName: isCompany ? undefined : values.customerFirstName || undefined,
        customerFamilyName: isCompany ? undefined : values.customerFamilyName || undefined,
        customerCountryCode: values.customerCountryCode,
        customerDepartment: values.customerDepartment,
        customerCity: values.customerCity,
        customerAddressLine: values.customerAddressLine,
        customerEmail: values.customerEmail,
        customerPhone: values.customerPhone || undefined,
      },
    });
    onSaved();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Editar cliente</h2>
        <p className="mt-1 text-sm text-fog">
          Solo cambia los datos de esta cotización, no el cliente guardado.
        </p>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          onKeyDown={handleEnterAsTab}
          className="mt-3 flex flex-col gap-4"
          noValidate
        >
          {updateMutation.isError && (
            <Alert variant="error">{getApiErrorMessage(updateMutation.error)}</Alert>
          )}

          <CustomerPicker
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            identification={identification}
            identificationType={identificationType}
            onSelectCustomer={handleSelectCustomer}
            onDianResult={handleDianResult}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Tipo de identificación"
              error={errors.customerIdentificationType?.message}
              {...register('customerIdentificationType')}
            >
              <option value="NIT">NIT</option>
              <option value="CC">Cédula de ciudadanía</option>
            </SelectField>
            <TextField
              label="Identificación"
              error={errors.customerIdentification?.message}
              {...register('customerIdentification')}
            />
            {identificationType === 'NIT' && (
              <TextField
                label="Dígito de verificación"
                error={errors.customerIdentificationDv?.message}
                {...register('customerIdentificationDv')}
              />
            )}
            <SelectField
              label="Tipo de persona"
              error={errors.customerPartyType?.message}
              {...register('customerPartyType')}
            >
              <option value="PERSONA_JURIDICA">Persona jurídica</option>
              <option value="PERSONA_NATURAL">Persona natural</option>
            </SelectField>
            <SelectField
              label="Responsabilidad tributaria"
              error={errors.customerTaxLevelCode?.message}
              {...register('customerTaxLevelCode')}
            >
              <option value="COMUN">Responsable de IVA</option>
              <option value="SIMPLIFICADO">No responsable de IVA</option>
            </SelectField>

            {partyType === 'PERSONA_JURIDICA' ? (
              <div className="sm:col-span-2">
                <TextField
                  label="Razón social"
                  error={errors.customerCompanyName?.message}
                  {...upperCaseField(register('customerCompanyName'))}
                />
              </div>
            ) : (
              <>
                <TextField
                  label="Nombres"
                  error={errors.customerFirstName?.message}
                  {...upperCaseField(register('customerFirstName'))}
                />
                <TextField
                  label="Apellidos"
                  error={errors.customerFamilyName?.message}
                  {...upperCaseField(register('customerFamilyName'))}
                />
              </>
            )}

            <SelectField
              label="Departamento"
              error={errors.customerDepartment?.message}
              {...departmentField}
              onChange={(e) => {
                void departmentField.onChange(e);
                const cities = DANE_CITIES.filter(
                  (city) => city.departmentCode === e.target.value,
                );
                setValue('customerCity', cities[0]?.code ?? '');
              }}
            >
              {DANE_DEPARTMENTS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Ciudad"
              error={errors.customerCity?.message}
              disabled={citiesForDepartment.length === 0}
              {...register('customerCity')}
            >
              {citiesForDepartment.length === 0 ? (
                <option value="">Sin ciudades cargadas para este departamento</option>
              ) : (
                citiesForDepartment.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))
              )}
            </SelectField>
            <div className="sm:col-span-2">
              <TextField
                label="Dirección"
                error={errors.customerAddressLine?.message}
                {...register('customerAddressLine')}
              />
            </div>
            <TextField
              label="Correo"
              type="email"
              error={errors.customerEmail?.message}
              {...lowerCaseField(register('customerEmail'))}
            />
            <TextField
              label="Celular (opcional)"
              type="tel"
              error={errors.customerPhone?.message}
              {...register('customerPhone')}
            />
          </div>

          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Guardar cliente
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
