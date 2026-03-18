import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import sqlite3 from 'sqlite3'

app.disableHardwareAcceleration()

// --- Database Setup ---
const dbPath = join(app.getPath('userData'), 'scales_database.sqlite')
const db = new sqlite3.Database(dbPath)

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carNumber TEXT,
    driverName TEXT,
    customer TEXT,
    cargoType TEXT,
    notes TEXT,
    tareWeight REAL,
    grossWeight REAL,
    netWeight REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
})

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
})

// --- Scale Integration ---
const port = new SerialPort({ path: '/dev/pts/4', baudRate: 9600 })
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

parser.on('data', (data) => {
  const weight = data.trim()
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('on-weight-receive', weight)
  })
})

// --- 1. وظيفة الحفظ في قاعدة البيانات ---
ipcMain.handle('save-transaction', async (event, ticketData) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO transactions 
      (carNumber, driverName, customer, cargoType, notes, tareWeight, grossWeight, netWeight) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

    const params = [
      ticketData.carNumber,
      ticketData.driverName,
      ticketData.customer,
      ticketData.cargoType,
      ticketData.notes,
      ticketData.tareWeight,
      ticketData.grossWeight,
      ticketData.netWeight
    ]

    db.run(query, params, function (err) {
      if (err) {
        console.error('Database Error:', err.message)
        reject(err)
      } else {
        console.log('Transaction saved with ID:', this.lastID)
        resolve(this.lastID)
      }
    })
  })
})

// --- 2. وظيفة جلب السجل ---
ipcMain.handle('get-history', async () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM transactions ORDER BY createdAt DESC`, [], (err, rows) => {
      if (err) reject(err)
      resolve(rows)
    })
  })
})

// --- 3. وظيفة الطباعة (فقط طباعة بدون حفظ لتجنب التكرار) ---
ipcMain.on('print-ticket', (event, ticketData) => {
  let printWindow = new BrowserWindow({ show: false })

  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; padding: 50px; border: 3px solid #000; width: 80%; margin: 20px auto; line-height: 1.6;">
      <h1 style="text-align: center; font-size: 36px; margin-bottom: 5px;">تذكرة ميزان بسكول</h1>
      <p style="text-align: center; font-size: 18px; margin-top: 0; color: #555;">نظام جوتريل الذكي لإدارة الموازين</p>
      
      <div style="border-top: 2px solid #000; margin-top: 20px; padding-top: 20px;">
        <table style="width: 100%; font-size: 22px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>رقم السيارة:</b></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${ticketData.carNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>اسم السائق:</b></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${ticketData.driverName || 'غير مسجل'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>العميل / المورد:</b></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${ticketData.customer || 'غير مسجل'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>نوع البضاعة:</b></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${ticketData.cargoType || 'غير مسجل'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px; display: flex; justify-content: space-around; background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
        <div style="text-align: center;">
          <p style="font-size: 18px; margin: 0;">الوزن القائم</p>
          <p style="font-size: 28px; font-weight: bold; margin: 5px 0;">${ticketData.grossWeight} KG</p>
        </div>
        <div style="text-align: center;">
          <p style="font-size: 18px; margin: 0;">الوزن الفارغ</p>
          <p style="font-size: 28px; font-weight: bold; margin: 5px 0;">${ticketData.tareWeight} KG</p>
        </div>
      </div>

      <div style="margin-top: 20px; text-align: center; background: #333; color: #fff; padding: 15px; border-radius: 5px;">
        <span style="font-size: 24px;">الوزن الصافي (NET): </span>
        <span style="font-size: 40px; font-weight: bold;">${ticketData.netWeight} KG</span>
      </div>

      <div style="margin-top: 30px; padding: 15px; border: 1px dashed #666;">
        <p style="font-size: 20px; margin: 0;"><b>ملاحظات إضافية:</b></p>
        <p style="font-size: 18px; margin-top: 10px;">${ticketData.notes || 'لا يوجد ملاحظات'}</p>
      </div>

      <div style="margin-top: 40px; text-align: left; font-size: 14px; color: #888;">
        تاريخ العملية: ${new Date(ticketData.createdAt || new Date()).toLocaleString('ar-EG')}
      </div>
    </div>
  `

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print({ silent: false, printBackground: true }, () => {
      printWindow.close()
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close()
    app.quit()
  }
})
