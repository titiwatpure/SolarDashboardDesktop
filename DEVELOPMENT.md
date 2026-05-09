# Solar Dashboard - Development Guide

## Architecture Overview

```
Frontend (React 18 + Tailwind)
    |
    | REST API (Axios)
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
│   ├── KPICards.jsx         # Dashboard KPI cards
│   ├── Pipeline.jsx         # Step pipeline + pie chart
│   ├── ProjectsTable.jsx    # Paginated project list
│   ├── ProjectModal.jsx     # Create/edit project form
│   ├── StatusModal.jsx      # Update project step/status
│   └── ErrorBoundary        # Inline in App.jsx (crash recovery)
├── pages/
│   ├── Login.jsx            # Login page
│   ├── Dashboard.jsx        # Main dashboard
│   ├── Projects.jsx         # Projects list
│   ├── ProjectDetail.jsx    # Single project detail
│   ├── Organizations.jsx    # Organization CRUD
│   ├── Documents.jsx        # Document upload/management
│   ├── Reports.jsx          # Charts + Excel/PDF export
│   ├── Users.jsx            # User management (Admin)
│   ├── Steps.jsx            # Workflow visualization
│   └── Settings.jsx         # Profile + password change
├── utils/
│   ├── api.js               # Axios wrapper + API clients
│   └── constants.js         # Labels, provinces, enums
├── styles/
│   └── index.css            # Tailwind imports
├── App.jsx                  # Router + AuthProvider
└── index.js                 # Entry point
```

### Backend
```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.js          # Login + Register + Refresh Token
│   │   ├── projects.js      # Projects CRUD + KPI + Timeline
│   │   ├── users.js         # Users CRUD + Change Password
│   │   ├── documents.js     # Documents + File Upload (multer)
│   │   ├── organizations.js # Organizations CRUD
│   │   ├── reports.js       # Aggregation reports
│   │   ├── tasks.js         # Task management
│   │   ├── notifications.js # Notification system
│   │   └── activity_logs.js # Audit logging
│   ├── middleware/
│   │   └── auth.js          # JWT authenticateToken + authorizeRole
│   ├── models/
│   │   ├── database-schema.sql  # Schema reference (SQLite)
│   │   └── seed-data.sql        # Seed organizations
│   ├── database.js          # SQLite connection + pool.query()
│   ├── init-db.cjs          # DB init + seed script
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
5. On 401: use refresh token to get new access token
6. On logout: invalidate refresh token
```

### 2. File Upload (multer)
```
POST /api/documents
Content-Type: multipart/form-data

Fields: file, project_id, document_name, document_type, description

- Files stored in backend/uploads/{project_id}/
- Max size: 50MB
- Allowed: PDF, Word, Excel, PowerPoint, images, ZIP
- Download: GET /api/documents/download/:id
```

### 3. Notification System
```
- Auto-created on: project status change, task assignment
- Header polls GET /api/notifications/unread-count every 30s
- Badge shows unread count (hides when 0)
- Mark as read: PUT /api/notifications/:id/read
```

### 4. Global State (AuthContext)
```javascript
const { user, login, logout, changePassword, isAdmin } = useAuth();
```

### 5. Refresh Token
```
- Access token: 15 minutes
- Refresh token: 30 days (stored in DB)
- Token rotation: old refresh token invalidated on use
- Auto-cleanup of expired tokens
```

## Database Schema

### Tables (12)
- `users` - System users (admin/engineer)
- `projects` - Solar installation projects
- `organizations` - Government/utility entities
- `project_steps` - Individual step tracking
- `documents` - Document metadata
- `project_organizations` - Many-to-many links
- `project_timeline` - Step/status change history
- `reports` - Saved reports
- `activity_logs` - System audit log
- `tasks` - Per-project tasks
- `notifications` - In-app notifications
- `refresh_tokens` - JWT refresh tokens

### Indexes (18+)
Covering all foreign keys and frequently queried columns.

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
- bcrypt 12 rounds
- Rate limiting: 200 req/min general, 20 req/15min login
- Helmet security headers
- CORS restricted to configured origin
- Parameterized SQL queries (no injection)
- File upload: type filter + size limit (50MB)
- Role-based access: admin (full), engineer (read + create/update)

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
