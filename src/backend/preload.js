const { contextBridge, ipcRenderer } = require('electron');

// 在Electron环境中，Chart.js已经通过HTML中的CDN链接加载
// 这里我们不再需要注入Chart类

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 串口相关API
  // 串口相关API
  getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),
  openSerialPort: (portName, options) => ipcRenderer.invoke('open-serial-port', portName, options),
  closeSerialPort: () => ipcRenderer.invoke('close-serial-port'),
  writeSerialData: (data) => ipcRenderer.invoke('write-serial-data', data),
  
  // 监听串口数据
  onSerialData: (callback) => {
    ipcRenderer.on('serial-data', (event, data) => callback(data));
  },
  
  // 监听串口错误
  onSerialError: (callback) => {
    ipcRenderer.on('serial-error', (event, error) => callback(error));
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});