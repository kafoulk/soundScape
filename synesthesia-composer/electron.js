const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Electron's built-in check, !app.isPackaged = "If I am NOT inside an .exe file, I am in Dev mode"
  const isDev = !app.isPackaged;

  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: path.join(__dirname, isDev ? 'public/favicon.ico' : 'build/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // Load Logic
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the file directly
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});