const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');

// 保持对窗口对象的全局引用
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    title: 'FOC电机控制上位机'
  });

  // 加载应用的index.html文件
  mainWindow.loadFile(path.join(__dirname, '../frontend/pages/index.html'));

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron初始化完成
app.whenReady().then(createWindow);

// 当所有窗口都关闭时退出应用
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

// IPC通信处理
ipcMain.handle('get-serial-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error('获取串口列表失败:', error);
    return [];
  }
});

// 串口实例
let serialPort = null;

ipcMain.handle('open-serial-port', async (event, portName, options) => {
  try {
    if (serialPort && serialPort.isOpen) {
      await serialPort.close();
    }
    
    serialPort = new SerialPort(portName, options);
    
    serialPort.on('data', (data) => {
      // 将接收到的数据发送到渲染进程
      mainWindow.webContents.send('serial-data', data);
    });
    
    serialPort.on('error', (error) => {
      mainWindow.webContents.send('serial-error', error.message);
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('close-serial-port', async () => {
  try {
    if (serialPort && serialPort.isOpen) {
      await serialPort.close();
      serialPort = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-serial-data', async (event, data) => {
  try {
    if (serialPort && serialPort.isOpen) {
      serialPort.write(data);
      return { success: true };
    }
    return { success: false, error: '串口未打开' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 退出应用前的清理工作
app.on('before-quit', () => {
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
});