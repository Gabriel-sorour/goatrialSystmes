import { contextBridge, ipcRenderer } from 'electron'

const scaleApi = {
  onWeightReceive: (callback) =>
    ipcRenderer.on('on-weight-receive', (_event, value) => callback(value)),

  printTicket: (data) => ipcRenderer.send('print-ticket', data),

  // إضافة وظيفة الحفظ
  saveTransaction: (data) => ipcRenderer.invoke('save-transaction', data),

  // إضافة وظيفة جلب السجل
  getHistory: () => ipcRenderer.invoke('get-history')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('scaleApi', scaleApi)
  } catch (error) {
    console.error(error)
  }
} else {
  window.scaleApi = scaleApi
}
