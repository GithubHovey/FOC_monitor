const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const FOCDataProcessor = require('../data-processing/focDataProcessor');

class SerialManager {
    constructor() {
        this.port = null;
        this.parser = null;
        this.dataProcessor = new FOCDataProcessor();
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.baudRate = 115200;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000;
        this.reconnectTimer = null;
        
        // 事件监听器
        this.listeners = {
            data: [],
            error: [],
            status: [],
            connected: [],
            disconnected: []
        };
        
        // 设置数据处理器回调
        this.dataProcessor.setCallback('onDataReceived', (data) => {
            this.emit('data', data);
        });
        
        this.dataProcessor.setCallback('onError', (error) => {
            this.emit('error', error);
        });
    }

    // 获取可用串口列表
    async getAvailablePorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer || 'Unknown',
                serialNumber: port.serialNumber || 'Unknown',
                pnpId: port.pnpId || 'Unknown',
                locationId: port.locationId || 'Unknown',
                vendorId: port.vendorId,
                productId: port.productId
            }));
        } catch (error) {
            console.error('获取串口列表失败:', error);
            this.emit('error', error);
            return [];
        }
    }

    // 连接到串口
    async connect(portPath, baudRate = 115200) {
        if (this.isConnected) {
            await this.disconnect();
        }

        this.baudRate = baudRate;
        
        try {
            this.port = new SerialPort({
            path: portPath,
            baudRate: this.baudRate,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            autoOpen: false
        });

            // 设置解析器
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

            // 注册事件监听器
            this.port.on('open', () => {
                this.handlePortOpen();
            });

            this.port.on('close', () => {
                this.handlePortClose();
            });

            this.port.on('error', (error) => {
                this.handlePortError(error);
            });

            this.parser.on('data', (data) => {
                this.handleData(data);
            });

            // 打开串口
            await new Promise((resolve, reject) => {
                this.port.open((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            return true;

        } catch (error) {
            console.error('连接串口失败:', error);
            this.emit('error', error);
            
            // 尝试重新连接
            this.scheduleReconnect(portPath, baudRate);
            
            return false;
        }
    }

    // 处理串口打开事件
    handlePortOpen() {
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        console.log(`串口连接成功: ${this.port.path}`);
        this.emit('connected', {
            path: this.port.path,
            baudRate: this.baudRate
        });
        this.emit('status', this.connectionStatus);
    }

    // 处理串口关闭事件
    handlePortClose() {
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        
        console.log('串口连接已关闭');
        this.emit('disconnected');
        this.emit('status', this.connectionStatus);
        
        // 清理资源
        this.cleanup();
    }

    // 处理串口错误事件
    handlePortError(error) {
        console.error('串口错误:', error);
        this.emit('error', error);
        
        if (this.isConnected) {
            this.isConnected = false;
            this.connectionStatus = 'error';
            this.emit('status', this.connectionStatus);
            
            // 尝试重新连接
            if (this.port) {
                this.scheduleReconnect(this.port.path, this.baudRate);
            }
        }
    }

    // 处理接收到的数据
    handleData(data) {
        try {
            // 将数据传递给处理器
            this.dataProcessor.processRawData(data);
        } catch (error) {
            console.error('处理数据时出错:', error);
            this.emit('error', error);
        }
    }

    // 发送数据
    sendData(data) {
        if (!this.isConnected || !this.port) {
            throw new Error('串口未连接');
        }

        return new Promise((resolve, reject) => {
            this.port.write(data, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    // 发送FOC控制命令
    async sendCommand(commandType, data = null) {
        try {
            const command = this.dataProcessor.generateCommand(commandType, data);
            await this.sendData(command);
            return true;
        } catch (error) {
            console.error('发送命令失败:', error);
            this.emit('error', error);
            return false;
        }
    }

    // 发送速度控制命令
    async setSpeed(speed) {
        const command = this.dataProcessor.generateSpeedCommand(speed);
        return await this.sendData(command);
    }

    // 发送位置控制命令
    async setPosition(position) {
        const command = this.dataProcessor.generatePositionCommand(position);
        return await this.sendData(command);
    }

    // 发送转矩控制命令
    async setTorque(torque) {
        const command = this.dataProcessor.generateTorqueCommand(torque);
        return await this.sendData(command);
    }

    // 读取参数
    async readParameter(parameterId) {
        const command = this.dataProcessor.generateParameterReadCommand(parameterId);
        await this.sendData(command);
        // 需要等待响应
    }

    // 写入参数
    async writeParameter(parameterId, value) {
        const command = this.dataProcessor.generateParameterWriteCommand(parameterId, value);
        await this.sendData(command);
        // 需要等待响应
    }

    // 断开连接
    async disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.port && this.isConnected) {
            return new Promise((resolve) => {
                this.port.close((error) => {
                    if (error) {
                        console.error('关闭串口时出错:', error);
                        this.emit('error', error);
                    }
                    this.cleanup();
                    resolve();
                });
            });
        }
        
        this.cleanup();
    }

    // 清理资源
    cleanup() {
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        
        if (this.parser) {
            this.parser.removeAllListeners();
            this.parser = null;
        }
        
        if (this.port) {
            this.port.removeAllListeners();
            this.port = null;
        }
        
        this.dataProcessor.destroy();
        
        this.emit('status', this.connectionStatus);
    }

    // 安排重新连接
    scheduleReconnect(portPath, baudRate) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('达到最大重连尝试次数，停止重连');
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectAttempts++;
            console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            this.connectionStatus = 'reconnecting';
            this.emit('status', this.connectionStatus);
            
            try {
                await this.connect(portPath, baudRate);
            } catch (error) {
                console.error('重连失败:', error);
                this.scheduleReconnect(portPath, baudRate);
            }
        }, this.reconnectInterval);
    }

    // 获取连接状态
    getStatus() {
        return {
            isConnected: this.isConnected,
            status: this.connectionStatus,
            portPath: this.port ? this.port.path : null,
            baudRate: this.baudRate,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    // 获取统计数据
    getStatistics() {
        return this.dataProcessor.getStatistics();
    }

    // 重置统计数据
    resetStatistics() {
        this.dataProcessor.resetStatistics();
    }

    // 事件监听
    on(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event].push(listener);
        }
    }

    off(event, listener) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(listener);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    // 触发事件
    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`事件监听器错误 (${event}):`, error);
                }
            });
        }
    }

    // 销毁管理器
    async destroy() {
        await this.disconnect();
        
        // 移除所有事件监听器
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        this.dataProcessor.destroy();
    }
}

module.exports = SerialManager;