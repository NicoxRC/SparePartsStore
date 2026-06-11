
## 1. Overview

CasaRespuestos is a spare parts inventory management system for a physical store. The system allows staff to load, manage, and maintain a product inventory from mobile devices, and export data in a format compatible with **Sisco** (external invoicing and inventory software).

---

## 2. Goals

- Replace the previous version (CRA + unstructured backend) with a modern, maintainable stack.
- Enable fast product entry from mobile devices.
- Generate Excel files in the exact format required by Sisco for initial inventory import.
- Serve as the source of truth for inventory after the initial Sisco import.

---

## 3. Tech Stack

|Layer|Technology|
|---|---|
|Frontend|React + Vite + Tailwind CSS|
|Backend|NestJS + TypeORM|
|Database|PostgreSQL|
|Auth|Passport.js + JWT|
|Deploy FE|Vercel|
|Deploy BE|Railway|
|Deploy DB|Railway (PostgreSQL)|
|Excel|exceljs (backend)|

---

## 4. Users & Roles

|Role|Permissions|
|---|---|
|Admin|Full access: users, products, departments/groups/brands, export, config|
|Employee|Create and edit products, view inventory|

---

## 5. Functional Requirements

### 5.1 Authentication

- [ ] User login with email and password
- [ ] JWT-based session (access token + refresh token)
- [ ] Protected routes on both frontend and backend
- [ ] Logout invalidates session

### 5.2 User Management _(Admin only)_

- [ ] Create, edit, and deactivate users
- [ ] Assign roles (admin / employee)
- [ ] Users cannot delete themselves

### 5.3 Product Management

- [ ] Create product with: reference/SKU, description, cost, sale price,
      department (Departamento), group (Grupo), brand (Marca)
- [ ] Edit existing products
- [ ] Soft delete products (deactivate, not hard delete)
- [ ] Search and filter products (by reference, description, department,
      group, brand)
- [ ] View product detail
- [ ] Audit fields on all records: `createdAt`, `updatedAt`, `createdBy`

> **Superseded**: earlier drafts of this section referenced `name`, `unit of
> measure`, `stock quantity`, and `minimum stock alert` as product fields,
> and `category`/`brand` as classification. `unit of measure`, `stock
> quantity`, and `minimum stock alert` belong to the `inventory` module
> (§5.6) and are tracked separately, not as `Product` columns. See §5.4 for
> the current classification model.

### 5.4 Product Classification — Department / Group / Brand

The original "Category" and "Brand" lookup-table concept (previously §5.4
and §5.5) is **replaced** by three required classification lookups, each
with its own admin-managed catalog:

- **Department** (Departamento)
- **Group** (Grupo)
- **Brand** (Marca) — replaces the former "Línea" concept entirely; línea is
  not modeled separately

Rules (apply identically to all three):

- [ ] Admins can create, edit, and deactivate department/group/brand entries
- [ ] Every product must reference exactly one department, one group, and
      one brand (all three required, non-nullable)
- [ ] All authenticated users (admin and employee) can list
      departments/groups/brands to populate product forms
- [ ] Each entry has a short `code` (unique among active entries) and a
      display `name`

See `docs/Schema.md` §3-§7 and `docs/ApiContract.md` §6-§7 for the schema and
API contract.

### 5.6 Inventory

- [ ] View current stock per product
- [ ] Manual stock adjustment with reason (entry, exit, correction)
- [ ] Stock movement history per product
- [ ] Low stock alerts (when quantity <= minimum stock)

### 5.7 Excel Export (Sisco format)

- [ ] Export full inventory as `.xlsx` file
- [ ] File format defined by Sisco requirements (columns TBD with client)
- [ ] Export triggered from frontend, generated entirely on backend
- [ ] Option to export all products or filtered subset

### 5.8 Dashboard _(nice to have)_

- [ ] Total products count
- [ ] Low stock alerts summary
- [ ] Recent activity feed

---

## 6. Non-Functional Requirements

### 6.1 Mobile First

- All screens must be fully usable on mobile devices (Android priority)
- Large tap targets, thumb-friendly layouts
- Forms optimized for speed: minimal required fields, clear validation errors

### 6.2 Performance

- Product list must load in under 2 seconds on a standard mobile connection
- Pagination or infinite scroll on product lists

### 6.3 Security

- Passwords hashed with bcrypt
- JWT tokens with expiration
- Role-based guards on all backend endpoints
- No sensitive data exposed in API responses

### 6.4 Data Integrity

- Soft deletes on all entities (no hard deletes in production)
- All entities have `createdAt`, `updatedAt` timestamps
- All mutations record `createdBy` / `updatedBy` user reference
- Normalized database schema (3NF minimum)

### 6.5 Reliability

- Input validation on both frontend (Zod) and backend (class-validator)
- Meaningful error messages returned to the client
- Loading and error states on all async operations in the UI

---

## 7. Out of Scope (v1)

- Direct API integration with Sisco (export via Excel only)
- Native mobile app (PWA / responsive web is sufficient)
- Barcode scanning
- Multi-store / multi-branch support
- Purchase orders or supplier management
- Customer management

---

## 8. Open Questions

- [ ] What are the exact columns and format required by Sisco in the Excel file?
- [ ] Are there existing product codes/SKUs to migrate or everything starts from scratch?
- [ ] How many concurrent users are expected?
- [ ] Should employees be able to adjust stock or only admins?
- [ ] Is a minimum stock alert just visual or should it send a notification (email/push)?

---

## 9. Folder Structure

```
CasaRespuestos/
├── apps/
│   ├── backend/              # NestJS
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── brands/
│   │   │   ├── inventory/
│   │   │   ├── export/
│   │   │   └── common/
│   │   └── ...
│   └── frontend/             # React + Vite
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── layouts/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── lib/
│       └── ...
├── docs/
│   ├── REQUIREMENTS.md       ← this file
│   └── SCHEMA.md             ← pending
├── docker-compose.yml
└── README.md
```

---

## 10. Version History

|Version|Date|Description|
|---|---|---|
|1.0|2026-06-03|Initial requirements doc|
|1.1|2026-06-10|Replaced category/brand lookup model (§5.4-5.5) with required Department/Group/Brand classification (§5.4); brand (Marca) replaces línea|