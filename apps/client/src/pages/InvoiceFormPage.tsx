import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useCreateInvoice } from '../hooks/useInvoices';
import { useProducts } from '../hooks/useProducts';
import { useThirdPartyLookup } from '../hooks/useThirdPartyLookup';
import { getApiErrorMessage } from '../lib/errors';
import {
  invoiceFormSchema,
  type InvoiceFormInput,
  type InvoiceFormValues,
} from '../lib/schemas/invoice';
import type { ProductResponse } from '../services/products';

const DEFAULT_TAX_RATE = 19;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateInvoice();
  const [productQuery, setProductQuery] = useState('');
  const [lookupTarget, setLookupTarget] = useState({
    identification: '',
    identificationType: 'NIT',
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: undefined,
      issueDate: todayIsoDate(),
      paymentDate: todayIsoDate(),
      paymentMeans: 'BANK_TRANSFER',
      paymentMeansType: 'DEBITO',
      orderReference: '',
      customerIdentificationType: 'NIT',
      customerIdentification: '',
      customerPartyType: 'PERSONA_JURIDICA',
      customerTaxLevelCode: 'COMUN',
      customerRegimen: '',
      customerCompanyName: '',
      customerFirstName: '',
      customerFamilyName: '',
      customerCountryCode: 'CO',
      customerDepartment: '',
      customerCity: '',
      customerAddressLine: '',
      customerEmail: '',
      items: [],
      notes: '',
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: 'items' });

  const customerPartyType = useWatch({ control, name: 'customerPartyType' });
  const watchedItems = useWatch({ control, name: 'items' });

  const productsQuery = useProducts({ search: productQuery, limit: 10 });
  const thirdPartyLookup = useThirdPartyLookup(lookupTarget, false);

  const handleLookupCustomer = async () => {
    const identification = getValues('customerIdentification');
    const identificationType = getValues('customerIdentificationType');
    if (!identification || !identificationType) return;

    setLookupTarget({ identification, identificationType });
    const result = await thirdPartyLookup.refetch();
    if (result.data) {
      if (result.data.companyName) setValue('customerCompanyName', result.data.companyName);
      if (result.data.firstName) setValue('customerFirstName', result.data.firstName);
      if (result.data.familyName) setValue('customerFamilyName', result.data.familyName);
      if (result.data.email) setValue('customerEmail', result.data.email);
    }
  };

  const handleAddProduct = (product: ProductResponse) => {
    appendItem({
      productId: product.id,
      reference: product.reference,
      description: product.description,
      price: product.salePrice,
      stock: product.stock,
      quantity: 1,
      taxRate: DEFAULT_TAX_RATE,
    });
    setProductQuery('');
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    await createMutation.mutateAsync({
      number: values.number,
      issueDate: values.issueDate,
      paymentDate: values.paymentDate,
      paymentMeans: values.paymentMeans,
      paymentMeansType: values.paymentMeansType,
      orderReference: values.orderReference || undefined,
      customerIdentificationType: values.customerIdentificationType,
      customerIdentification: values.customerIdentification,
      customerPartyType: values.customerPartyType,
      customerTaxLevelCode: values.customerTaxLevelCode,
      customerRegimen: values.customerRegimen || undefined,
      customerCompanyName: values.customerCompanyName || undefined,
      customerFirstName: values.customerFirstName || undefined,
      customerFamilyName: values.customerFamilyName || undefined,
      customerCountryCode: values.customerCountryCode,
      customerDepartment: values.customerDepartment,
      customerCity: values.customerCity,
      customerAddressLine: values.customerAddressLine,
      customerEmail: values.customerEmail,
      items: values.items.map(({ productId, quantity, taxRate }) => ({
        productId,
        quantity,
        taxRate,
      })),
      notes: values.notes ? [values.notes] : undefined,
    });
    navigate('/invoicing/invoices');
  };

  const total = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const base = item.price * quantity;
    return sum + base + Math.round(base * (taxRate / 100));
  }, 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        Nueva factura electrónica
      </h1>

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
            Datos de la factura
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Número"
              type="number"
              placeholder="1225"
              error={errors.number?.message}
              {...register('number')}
            />
            <TextField
              label="Referencia de orden (opcional)"
              error={errors.orderReference?.message}
              {...register('orderReference')}
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
            <SelectField
              label="Medio de pago"
              error={errors.paymentMeans?.message}
              {...register('paymentMeans')}
            >
              <option value="BANK_TRANSFER">Transferencia bancaria</option>
              <option value="CREDIT_TRANSFER">Transferencia de crédito</option>
            </SelectField>
            <SelectField
              label="Tipo de pago"
              error={errors.paymentMeansType?.message}
              {...register('paymentMeansType')}
            >
              <option value="DEBITO">Débito</option>
              <option value="CREDITO">Crédito</option>
            </SelectField>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
            Cliente
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Tipo de identificación"
              error={errors.customerIdentificationType?.message}
              {...register('customerIdentificationType')}
            >
              <option value="NIT">NIT</option>
              <option value="CC">Cédula de ciudadanía</option>
            </SelectField>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField
                  label="Identificación"
                  placeholder="830033494"
                  error={errors.customerIdentification?.message}
                  {...register('customerIdentification')}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mb-[1px] sm:w-auto sm:px-4"
                isLoading={thirdPartyLookup.isFetching}
                onClick={() => void handleLookupCustomer()}
              >
                Buscar
              </Button>
            </div>
          </div>

          {thirdPartyLookup.isFetched && !thirdPartyLookup.data && (
            <Alert variant="info">No se encontró un tercero con esa identificación en la DIAN.</Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <option value="COMUN">Común</option>
              <option value="SIMPLIFICADO">Simplificado</option>
            </SelectField>

            {customerPartyType === 'PERSONA_JURIDICA' ? (
              <div className="sm:col-span-2">
                <TextField
                  label="Razón social"
                  error={errors.customerCompanyName?.message}
                  {...register('customerCompanyName')}
                />
              </div>
            ) : (
              <>
                <TextField
                  label="Nombres"
                  error={errors.customerFirstName?.message}
                  {...register('customerFirstName')}
                />
                <TextField
                  label="Apellidos"
                  error={errors.customerFamilyName?.message}
                  {...register('customerFamilyName')}
                />
              </>
            )}

            <TextField
              label="Código DANE de departamento"
              placeholder="11"
              error={errors.customerDepartment?.message}
              {...register('customerDepartment')}
            />
            <TextField
              label="Código DANE de ciudad"
              placeholder="001"
              error={errors.customerCity?.message}
              {...register('customerCity')}
            />
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
              {...register('customerEmail')}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
            Productos
          </h2>

          <div className="relative">
            <TextField
              label="Buscar producto por referencia o descripción"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
            {productQuery.length > 0 && productsQuery.data && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#D8DCE6] bg-white shadow-lg">
                {productsQuery.data.data.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[#8B92A3]">Sin resultados.</p>
                ) : (
                  productsQuery.data.data.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-[#F0F2F6]"
                    >
                      <span className="font-medium text-[#1E2A4A]">
                        {product.reference} — {product.description}
                      </span>
                      <span className="text-xs text-[#8B92A3]">
                        ${product.salePrice.toLocaleString('es-CO')} · stock {product.stock}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {errors.items?.message && <Alert variant="error">{errors.items.message}</Alert>}

          {itemFields.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-[#E4E8EF]">
              <table className="min-w-full divide-y divide-[#E4E8EF] text-sm">
                <thead className="bg-[#F7F6F4] text-left text-xs font-medium uppercase tracking-wide text-[#8B92A3]">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">IVA %</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E8EF]">
                  {itemFields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
                        {field.reference} — {field.description}
                      </td>
                      <td className="px-3 py-2">${field.price.toLocaleString('es-CO')}</td>
                      <td className="w-24 px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={field.stock}
                          className="w-20 rounded-md border border-[#D8DCE6] px-2 py-1"
                          {...register(`items.${index}.quantity`)}
                        />
                      </td>
                      <td className="w-24 px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          className="w-20 rounded-md border border-[#D8DCE6] px-2 py-1"
                          {...register(`items.${index}.taxRate`)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-sm font-medium text-[#C2483A] hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-right text-lg font-semibold text-[#1E2A4A]">
            Total: ${total.toLocaleString('es-CO')}
          </p>
        </section>

        <TextField label="Notas (opcional)" {...register('notes')} />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/invoicing/invoices')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={createMutation.isPending}>
            Enviar factura
          </Button>
        </div>
      </form>
    </div>
  );
}
