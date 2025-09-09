const SerialManager = require('./serialManager');

class CustomDataSender {
    constructor() {
        this.serialManager = null;
        this.isConnected = false;
        this.sendQueue = [];
        this.isSending = false;
        
        // 支持的波特率列表
        this.supportedBaudRates = [
            9600, 19200, 38400, 57600, 115200, 230400, 
            460800, 500000, 921600, 1000000, 1500000
        ];
        
        // 事件监听器
        this.listeners = {
            sendSuccess: [],
            sendError: [],
            connected: [],
            disconnected: []
        };
    }

    // 初始化串口管理器
    initialize(serialManager) {
        this.serialManager = serialManager;
        
        // 监听串口状态变化
        this.serialManager.on('connected', () => {
            this.isConnected = true;
            this.emit('connected');
        });
        
        this.serialManager.on('disconnected', () => {
            this.isConnected = false;
            this.emit('disconnected');
        });
        
        this.isConnected = this.serialManager.isConnected;
    }

    // 获取支持的波特率列表
    getSupportedBaudRates() {
        return this.supportedBaudRates;
    }

    // 发送自定义数据
    async sendCustomData(data, format = 'hex') {
        if (!this.isConnected) {
            throw new Error('串口未连接');
        }

        let buffer;
        
        try {
            // 根据格式转换数据
            switch (format.toLowerCase()) {
                case 'hex':
                    buffer = this.hexStringToBuffer(data);
                    break;
                case 'ascii':
                    buffer = Buffer.from(data, 'ascii');
                    break;
                case 'utf8':
                    buffer = Buffer.from(data, 'utf8');
                    break;
                case 'decimal':
                    buffer = this.decimalStringToBuffer(data);
                    break;
                case 'binary':
                    buffer = this.binaryStringToBuffer(data);
                    break;
                default:
                    throw new Error('不支持的格式: ' + format);
            }
            
            // 发送数据
            await this.serialManager.sendData(buffer);
            this.emit('sendSuccess', {
                data: buffer,
                format: format,
                timestamp: Date.now()
            });
            
            return true;
            
        } catch (error) {
            console.error('发送自定义数据失败:', error);
            this.emit('sendError', {
                error: error,
                data: data,
                format: format,
                timestamp: Date.now()
            });
            return false;
        }
    }

    // 发送FOC协议命令
    async sendFOCCommand(commandType, data = null) {
        if (!this.isConnected) {
            throw new Error('串口未连接');
        }

        try {
            await this.serialManager.sendCommand(commandType, data);
            this.emit('sendSuccess', {
                type: 'foc_command',
                commandType: commandType,
                data: data,
                timestamp: Date.now()
            });
            
            return true;
            
        } catch (error) {
            console.error('发送FOC命令失败:', error);
            this.emit('sendError', {
                error: error,
                type: 'foc_command',
                commandType: commandType,
                data: data,
                timestamp: Date.now()
            });
            return false;
        }
    }

    // 批量发送数据
    async sendBatch(dataArray, format = 'hex', interval = 100) {
        const results = [];
        
        for (const data of dataArray) {
            try {
                const success = await this.sendCustomData(data, format);
                results.push({
                    data: data,
                    success: success,
                    timestamp: Date.now()
                });
                
                // 等待指定的间隔时间
                if (interval > 0) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
                
            } catch (error) {
                results.push({
                    data: data,
                    success: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
        
        return results;
    }

    // 十六进制字符串转Buffer
    hexStringToBuffer(hexString) {
        // 移除空格和0x前缀
        const cleanHex = hexString.replace(/\s|0x/gi, '');
        
        // 检查长度是否为偶数
        if (cleanHex.length % 2 !== 0) {
            throw new Error('十六进制字符串长度必须为偶数');
        }
        
        // 检查是否为有效的十六进制
        if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
            throw new Error('无效的十六进制字符串');
        }
        
        const buffer = Buffer.alloc(cleanHex.length / 2);
        
        for (let i = 0; i < cleanHex.length; i += 2) {
            const byte = parseInt(cleanHex.substr(i, 2), 16);
            if (isNaN(byte)) {
                throw new Error('无效的十六进制字节: ' + cleanHex.substr(i, 2));
            }
            buffer[i / 2] = byte;
        }
        
        return buffer;
    }

    // 十进制字符串转Buffer
    decimalStringToBuffer(decimalString) {
        const numbers = decimalString.split(/[,\s]+/).filter(Boolean);
        const buffer = Buffer.alloc(numbers.length);
        
        for (let i = 0; i < numbers.length; i++) {
            const num = parseInt(numbers[i], 10);
            if (isNaN(num) || num < 0 || num > 255) {
                throw new Error('无效的十进制值: ' + numbers[i] + ' (必须在0-255之间)');
            }
            buffer[i] = num;
        }
        
        return buffer;
    }

    // 二进制字符串转Buffer
    binaryStringToBuffer(binaryString) {
        const binaries = binaryString.split(/[,\s]+/).filter(Boolean);
        const buffer = Buffer.alloc(binaries.length);
        
        for (let i = 0; i < binaries.length; i++) {
            if (!/^[01]{8}$/.test(binaries[i])) {
                throw new Error('无效的二进制字节: ' + binaries[i] + ' (必须为8位二进制)');
            }
            buffer[i] = parseInt(binaries[i], 2);
        }
        
        return buffer;
    }

    // 生成测试数据模式
    generateTestPattern(patternType, length = 16) {
        const buffer = Buffer.alloc(length);
        
        switch (patternType) {
            case 'increment':
                for (let i = 0; i < length; i++) {
                    buffer[i] = i % 256;
                }
                break;
                
            case 'decrement':
                for (let i = 0; i < length; i++) {
                    buffer[i] = (255 - i) % 256;
                }
                break;
                
            case 'alternate':
                for (let i = 0; i < length; i++) {
                    buffer[i] = i % 2 === 0 ? 0xAA : 0x55;
                }
                break;
                
            case 'random':
                for (let i = 0; i < length; i++) {
                    buffer[i] = Math.floor(Math.random() * 256);
                }
                break;
                
            case 'all_zeros':
                buffer.fill(0);
                break;
                
            case 'all_ones':
                buffer.fill(0xFF);
                break;
                
            default:
                throw new Error('未知的测试模式: ' + patternType);
        }
        
        return buffer;
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

    // 销毁
    destroy() {
        this.sendQueue = [];
        this.isSending = false;
        this.isConnected = false;
        this.serialManager = null;
        
        // 移除所有事件监听器
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
    }
}

module.exports = CustomDataSender;