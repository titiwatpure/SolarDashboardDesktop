const Module = require('module');
const _originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'sqlite3') {
    return require('path').join(__dirname, 'sqlite3-compat.cjs');
  }
  return _originalResolve.call(this, request, parent, isMain, options);
};

const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

// IPC: expose app version to renderer
ipcMain.handle('get-app-version', () => app.getVersion());

// ──────────────────────────────────────────────
// 1. Resolve all data paths to userData
// ──────────────────────────────────────────────
const userData = app.getPath('userData');
const dbPath = path.join(userData, 'solar_dashboard.db');
const uploadsDir = path.join(userData, 'uploads');
const backupsDir = path.join(userData, 'backups');

const isPackaged = app.isPackaged;
const frontendBuild = isPackaged
  ? path.join(process.resourcesPath, 'app', 'frontend', 'build')
  : path.join(__dirname, '..', 'frontend', 'build');

// ──────────────────────────────────────────────
// 2. Set environment variables BEFORE any require()
// ──────────────────────────────────────────────
process.env.DB_PATH = dbPath;
process.env.UPLOADS_DIR = uploadsDir;
process.env.BACKUPS_DIR = backupsDir;
process.env.FRONTEND_BUILD_DIR = frontendBuild;
process.env.PORT = '5000';
process.env.NODE_ENV = 'production';
process.env.CORS_ORIGIN = 'http://localhost:5000';
process.env.ELECTRON_MODE = '1';
process.env.ACCESS_TOKEN_EXPIRY = '15m';
process.env.REFRESH_TOKEN_EXPIRY_DAYS = '30';

// JWT_SECRET: generate on first run, persist in userData
const jwtSecretPath = path.join(userData, '.jwt-secret');
if (fs.existsSync(jwtSecretPath)) {
  process.env.JWT_SECRET = fs.readFileSync(jwtSecretPath, 'utf8').trim();
} else {
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(jwtSecretPath, secret, 'utf8');
  process.env.JWT_SECRET = secret;
}

// ──────────────────────────────────────────────
// 2b. Auto-updater (electron-updater)
// ──────────────────────────────────────────────
let updateDownloaded = false;

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'available', version: info.version });
    }
    dialog.showMessageBox({
      type: 'info',
      title: 'มีเวอร์ชันใหม่',
      message: `Solar Dashboard v${info.version}`,
      detail: 'ต้องการดาวน์โหลดเวอร์ชันใหม่หรือไม่?',
      buttons: ['ดาวน์โหลด', 'ภายหลัง'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadProgressChanged = (progress) => {
          if (mainWindow) {
            mainWindow.setProgressBar(progress.percent / 100);
          }
        };
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('App is up to date.');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'downloading', percent: Math.round(progress.percent) });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
      mainWindow.webContents.send('update-status', { status: 'downloaded', version: info.version });
    }
    dialog.showMessageBox({
      type: 'info',
      title: 'ดาวน์โหลดเสร็จสิ้น',
      message: `พร้อมติดตั้ง v${info.version}`,
      detail: 'ต้องการรีสตาร์ทเพื่อติดตั้งตอนนี้หรือไม่?',
      buttons: ['รีสตาร์ท', 'ภายหลัง'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'error', message: err.message });
    }
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
    }
  });
}

function checkForUpdates() {
  setupAutoUpdater();
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Check for updates failed:', err.message);
  });
}

// ──────────────────────────────────────────────
// 3. Ensure data directories exist
// ──────────────────────────────────────────────
for (const dir of [uploadsDir, backupsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ──────────────────────────────────────────────
// 4. First-run database initialization
// ──────────────────────────────────────────────
let mainWindow;

async function initializeDatabase() {
  if (!fs.existsSync(dbPath)) {
    console.log('First run: initializing database...');
    const { initDB } = require('../backend/src/init-db.cjs');
    await initDB();
    console.log('Database initialized.');
  }
}

// ──────────────────────────────────────────────
// 5. Start Express server and create window
// ──────────────────────────────────────────────
async function createApp() {
  // Wait for sql.js to initialize
  const sqlite3Compat = require('./sqlite3-compat.cjs');
  if (sqlite3Compat._ready) await sqlite3Compat._ready;

  // Check frontend build exists
  if (!fs.existsSync(frontendBuild)) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Solar Dashboard',
      message: 'Frontend build not found.\n\nPlease run: cd frontend && npm run build',
    });
    app.quit();
    return;
  }

  await initializeDatabase();

  // require AFTER env vars are set
  const expressApp = require('../backend/src/index');

  const PORT = parseInt(process.env.PORT, 10);
  const server = expressApp.listen(PORT, () => {
    console.log(`Express listening on port ${PORT}`);

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      title: 'Solar Dashboard',
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    mainWindow.loadURL(`http://localhost:${PORT}`);
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // เช็คอัปเดตหลังเปิดหน้าต่าง
    setTimeout(checkForUpdates, 3000);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      dialog.showMessageBox({
        type: 'error',
        title: 'Solar Dashboard',
        message: `Port ${PORT} is already in use.\n\nPlease close the application using port ${PORT} and try again.`,
      });
    } else {
      dialog.showMessageBox({
        type: 'error',
        title: 'Solar Dashboard',
        message: `Server error: ${err.message}`,
      });
    }
    app.quit();
  });
}

// ──────────────────────────────────────────────
// 6. App lifecycle
// ──────────────────────────────────────────────
app.whenReady().then(createApp);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createApp();
  }
});
