import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useCreatePosInvoice } from '../hooks/usePosInvoices';
import { useProducts } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import {
  posInvoiceFormSchema,
  type PosInvoiceFormInput,
  type PosInvoiceFormValues,
} from '../lib/schemas/posInvoice';
import type { ProductResponse } from '../services/products';

const DEFAULT_TAX_RATE = 19;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PosInvoiceFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreatePosInvoice();
  const [productQuery, setProductQuery] = useState('');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PosInvoiceFormInput, unknown, PosInvoiceFormValues>({
    resolver: zodResolver(posInvoiceFormSchema),
    defaultValues: {
      number: undefined,
      issueDate: todayIsoDate(),
      paymentMeansCode: 'CASH',
      paymentMeansType: 'DEBITO',
      customerType: 'NATURAL',
      customerIdentificationType: 'CC',
      customerIdentification: '',
      customerFirstName: '',
      customerFamilyName: '',
      customerCompanyName: '',
      customerPhone: '',
      customerEmail: '',
      responsableIva: false,
      items: [],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: 'items' });

  const customerType = useWatch({ control, name: 'customerType' });
  const watchedItems = useWatch({ control, name: 'items' });

  const productsQuery = useProducts({ search: productQuery, limit: 10 });

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

  const onSubmit = async (values: PosInvoiceFormValues) => {
    await createMutation.mutateAsync({
      number: values.number,
      issueDate: values.issueDate,
      paymentMeansCode: values.paymentMeansCode,
      paymentMeansType: values.paymentMeansType,
      customerType: values.customerType,
      customerIdentificationType: values.customerIdentificationType,
      customerIdentification: values.customerIdentification,
      customerCompanyName: values.customerCompanyName || undefined,
      customerFirstName: values.customerFirstName || undefined,
      customerFamilyName: values.customerFamilyName || undefined,
      customerPhone: values.customerPhone || undefined,
      customerEmail: values.customerEmail,
      responsableIva: values.responsableIva,
      items: values.items.map(({ productId, quantity, taxRate }) => ({
        productId,
        quantity,
        taxRate,
      })),
    });
    navigate('/invoicing/pos-invoices');
  };

  const total = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const base = item.price * quantity;
    return sum + base + Math.round(base * (taxRate / 100));
  }, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
        Nueva venta POS
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
                    <th className="px-3 py-2">Cant.</th>
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
                      <td className="w-20 px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={field.stock}
                          className="w-16 rounded-md border border-[#D8DCE6] px-2 py-1"
                          {...register(`items.${index}.quantity`)}
                        />
                      </td>
                      <td className="w-20 px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          className="w-16 rounded-md border border-[#D8DCE6] px-2 py-1"
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

        <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B92A3]">
            Cliente y pago
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Número de venta"
              type="number"
              placeholder="300002"
              error={errors.number?.message}
              {...register('number')}
            />
            <TextField
              label="Fecha"
              type="date"
              error={errors.issueDate?.message}
              {...register('issueDate')}
            />

            <SelectField
              label="Medio de pago"
              error={errors.paymentMeansCode?.message}
              {...register('paymentMeansCode')}
            >
              <option value="CASH">Efectivo</option>
            </SelectField>
            <SelectField
              label="Tipo"
              error={errors.paymentMeansType?.message}
              {...register('paymentMeansType')}
            >
              <option value="DEBITO">Débito</option>
              <option value="CREDITO">Crédito</option>
            </SelectField>

            <SelectField
              label="Tipo de cliente"
              error={errors.customerType?.message}
              {...register('customerType')}
            >
              <option value="NATURAL">Natural</option>
              <option value="JURIDICA">Jurídica</option>
            </SelectField>
            <SelectField
              label="Tipo de identificación"
              error={errors.customerIdentificationType?.message}
              {...register('customerIdentificationType')}
            >
              <option value="CC">Cédula</option>
              <option value="NIT">NIT</option>
            </SelectField>

            <TextField
              label="Identificación"
              error={errors.customerIdentification?.message}
              {...register('customerIdentification')}
            />

            {customerType === 'JURIDICA' ? (
              <TextField
                label="Razón social"
                error={errors.customerCompanyName?.message}
                {...register('customerCompanyName')}
              />
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
              label="Teléfono (opcional)"
              error={errors.customerPhone?.message}
              {...register('customerPhone')}
            />
            <TextField
              label="Correo"
              type="email"
              error={errors.customerEmail?.message}
              {...register('customerEmail')}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#3F4654]">
            <input type="checkbox" {...register('responsableIva')} />
            Cliente responsable de IVA
          </label>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/invoicing/pos-invoices')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="sm:w-auto sm:px-6" isLoading={createMutation.isPending}>
            Registrar venta
          </Button>
        </div>
      </form>
    </div>
  );
}
