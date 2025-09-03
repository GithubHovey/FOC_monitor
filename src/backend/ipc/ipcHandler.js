const SerialManager = require('../communication/serialManager');

class IPCHandler {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.serialManager = new SerialManager();
        this.setupEventListeners();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 串口管理器事件转发到渲染进程
        this.serialManager.on('data', (data) => {
            this.sendToRenderer('serial-data', data);
        });

        this.serialManager.on('error', (error) => {
            this.sendToRenderer('serial-error', {
                message: error.message,
                stack: error.stack
            });
        });

        this.serialManager.on('status', (status) => {
            this.sendToRenderer('serial-status', status);
        });

        this.serialManager.on('connected', (info) => {
            this.sendToRenderer('serial-connected', info);
        });

        this.serialManager.on('disconnected', () => {
            this.sendToRenderer('serial-disconnected');
        });
    }

    // 发送消息到渲染进程
    sendToRenderer(channel, data = null) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
        }
    }

    // 处理来自渲染进程的IPC消息
    async handleIPCMessage(event, channel, ...args) {
        try {
            switch (channel) {
                case 'get-serial-ports':
                    return await this.handleGetSerialPorts();

                case 'connect-serial':
                    return await this.handleConnectSerial(...args);

                case 'disconnect-serial':
                    return await this.handleDisconnectSerial();

                case 'send-serial-data':
                    return await this.handleSendSerialData(...args);

                case 'get-serial-status':
                    return await this.handleGetSerialStatus();

                case 'get-serial-statistics':
                    return await this.handleGetSerialStatistics();

                case 'reset-serial-statistics':
                    return await this.handleResetSerialStatistics();

                case 'send-foc-command':
                    return await this.handleSendFOCCommand(...args);

                default:
                    console.warn('未知的IPC通道:', channel);
                    return { success: false, error: '未知的IPC通道' };
            }
        } catch (error) {
            console.error('处理IPC消息时出错:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取可用串口列表
    async handleGetSerialPorts() {
        try {
            const ports = await this.serialManager.getAvailablePorts();
            return { success: true, data: ports };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 连接串口
    async handleConnectSerial(portPath, baudRate = 115200) {
        try {
            const success = await this.serialManager.connect(portPath, baudRate);
            return { success, message: success ? '连接成功' : '连接失败' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 断开串口连接
    async handleDisconnectSerial() {
        try {
            await this.serialManager.disconnect();
            return { success: true, message: '断开连接成功' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 发送串口数据
    async handleSendSerialData(data) {
        try {
            await this.serialManager.sendData(data);
            return { success: true, message: '数据发送成功' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取串口状态
    async handleGetSerialStatus() {
        try {
            const status = this.serialManager.getStatus();
            return { success: true, data: status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取串口统计数据
    async handleGetSerialStatistics() {
        try {
            const stats = this.serialManager.getStatistics();
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 重置串口统计数据
    async handleResetSerialStatistics() {
        try {
            this.serialManager.resetStatistics();
            return { success: true, message: '统计数据已重置' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 发送FOC控制命令
    async handleSendFOCCommand(commandType, commandData = null) {
        try {
            let success = false;
            let message = '';

            switch (commandType) {
                case 'speed':
                    success = await this.serialManager.setSpeed(commandData);
                    message = success ? '速度命令发送成功' : '速度命令发送失败';
                    break;

                case 'position':
                    success = await this.serialManager.setPosition(commandData);
                    message = success ? '位置命令发送成功' : '位置命令发送失败';
                    break;

                case 'torque':
                    success = await this.serialManager.setTorque(commandData);
                    message = success ? '转矩命令发送成功' : '转矩命令发送失败';
                    break;

                case 'read-parameter':
                    success = await this.serialManager.readParameter(commandData);
                    message = success ? '参数读取命令发送成功' : '参数读取命令发送失败';
                    break;

                case 'write-parameter':
                    const { parameterId, value } = commandData;
                    success = await this.serialManager.writeParameter(parameterId, value);
                    message = success ? '参数写入命令发送成功' : '参数写入命令发送失败';
                    break;

                default:
                    message = '未知的命令类型';
                    break;
            }

            return { success, message };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 处理应用关闭
    async handleAppClose() {
        try {
            await this.serialManager.destroy();
            console.log('IPC处理器已清理');
        } catch (error) {
            console.error('清理IPC处理器时出错:', error);
        }
    }

    // 获取串口管理器实例（用于测试和调试）
    getSerialManager() {
        return this.serialManager;
    }

    // 设置主窗口（用于窗口重建等情况）
    setMainWindow(mainWindow) {
        this.mainWindow = mainWindow;
    }
}

module.exports = IPCHandler;