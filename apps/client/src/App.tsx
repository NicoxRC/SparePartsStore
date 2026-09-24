import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute';
import { EmployeeRoute } from './components/EmployeeRoute';
import { PermissionRoute } from './components/PermissionRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { InvoiceDraftsProvider } from './context/InvoiceDraftsContext';
import { AuthLayout } from './layouts/AuthLayout';
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout';
import { CatalogsPage } from './pages/CatalogsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { CustomerFormPage } from './pages/CustomerFormPage';
import { CustomersListPage } from './pages/CustomersListPage';
import { CreditNoteFormPage } from './pages/CreditNoteFormPage';
import { CreditNotesListPage } from './pages/CreditNotesListPage';
import { DebitNoteFormPage } from './pages/DebitNoteFormPage';
import { DebitNotesListPage } from './pages/DebitNotesListPage';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { LookupFormPage } from './pages/LookupFormPage';
import { LookupListPage } from './pages/LookupListPage';
import { InvoiceFormPage } from './pages/InvoiceFormPage';
import { InvoicesListPage } from './pages/InvoicesListPage';
import { PayrollFormPage } from './pages/PayrollFormPage';
import { PayrollListPage } from './pages/PayrollListPage';
import { PurchaseImportDetailPage } from './pages/PurchaseImportDetailPage';
import { PurchaseImportsListPage } from './pages/PurchaseImportsListPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { ProductsListPage } from './pages/ProductsListPage';
import { QuotationDetailPage } from './pages/QuotationDetailPage';
import { QuotationsListPage } from './pages/QuotationsListPage';
import { ResolutionFormPage } from './pages/ResolutionFormPage';
import { ResolutionsListPage } from './pages/ResolutionsListPage';
import { CashRegisterHistoryPage } from './pages/CashRegisterHistoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserFormPage } from './pages/UserFormPage';
import { UsersListPage } from './pages/UsersListPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
        <InvoiceDraftsProvider>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePasswordPage />} />

              <Route element={<AuthenticatedLayout />}>
                {/* Productos/Inventario predate this permission system as
                    unrestricted views for any authenticated role — kept
                    outside EmployeeRoute so auditor keeps that fixed
                    access; PermissionRoute itself bypasses admin/auditor
                    and only actually checks an employee's grant. */}
                <Route element={<PermissionRoute permission="products.view" />}>
                  <Route path="/products" element={<ProductsListPage />} />
                </Route>
                <Route element={<PermissionRoute permission="inventory.view" />}>
                  <Route element={<PermissionRoute permission="products.view" />}>
                    <Route path="/inventory" element={<InventoryPage />} />
                  </Route>
                </Route>

                <Route element={<EmployeeRoute />}>
                  <Route element={<PermissionRoute permission="invoices.view" />}>
                    <Route path="/invoicing/invoices" element={<InvoicesListPage />} />
                  </Route>
                  <Route element={<PermissionRoute permission="debit_notes.create" />}>
                    <Route
                      path="/invoicing/invoices/:invoiceId/debit-note"
                      element={<DebitNoteFormPage />}
                    />
                  </Route>
                  <Route element={<PermissionRoute permission="debit_notes.view" />}>
                    <Route path="/invoicing/debit-notes" element={<DebitNotesListPage />} />
                  </Route>
                  <Route element={<PermissionRoute permission="credit_notes.create" />}>
                    <Route
                      path="/invoicing/invoices/:invoiceId/credit-note"
                      element={<CreditNoteFormPage />}
                    />
                  </Route>
                  <Route element={<PermissionRoute permission="credit_notes.view" />}>
                    <Route path="/invoicing/credit-notes" element={<CreditNotesListPage />} />
                  </Route>
                  <Route
                    element={<PermissionRoute permission={['invoices.create', 'quotations.create']} />}
                  >
                    <Route element={<PermissionRoute permission="cash_register.view" />}>
                      <Route path="/ventas" element={<InvoiceFormPage />} />
                    </Route>
                  </Route>
                  <Route element={<PermissionRoute permission="quotations.view" />}>
                    <Route path="/cotizaciones" element={<QuotationsListPage />} />
                    <Route path="/cotizaciones/:id" element={<QuotationDetailPage />} />
                  </Route>
                  <Route element={<PermissionRoute permission="purchase_imports.view" />}>
                    <Route path="/compras" element={<PurchaseImportsListPage />} />
                    <Route path="/compras/:id" element={<PurchaseImportDetailPage />} />
                  </Route>
                  <Route element={<PermissionRoute permission="customers.view" />}>
                    <Route path="/customers" element={<CustomersListPage />} />
                    <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute permission="products.create" />}>
                    <Route path="/products/new" element={<ProductFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute permission="products.update" />}>
                    <Route path="/products/:id/edit" element={<ProductFormPage />} />
                  </Route>
                  {/* Admin always passes PermissionRoute too, so this one
                      grant covers both "an admin viewing caja" and "an
                      employee an admin chose to let see it" — see
                      AuthenticatedLayout's nav for the matching change. */}
                  <Route element={<PermissionRoute permission="cash_register.view" />}>
                    <Route
                      path="/cash-register/history"
                      element={<CashRegisterHistoryPage />}
                    />
                  </Route>
                </Route>

                <Route element={<AdminRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />

                  <Route path="/users" element={<UsersListPage />} />
                  <Route path="/users/new" element={<UserFormPage />} />
                  <Route path="/users/:id/edit" element={<UserFormPage />} />

                  <Route path="/catalogs" element={<CatalogsPage />} />

                  <Route
                    path="/invoicing/resolutions"
                    element={<ResolutionsListPage />}
                  />
                  <Route
                    path="/invoicing/resolutions/new"
                    element={<ResolutionFormPage />}
                  />

                  <Route
                    path="/invoicing/payroll-entries"
                    element={<PayrollListPage />}
                  />
                  <Route
                    path="/invoicing/payroll-entries/new"
                    element={<PayrollFormPage />}
                  />

                  <Route
                    path="/departments"
                    element={
                      <LookupListPage
                        resource="departments"
                        title="Departamentos"
                        newLabel="+ Nuevo"
                        basePath="/departments"
                        itemLabelSingular="departamento"
                      />
                    }
                  />
                  <Route
                    path="/departments/new"
                    element={
                      <LookupFormPage
                        resource="departments"
                        title="departamento"
                        basePath="/departments"
                      />
                    }
                  />
                  <Route
                    path="/departments/:id/edit"
                    element={
                      <LookupFormPage
                        resource="departments"
                        title="departamento"
                        basePath="/departments"
                      />
                    }
                  />

                  <Route
                    path="/groups"
                    element={
                      <LookupListPage
                        resource="groups"
                        title="Grupos"
                        newLabel="+ Nuevo"
                        basePath="/groups"
                        itemLabelSingular="grupo"
                      />
                    }
                  />
                  <Route
                    path="/groups/new"
                    element={
                      <LookupFormPage resource="groups" title="grupo" basePath="/groups" />
                    }
                  />
                  <Route
                    path="/groups/:id/edit"
                    element={
                      <LookupFormPage resource="groups" title="grupo" basePath="/groups" />
                    }
                  />

                  <Route
                    path="/brands"
                    element={
                      <LookupListPage
                        resource="brands"
                        title="Marcas"
                        newLabel="+ Nuevo"
                        basePath="/brands"
                        itemLabelSingular="marca"
                      />
                    }
                  />
                  <Route
                    path="/brands/new"
                    element={
                      <LookupFormPage resource="brands" title="marca" basePath="/brands" />
                    }
                  />
                  <Route
                    path="/brands/:id/edit"
                    element={
                      <LookupFormPage resource="brands" title="marca" basePath="/brands" />
                    }
                  />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Routes>
        </InvoiceDraftsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
