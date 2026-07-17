# dashboard-services

Start, stop, restart, and monitor Solar Dashboard backend (port 5000) and frontend (port 3000) services.

## When to use

- Starting/stopping the dev environment
- Restarting backend after route or module changes (Node.js caches routes)
- Checking if services are running
- Opening mockup HTML preview files

## Quick reference

### Start all services

```powershell
# Backend
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d E:\Dashboard\backend && node src/index.js" -WindowStyle Minimized -PassThru | Select-Object Id

# Frontend
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d E:\Dashboard\frontend && npm start" -WindowStyle Minimized -PassThru | Select-Object Id
```

Or use the batch script: `start-all.bat` from project root.

### Stop all services

```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

Or use: `stop-all.bat` from project root.

### Restart backend (after route changes)

```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d E:\Dashboard\backend && node src/index.js" -WindowStyle Minimized -PassThru | Select-Object Id
```

### Check if services are running

```powershell
# Backend (port 5000)
netstat -ano | findstr ":5000" | findstr "LISTENING"

# Frontend (port 3000)
netstat -ano | findstr ":3000" | findstr "LISTENING"

# Quick health check
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

### Open mockup preview

```powershell
Start-Process "E:\Dashboard\mockups\<filename>.html"
```

## Critical rules

- **Always restart backend after route changes** — Node.js caches route modules. This is the #1 source of "why isn't my new endpoint working?"
- **Use `-WindowStyle Minimized`** with `cmd /c` for background execution. `cmd /k` keeps window open and blocks terminal.
- **Don't run Electron production build alongside dev backend** — both use port 5000 internally.

## Batch scripts

| Script | Purpose |
|--------|---------|
| `start-all.bat` | Start backend + frontend, open browser |
| `stop-all.bat` | Kill all service processes |
| `start.bat` | Start backend only |
| `stop.bat` | Stop backend only |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Port 5000 in use | `Stop-Process -Name "node" -Force` then restart |
| CORS error in browser | Backend is down — restart it |
| New route returns 404 | Restart backend (module cache) |
| `npm start` fails | Check `frontend/node_modules` exists, run `npm install` |
