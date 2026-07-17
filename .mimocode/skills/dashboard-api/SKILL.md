# dashboard-api

Test Solar Dashboard backend API endpoints with automatic JWT authentication.

## When to use

- Testing any `/api/*` endpoint on the Dashboard backend (port 5000)
- Verifying new routes, checking response shapes, debugging 4xx/5xx errors
- Quick CRUD validation without opening the frontend

## Prerequisites

- Backend running on `http://localhost:5000` (use `/dashboard-services` skill if not)
- Default credentials: `admin` / `admin`

## Workflow

### 1. Get auth token (one-liner)

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body '{"username":"admin","password":"admin"}' -ContentType "application/json"; $token = $login.token
```

### 2. Test an endpoint

```powershell
# GET with auth
Invoke-RestMethod -Uri "http://localhost:5000/api/projects?limit=5" -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json -Depth 5

# POST with auth
Invoke-RestMethod -Uri "http://localhost:5000/api/permit-tracking" -Method POST -Body '{"service_type":"document_only"}' -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json -Depth 5

# PUT with auth
Invoke-RestMethod -Uri "http://localhost:5000/api/projects/<id>" -Method PUT -Body '{"status":"checking"}' -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json -Depth 5
```

### 3. Check health (no auth needed)

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

## Key endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check (no auth) |
| `/api/auth/login` | POST | Login, returns JWT |
| `/api/projects` | GET | List projects (supports `?page=&limit=`) |
| `/api/projects/<id>` | GET | Get single project |
| `/api/permit-tracking` | GET | Excel-compatible permit status |
| `/api/doc-review/template-checklists` | GET | Checklist templates |
| `/api/doc-review/template-checklists/agencies` | GET | Available agencies |
| `/api/doc-review/template-checklists/permit-types` | GET | Permit types by agency |
| `/api/projects/stats/permit-summary` | GET | Permit summary stats |
| `/api/backup/settings` | GET | Backup settings |

## Common gotchas

- **429 Rate Limited**: Login limiter is 20 req/15 min. If blocked, wait or restart backend.
- **401 Unauthorized**: Token expired or missing `Bearer` prefix.
- **500 Internal Server Error**: Backend may need restart after route changes (`node.js` caches modules).
- **CORS error**: Usually means backend is down, not a CORS config issue.
- **404 on new routes**: Confirm route is registered in `backend/src/index.js` with `app.use(...)`.

## Anti-patterns

- Don't hardcode tokens across sessions — tokens expire. Get a fresh one each time.
- Don't test production DB — use dev mode (port 5000).
- Don't forget `Content-Type: application/json` on POST/PUT.
