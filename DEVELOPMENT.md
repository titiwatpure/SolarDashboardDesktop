# Solar Dashboard - Development Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages:                                               │   │
│  │  - Dashboard (KPI, Pipeline, Projects Table)          │   │
│  │  - Projects (CRUD operations)                         │   │
│  │  - Organizations                                      │   │
│  │  - Documents                                          │   │
│  │  - Reports                                            │   │
│  │  - Users                                              │   │
│  │  - Settings                                           │   │
│  │  - Steps/Pipeline                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  (REST API via Axios)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes:                                              │   │
│  │  - /api/auth (login, register)                        │   │
│  │  - /api/projects (CRUD + KPI + stats)                 │   │
│  │  - /api/users (manage users)                          │   │
│  │  - /api/documents (manage files)                      │   │
│  │  - /api/organizations (manage orgs)                   │   │
│  │  - /api/reports (analytics)                           │   │
│  │                                                        │   │
│  │  Middleware:                                          │   │
│  │  - Authentication (JWT)                               │   │
│  │  - Authorization (Role-based)                         │   │
│  │  - Error handling                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tables:                                              │   │
│  │  - users                                              │   │
│  │  - projects                                           │   │
│  │  - project_steps                                      │   │
│  │  - organizations                                      │   │
│  │  - documents                                          │   │
│  │  - project_organizations                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Code Structure

### Frontend Structure
```
frontend/
├── public/
│   └── index.html           # HTML main file
├── src/
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Projects.jsx
│   │   ├── Organizations.jsx
│   │   ├── Documents.jsx
│   │   ├── Reports.jsx
│   │   ├── Users.jsx
│   │   ├── Settings.jsx
│   │   ├── Steps.jsx
│   │   └── Login.jsx
│   ├── components/          # Reusable components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── KPICards.jsx
│   │   ├── Pipeline.jsx
│   │   ├── ProjectsTable.jsx
│   │   ├── FilterPanel.jsx
│   │   └── ProjectModal.jsx
│   ├── utils/               # Utility functions
│   │   ├── api.js          # API calls
│   │   └── constants.js    # Constants and labels
│   ├── styles/              # CSS files
│   │   └── index.css
│   ├── App.jsx             # Main app component
│   └── index.js            # Entry point
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

### Backend Structure
```
backend/
├── src/
│   ├── routes/              # API route handlers
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── users.js
│   │   ├── documents.js
│   │   ├── organizations.js
│   │   └── reports.js
│   ├── models/              # Data models & database
│   │   └── database-schema.sql
│   ├── middleware/          # Middleware functions
│   │   └── auth.js
│   ├── controllers/         # Business logic (future use)
│   ├── database.js         # Database connection
│   └── index.js            # Server entry point
├── package.json
└── .env.example
```

## Key Features Implementation

### 1. Authentication System
```javascript
// JWT Token Flow:
// 1. User login with credentials
// 2. Backend validates and generates JWT
// 3. Frontend stores token in localStorage
// 4. Token sent with every API request in Authorization header
// 5. Backend verifies token before processing request
```

### 2. Project Status Logic
```javascript
// Automatic status determination:
const determineStatus = (project) => {
  if (project.current_step === 'cod' && project.actual_cod_date) {
    return 'completed';
  }
  
  const daysSinceUpdate = (Date.now() - project.updated_at) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > 14) {
    return 'blocked';
  }
  
  return project.status;
};
```

### 3. Permit Type Determination
```javascript
// Based on size and power selling:
const determinePermitType = (sizeKva, hasPowerSelling) => {
  if (hasPowerSelling || sizeKva > 1000) {
    return 'permit';        // ขอใบอนุญาต
  }
  return 'exemption';       // แจ้งยกเว้น
};
```

### 4. Role-Based Access Control
```javascript
// Admin can:
// - View all projects
// - Edit all projects
// - Manage users
// - Manage organizations
// - Generate reports

// Engineer can:
// - View projects
// - Edit assigned projects
// - Upload documents
// - View reports
```

## Database Design

### Key Tables

**users**
- id (UUID, PK)
- username (VARCHAR, UNIQUE)
- email (VARCHAR, UNIQUE)
- password (VARCHAR, hashed)
- full_name (VARCHAR)
- role (VARCHAR) - 'admin' or 'engineer'
- status (VARCHAR) - 'active' or 'inactive'

**projects**
- id (UUID, PK)
- project_name (VARCHAR)
- project_code (VARCHAR, UNIQUE)
- size_kw (DECIMAL)
- size_kva (DECIMAL)
- province (VARCHAR)
- status (VARCHAR) - 'pending', 'in_progress', 'blocked', 'completed'
- current_step (VARCHAR) - 'survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'
- has_power_selling (BOOLEAN)
- permit_type (VARCHAR) - 'exemption' or 'permit'

**organizations**
- id (UUID, PK)
- org_name (VARCHAR, UNIQUE)
- org_type (VARCHAR) - organization type
- status (VARCHAR)

**documents**
- id (UUID, PK)
- project_id (UUID, FK)
- document_name (VARCHAR)
- document_type (VARCHAR) - 'sld', 'permit', 'test_report', etc
- file_path (VARCHAR)

## API Response Format

### Success Response
```json
{
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Response
```json
{
  "error": "Error message",
  "message": "Detailed error message"
}
```

## Testing

### Unit Tests (Future)
```bash
npm test
```

### API Testing with Postman
- Import API collection
- Set environment variables
- Run tests

## Performance Optimization

### Frontend
- Implement React.memo for components
- Use useCallback for functions
- Implement lazy loading
- Code split with React.lazy()

### Backend
- Add database indexes on frequently queried columns
- Implement caching with Redis
- Use connection pooling
- Optimize queries

## Security Best Practices

1. **Input Validation**
   - Validate all user inputs
   - Sanitize file uploads

2. **SQL Injection Prevention**
   - Use parameterized queries (already implemented)

3. **XSS Prevention**
   - Escape user input
   - Use Content Security Policy

4. **CSRF Protection**
   - Implement CSRF tokens

5. **Authentication**
   - Use JWT with expiration
   - Store secure tokens only

6. **Authorization**
   - Implement role-based access control
   - Check permissions on backend

## Adding New Features

### Example: Adding a new page

1. **Create page component**
   ```javascript
   // frontend/src/pages/NewPage.jsx
   export default function NewPage() {
     return <div>New Page</div>;
   }
   ```

2. **Add route to Sidebar**
   ```javascript
   // frontend/src/components/Sidebar.jsx
   const menuItems = [
     // ...
     { id: 'new', label: 'New Page', icon: Icon, path: '/new' },
   ];
   ```

3. **Add API endpoint**
   ```javascript
   // backend/src/routes/newfeature.js
   router.get('/', authenticateToken, async (req, res) => {
     // Handle request
   });
   ```

4. **Create API call in frontend**
   ```javascript
   // frontend/src/utils/api.js
   export const newFeatureAPI = {
     getAll: () => apiCall('GET', '/newfeature'),
   };
   ```

## Debugging Tips

### Frontend
- Use React DevTools browser extension
- Check Network tab in Developer Tools
- Use console.log() for debugging
- Check localStorage for tokens

### Backend
- Use `console.log()` for logging
- Check error stack traces
- Use Postman for API testing
- Monitor database with psql

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Token expired | Re-login or refresh token |
| CORS error | Check CORS_ORIGIN in .env |
| Database connection failed | Check DB credentials and connection |
| Port already in use | Kill process or use different port |

---

**Happy Coding! 🚀**
