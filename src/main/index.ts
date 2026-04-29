import { app, BrowserWindow, screen, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { registerIpc } from './ipc'
import { closeDb, getDb } from './db'

const isDev = !app.isPackaged

app.disableHardwareAcceleration()

let logStream: fs.WriteStream | null = null
function setupLogging(): void {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    const logPath = path.join(logDir, 'main.log')
    logStream = fs.createWriteStream(logPath, { flags: 'a' })
    const stamp = (): string => `[${new Date().toISOString()}]`
    const origLog = console.log.bind(console)
    const origErr = console.error.bind(console)
    console.log = (...args: unknown[]) => {
      const msg = `${stamp()} ${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`
      logStream?.write(msg)
      origLog(...args)
    }
    console.error = (...args: unknown[]) => {
      const msg = `${stamp()} [ERR] ${args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`
      logStream?.write(msg)
      origErr(...args)
    }
    process.on('uncaughtException', (err) => console.error('uncaughtException', err))
    process.on('unhandledRejection', (err) => console.error('unhandledRejection', err))
    console.log('=== Industrial Doc Flow started ===', { version: app.getVersion(), platform: process.platform })
  } catch {
    // ignore logging setup errors
  }
}

function createWindow(): void {
  const display = screen.getPrimaryDisplay()
  const { width: dw, height: dh } = display.workAreaSize
  const ww = Math.min(1280, dw - 40)
  const wh = Math.min(820, dh - 40)
  const x = display.workArea.x + Math.max(0, Math.floor((dw - ww) / 2))
  const y = display.workArea.y + Math.max(0, Math.floor((dh - wh) / 2))

  console.log('createWindow', { display: display.bounds, workArea: display.workArea, ww, wh, x, y })

  const win = new BrowserWindow({
    width: ww,
    height: wh,
    x,
    y,
    minWidth: 900,
    minHeight: 600,
    title: 'Industrial Doc Flow',
    autoHideMenuBar: true,
    show: true,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const ensureVisible = (): void => {
    if (!win.isVisible()) win.show()
    if (win.isMinimized()) win.restore()
    win.moveTop()
    win.focus()
  }

  win.on('ready-to-show', ensureVisible)
  win.webContents.on('did-finish-load', ensureVisible)
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('render-process-gone', details)
  })
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('did-fail-load', { code, desc, url })
  })

  setTimeout(ensureVisible, 1500)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const htmlPath = path.join(__dirname, '../renderer/index.html')
    console.log('loadFile', htmlPath)
    win.loadFile(htmlPath).catch((e) => console.error('loadFile failed', e))
  }
}

app.whenReady().then(() => {
  setupLogging()
  try {
    getDb()
  } catch (e) {
    console.error('getDb failed', e)
  }
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})
