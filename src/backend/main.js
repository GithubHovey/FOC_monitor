const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');

// 设置SerialPort日志级别以避免console[level]错误
process.env.DEBUG = ''; // 禁用debug日志
process.env.SERIALPORT_LOG_LEVEL = 'error'; // 只显示错误日志

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

  // 开发模式时打开开发者工具
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
    
    // 始终打开开发者工具（调试用途）
    mainWindow.webContents.openDevTools();

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

// 串口实例
let serialPort = null;

// IPC通信处理 - 统一通道名称以匹配preload.js
ipcMain.handle('get-serial-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error('获取串口列表失败:', error);
    return [];
  }
});

ipcMain.handle('connect-serial', async (event, portPath, baudRate = 115200) => {
  try {
    if (serialPort && serialPort.isOpen) {
      await new Promise((resolve, reject) => {
        serialPort.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
    
    // 使用try-catch包装SerialPort实例化，捕获所有错误
    try {
      serialPort = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false
      });
    } catch (createError) {
      console.error('创建SerialPort实例失败:', createError);
      return { success: false, error: `创建串口实例失败: ${createError.message}` };
    }
    
    // 手动打开串口
    await new Promise((resolve, reject) => {
      serialPort.open((error) => {
        if (error) {
          console.error('打开串口失败:', error);
          reject(new Error(`打开串口失败: ${portPath} - ${error.message}`));
        } else {
          resolve();
        }
      });
    });
    
    // 设置事件监听 - 使用安全的日志记录
    serialPort.on('data', (data) => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('serial-data', data);
        }
      } catch (sendError) {
        // 使用安全的日志记录方式
        process.stdout.write(`发送串口数据错误: ${sendError.message}\n`);
      }
    });
    
    serialPort.on('error', (error) => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('serial-error', error.message);
        }
        // 使用安全的日志记录方式
        process.stdout.write(`串口错误: ${error.message}\n`);
      } catch (sendError) {
        process.stdout.write(`发送串口错误失败: ${sendError.message}\n`);
      }
    });
    
    // 监听打开事件
    serialPort.on('open', () => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('serial-status', { status: 'connected', port: portPath });
        }
        process.stdout.write(`串口 ${portPath} 已打开\n`);
      } catch (sendError) {
        process.stdout.write(`发送串口状态失败: ${sendError.message}\n`);
      }
    });
    
    console.log(`串口 ${portPath} 连接成功，波特率 ${baudRate}`);
    return { success: true };
    
  } catch (error) {
    console.error('连接串口时发生错误:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-serial', async () => {
  try {
    if (serialPort && serialPort.isOpen) {
      await new Promise((resolve, reject) => {
        serialPort.close((error) => {
          if (error) {
            process.stdout.write(`关闭串口错误: ${error.message}\n`);
            reject(error);
          } else {
            process.stdout.write('串口已关闭\n');
            resolve();
          }
        });
      });
      serialPort = null;
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('serial-status', { status: 'disconnected' });
      }
    }
    return { success: true };
  } catch (error) {
    process.stdout.write(`断开串口连接错误: ${error.message}\n`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-serial-data', async (event, data) => {
  try {
    if (serialPort && serialPort.isOpen) {
      await new Promise((resolve, reject) => {
        serialPort.write(data, (error) => {
          if (error) {
            process.stdout.write(`发送数据错误: ${error.message}\n`);
            reject(error);
          } else {
            process.stdout.write(`已发送数据: ${data.length} 字节\n`);
            resolve();
          }
        });
      });
      return { success: true };
    }
    return { success: false, error: '串口未打开' };
  } catch (error) {
    process.stdout.write(`发送串口数据错误: ${error.message}\n`);
    return { success: false, error: error.message };
  }
});

// 保持向后兼容的旧通道
ipcMain.handle('open-serial-port', async (event, portName, options) => {
  const baudRate = options.baudRate || 115200;
  return await ipcMain.handle('connect-serial', event, portName, baudRate);
});

ipcMain.handle('close-serial-port', async () => {
  return await ipcMain.handle('disconnect-serial', event);
});

ipcMain.handle('write-serial-data', async (event, data) => {
  return await ipcMain.handle('send-serial-data', event, data);
});

// 退出应用前的清理工作
app.on('before-quit', () => {
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
});