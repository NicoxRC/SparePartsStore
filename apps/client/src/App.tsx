import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AuthLayout } from './layouts/AuthLayout';
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout';
import { CatalogsPage } from './pages/CatalogsPage';
import { LoginPage } from './pages/LoginPage';
import { LookupFormPage } from './pages/LookupFormPage';
import { LookupListPage } from './pages/LookupListPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { ProductsListPage } from './pages/ProductsListPage';
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
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedLayout />}>
                <Route path="/products" element={<ProductsListPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/:id/edit" element={<ProductFormPage />} />

                <Route element={<AdminRoute />}>
                  <Route path="/users" element={<UsersListPage />} />
                  <Route path="/users/new" element={<UserFormPage />} />
                  <Route path="/users/:id/edit" element={<UserFormPage />} />

                  <Route path="/catalogs" element={<CatalogsPage />} />

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
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
