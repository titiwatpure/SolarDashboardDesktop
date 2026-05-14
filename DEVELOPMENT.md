# Solar Dashboard - Development Guide

## Architecture Overview

```
Frontend (React 18 + Tailwind)
    |
    | REST API (Axios + auto token refresh)
    v
Backend (Express.js + SQLite)
    |
    v
solar_dashboard.db (file-based)
```

## Code Structure

### Frontend
```
frontend/src/
├── context/
│   └── AuthContext.jsx      # Global auth state (useAuth hook)
├── components/
│   ├── Header.jsx           # Top header + notification badge
│   ├── Sidebar.jsx          # Navigation sidebar (dark theme)
│   ├── KPICards.jsx         # 8 Dashboard KPI cards
│   ├── Pipeline.jsx         # Step pipeline + pie chart
│   ├── ProjectsTable.jsx    # Paginated project list
│   ├── ProjectModal.jsx     # Create/edit project form
│   ├── StatusModal.jsx      # Update project step/status
│   ├── RiskBadge.jsx        # Risk level badge (low/medium/high/critical)
│   ├── Toast.jsx            # Toast notification system
│   └── ErrorBoundary        # Inline in App.jsx (crash recovery)
├── hooks/
│   ├── useAccounting.js     # useAccountingOverview, useProjectAccounting, useInstallments
│   ├── useSettings.js       # useProfileEdit, useCompanySettings, useBackupManagement
│   └── useProjectDetail.js  # useProjectDetail, useProjectCheckpoints
├── pages/
│   ├── Login.jsx            # /login
│   ├── Dashboard.jsx        # / (KPI + Pipeline)
│   ├── Projects.jsx         # /projects (list + filter + pagination)
│   ├── ProjectDetail.jsx    # /projects/:id (detail + checkpoints + timeline)
│   ├── ProjectReport.jsx    # /projects/:id/report (single project report)
│   ├── Steps.jsx            # /steps (pipeline visualization)
│   ├── Tasks.jsx            # /tasks (task management)
│   ├── Documents.jsx        # /documents (file management)
│   ├── Organizations.jsx    # /organizations
│   ├── Customers.jsx        # /customers (customer management)
│   ├── Reports.jsx          # /reports (10 report sections)
│   ├── Users.jsx            # /users (admin)
│   ├── Settings.jsx         # /settings (profile + password + company)
│   ├── Contracts.jsx        # /contracts (contract management)
│   ├── Accounting.jsx       # /accounting (finance + installments)
│   ├── CustomerPortal.jsx   # /portal (customer self-service)
│   └── NetworkMap.jsx       # /map (project locations)
├── utils/
│   ├── api.js               # Axios wrapper + auto token refresh interceptor
│   ├── constants.js         # Labels, provinces, enums (Thai)
│   └── thaiFont.js          # Sarabun font base64 for PDF export
├── styles/
│   └── index.css            # Tailwind imports
├── App.jsx                  # Router + AuthProvider (code splitting via React.lazy)
└── index.js                 # Entry point
```

### Backend
```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.js          # Login + Register + Refresh Token + Logout All
│   │   ├── projects.js      # Projects CRUD + KPI + Timeline + Organizations
│   │   ├── users.js         # Users CRUD + Change Password
│   │   ├── documents.js     # Documents + File Upload (multer)
│   │   ├── organizations.js # Organizations CRUD + Projects link
│   │   ├── customers.js     # Customers CRUD + Projects link
│   │   ├── reports.js       # 10 aggregation reports
│   │   ├── tasks.js         # Task management + Notifications
│   │   ├── notifications.js # Notification CRUD
│   │   ├── activity_logs.js # Audit logging (severity levels)
│   │   ├── checkpoints.js   # Checkpoint CRUD + Approve + Logs
│   │   ├── backup.js        # Database backup/restore (Admin)
│   │   ├── contracts.js     # Contracts CRUD
│   │   ├── accounting.js    # Categories + Transactions + Installments
│   │   ├── portal.js        # Customer portal (read-only)
│   │   └── settings.js      # Company settings
│   ├── services/
│   │   └── riskDetection.js # Automated risk scoring engine (5 factors)
│   ├── middleware/
│   │   └── auth.js          # JWT authenticateToken + authorizeRole + authorizePermission
│   ├── migrations/
│   │   ├── runner.cjs       # Migration runner with version tracking
│   │   └── 001_initial_schema.cjs  # Initial column additions
│   ├── models/
│   │   ├── database-schema.sql  # Schema reference (SQLite)
│   │   └── seed-data.sql        # Seed organizations
│   ├── utils/
│   │   └── errors.js        # Custom AppError class
│   ├── database.js          # SQLite connection + pool.query() interface
│   ├── init-db.cjs          # DB init + seed (22 tables)
│   └── index.js             # Express server entry
├── uploads/                 # Uploaded files (auto-created)
├── __tests__/               # Jest + Supertest tests
│   ├── health.test.js
│   ├── auth.test.js
│   ├── projects.test.js
│   └── organizations.test.js
├── Dockerfile
└── package.json
```

## Key Features Implementation

### 1. Authentication System
```
Login Flow:
1. POST /api/auth/login { username, password }
2. Backend validates -> bcrypt compare -> generate JWT (15min) + refresh token (30 days)
3. Frontend stores tokens
4. Every request: Authorization: Bearer <accessToken>
5. On 401: auto refresh token (queue system for concurrent requests)
6. On logout: invalidate refresh token
7. On logout-all: invalidate all refresh tokens for the user
```

### 2. File Upload (multer)
```
POST /api/documents
Content-Type: multipart/form-data

Fields: file, project_id, document_name, document_type, description

- Files stored in backend/uploads/{project_id}/
- Max size: 50MB
- Allowed: PDF, Word, Excel, PowerPoint, images, ZIP/RAR
- Download: GET /api/documents/download/:id
```

### 3. Notification System
```
Auto-created on:
- Project status change
- Task assignment/completion
- Timeline comment (notifies creator + responsible user + previous commenters)
- Checkpoint failure

Header polls GET /api/notifications/unread-count every 30s
Badge shows unread count (hides when 0)
Mark as read: PUT /api/notifications/:id/read
Mark all as read: PUT /api/notifications/read-all
```

### 4. Risk Detection Service
```
Automated risk scoring with 5 weighted factors:
- Delay factor (0-40 pts): elapsed time vs expected COD
- Blockage factor (0-40 pts): days in blocked status
- Checkpoint failure factor (0-30 pts): failed checkpoint count
- Overdue tasks factor (0-20 pts): overdue task count
- Status factor (0-20 pts): rejected status

Risk levels: low (<25), medium (25-49), high (50-79), critical (80+)
Recalculated on: project update, checkpoint status change
```

### 5. Checkpoint System
```
Auto-created checkpoints per step:
- Survey: 3 checkpoints
- Design: 3 checkpoints
- ERC: 2 checkpoints
- Grid: 3 checkpoints
- Construction: 4 checkpoints
- Testing: 3 checkpoints
- COD: 3 checkpoints

Workflow: pending -> passed / failed / skipped
Logs: checkpoint_logs table records all changes
Timeline integration: checkpoint changes added to project timeline
Risk integration: failed checkpoints increase risk score
```

### 6. Customer & Project Extended Data
```
Customers Table:
- customer_name (required), customer_type (individual/company/government)
- contact_name, contact_phone, contact_email, tax_id, address, notes
- Linked to projects via customer_id FK (optional)

Project Extended Fields:
- customer_id -> customers (optional)
- site_address, site_lat, site_lng (optional)
- grid_station, grid_voltage (optional)
- contract_number, contract_value, contract_date, budget (optional)

Project Specs Table (1:1 with project):
- panel_brand, panel_model, panel_count
- inverter_brand, inverter_model, inverter_count
- mounting_type (roof/ground/floating), grid_connection_type

All fields are optional (nullable).
```

### 7. Quotations & Contracts
```
Quotations:
- CRUD with status workflow: draft -> sent -> approved/rejected/expired
- Line items (quotation_items) with quantity, unit_price, amount
- Auto-calculate subtotal, tax (7%), total_amount
- Linked to customer + project (optional)

Contracts:
- CRUD with status: draft -> active -> completed/terminated
- Linked to project (unique) + customer (optional)
- Track start_date, end_date, signed_date, total_value
```

### 8. Accounting System
```
3 Tables:
- accounting_categories: income/expense categories with icons
- transactions: financial records linked to project (optional) + category
- payment_installments: installment plans linked to project + contract (optional)

Installment Flow:
- Bulk create from contract (e.g., 30-30-40 or 50-50 templates)
- Pay: full or partial -> auto-create income transaction
- Status: pending -> partial -> paid (or overdue)
- Delete protection: can't delete installment with linked transaction
- Due date is optional (null = "ยังไม่กำหนด")
```

### 9. Global State (AuthContext)
```javascript
const { user, login, logout, changePassword, isAdmin } = useAuth();
// wrapped in useMemo for performance
```

### 10. Refresh Token
```
- Access token: 15 minutes
- Refresh token: 30 days (stored in DB)
- Token rotation: old refresh token invalidated on use
- Auto-cleanup of expired tokens
- Login rate limiting: 20 attempts per 15 minutes
```

## Database Schema

### Tables (22)
- `users` - System users (admin/engineer/staff/client) with granular permissions
- `projects` - Solar installation projects with risk tracking, scope_start/scope_end, customer/site/contract fields
- `customers` - Customer data (individual/company/government) with contact info
- `project_specs` - Technical specs per project (panels, inverters, mounting type)
- `organizations` - Government/utility entities
- `project_steps` - Individual step tracking
- `documents` - Document metadata with file upload
- `project_organizations` - Many-to-many links with approval workflow (pending/approved/rejected)
- `project_timeline` - Step/status change history
- `timeline_comments` - Comments on timeline entries
- `reports` - Saved reports
- `activity_logs` - System audit log with severity levels (info/warning/error)
- `tasks` - Per-project tasks with priority and assignment
- `notifications` - In-app notifications
- `refresh_tokens` - JWT refresh tokens
- `checkpoints` - Verification checkpoints per workflow step
- `checkpoint_logs` - Checkpoint change history
- `quotations` - Quotations with status workflow
- `quotation_items` - Line items per quotation
- `contracts` - Contracts linked to projects
- `accounting_categories` - Income/expense categories
- `transactions` - Financial transactions
- `payment_installments` - Installment payments with partial support
- `company_settings` - Key-value company info

### Indexes (26)
Covering all foreign keys and frequently queried columns including risk_level, severity, approval_status, and checkpoint fields.

## API Response Format

### Success
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error
```json
{
  "error": "ข้อความ error ภาษาไทย"
}
```

## Testing

```bash
cd backend
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

Tests use Jest + Supertest against the real SQLite database.

## Adding New Features

### New Page
1. Create `frontend/src/pages/NewPage.jsx`
2. Add route in `App.jsx`: `<Route path="/new" element={<NewPage />} />`
3. Add menu item in `Sidebar.jsx`

### New API Endpoint
1. Create `backend/src/routes/newfeature.js`
2. Register in `backend/src/index.js`: `app.use('/api/newfeature', require('./routes/newfeature'))`
3. Add client in `frontend/src/utils/api.js`

### New Context
1. Create `frontend/src/context/NewContext.jsx`
2. Wrap in `App.jsx` with `<NewProvider>`

## Security

- JWT HS256, access token 15min, refresh token 30 days
- Token rotation on refresh
- bcrypt 12 rounds
- Rate limiting: 200 req/min general, 20 req/15min login
- Helmet security headers
- CORS restricted to configured origin
- Parameterized SQL queries (no injection)
- File upload: type filter + size limit (50MB)
- Role-based access: admin (full), engineer (read + create/update), staff (limited), client (read-only)
- Permission-based authorization with granular permissions (e.g., project.create, checkpoint.approve, approval.manage)
- Activity logging with severity levels and IP tracking

## Debugging

### Frontend
- React DevTools browser extension
- Network tab for API calls
- Check localStorage for tokens

### Backend
- `console.log()` for logging
- Check error stack traces
- Use Postman or curl for API testing
- SQLite browser for database inspection
