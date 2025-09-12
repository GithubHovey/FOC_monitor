class SerialManager {
    constructor() {
        this.isConnected = false;
        this.currentPort = null;
        this.baudRate = 115200;
        this.dataCallbacks = [];
        this.errorCallbacks = [];
        
        this.initEventListeners();
    }

    // 初始化事件监听器
    initEventListeners() {
        // 监听串口数据
        if (window.electronAPI) {
            window.electronAPI.onSerialData((data) => {
                this.handleSerialData(data);
            });

            window.electronAPI.onSerialError((error) => {
                this.handleSerialError(error);
            });
        }
    }

    // 获取可用串口列表
    async getAvailablePorts() {
        try {
            if (!window.electronAPI) {
                throw new Error('Electron API not available');
            }
            
            const ports = await window.electronAPI.getSerialPorts();
            const filteredPorts = ports.filter(port => 
                port.path && !port.path.includes('Bluetooth')
            );
            
            if (window.logger) {
                window.logger.info(`发现 ${filteredPorts.length} 个可用串口`, filteredPorts);
            }
            
            return filteredPorts;
        } catch (error) {
            console.error('获取串口列表失败:', error);
            if (window.logger) {
                window.logger.error('获取串口列表失败', error.message);
            }
            return [];
        }
    }

    // 打开串口
    async openPort(portName, baudRate = 115200) {
        try {
            if (!window.electronAPI) {
                throw new Error('Electron API not available');
            }

            const options = {
                baudRate: baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                autoOpen: false
            };

            const result = await window.electronAPI.openSerialPort(portName, options);
            
            if (result.success) {
                this.isConnected = true;
                this.currentPort = portName;
                this.baudRate = baudRate;
                
                this.notifyDataCallbacks({
                    type: 'status',
                    message: `串口 ${portName} 已连接`,
                    connected: true
                });
                
                if (window.logger) {
                    window.logger.success(`串口 ${portName} 已连接，波特率 ${baudRate}`);
                }
                
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('打开串口失败:', error);
            this.notifyErrorCallbacks(error.message);
            if (window.logger) {
                window.logger.error(`打开串口失败: ${portName} - ${error.message}`);
            }
            return false;
        }
    }

    // 关闭串口
    async closePort() {
        try {
            if (this.isConnected && window.electronAPI) {
                const result = await window.electronAPI.closeSerialPort();
                
                if (result.success) {
                    this.isConnected = false;
                    this.currentPort = null;
                    
                    this.notifyDataCallbacks({
                        type: 'status',
                        message: '串口已断开',
                        connected: false
                    });
                    
                    if (window.logger) {
                        window.logger.info('串口已断开');
                    }
                    
                    return true;
                } else {
                    throw new Error(result.error);
                }
            }
            return true;
        } catch (error) {
            console.error('关闭串口失败:', error);
            this.notifyErrorCallbacks(error.message);
            if (window.logger) {
                window.logger.error('关闭串口失败', error.message);
            }
            return false;
        }
    }

    // 发送数据
    async sendData(data) {
        try {
            if (!this.isConnected || !window.electronAPI) {
                throw new Error('串口未连接');
            }

            // 确保数据是Buffer或字符串
            let dataToSend;
            if (typeof data === 'string') {
                dataToSend = data;
            } else if (data instanceof ArrayBuffer) {
                dataToSend = new Uint8Array(data);
            } else {
                dataToSend = data;
            }

            const result = await window.electronAPI.writeSerialData(dataToSend);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return true;
        } catch (error) {
            console.error('发送数据失败:', error);
            this.notifyErrorCallbacks(error.message);
            return false;
        }
    }

    // 发送FOC协议命令
    async sendFOCCommand(command, data = null) {
        const packet = this.createFOCPacket(command, data);
        return await this.sendData(packet);
    }

    // 创建FOC协议数据包
    createFOCPacket(command, data = null) {
        // FOC协议格式: [头字节][长度][命令字][数据域][校验][尾字节]
        const header = 0xAA; // 头字节
        const footer = 0x55; // 尾字节
        
        let dataBytes = [];
        if (data !== null) {
            if (Array.isArray(data)) {
                dataBytes = data;
            } else if (typeof data === 'number') {
                // 将数字转换为4字节
                dataBytes = [
                    (data >> 24) & 0xFF,
                    (data >> 16) & 0xFF,
                    (data >> 8) & 0xFF,
                    data & 0xFF
                ];
            }
        }
        
        const length = 1 + dataBytes.length; // 命令字 + 数据长度
        
        // 构建数据包
        const packet = [header, length, command, ...dataBytes];
        
        // 计算校验和（简单的异或校验）
        let checksum = 0;
        for (let i = 1; i < packet.length; i++) { // 从长度字节开始计算
            checksum ^= packet[i];
        }
        packet.push(checksum);
        packet.push(footer);
        
        return new Uint8Array(packet);
    }

    // 处理接收到的串口数据
    handleSerialData(data) {
        try {
            // 将数据转换为数组
            const dataArray = new Uint8Array(data);
            
            // 解析FOC协议数据包
            const parsedData = this.parseFOCPacket(dataArray);
            
            if (parsedData) {
                this.notifyDataCallbacks({
                    type: 'foc_data',
                    timestamp: Date.now(),
                    command: parsedData.command,
                    data: parsedData.data,
                    raw: dataArray
                });
            } else {
                // 原始数据回调
                this.notifyDataCallbacks({
                    type: 'raw_data',
                    timestamp: Date.now(),
                    data: dataArray,
                    text: new TextDecoder().decode(dataArray)
                });
            }
        } catch (error) {
            console.error('处理串口数据失败:', error);
            this.notifyErrorCallbacks(error.message);
        }
    }

    // 解析FOC协议数据包
    parseFOCPacket(data) {
        if (data.length < 6) return null; // 最小包长度
        
        // 检查头尾字节
        if (data[0] !== 0xAA || data[data.length - 1] !== 0x55) {
            return null;
        }
        
        const length = data[1];
        const command = data[2];
        
        // 检查数据长度
        if (data.length !== length + 4) { // 头+长度+命令+数据+校验+尾
            return null;
        }
        
        // 提取数据域
        const dataBytes = data.slice(3, 3 + length - 1); // 减去命令字
        
        // 验证校验和
        let checksum = 0;
        for (let i = 1; i < data.length - 2; i++) { // 从长度字节到校验前
            checksum ^= data[i];
        }
        
        if (checksum !== data[data.length - 2]) {
            return null; // 校验失败
        }
        
        return {
            command: command,
            data: dataBytes,
            valid: true
        };
    }

    // 处理串口错误
    handleSerialError(error) {
        console.error('串口错误:', error);
        this.notifyErrorCallbacks(error);
        
        // 自动重连逻辑
        if (this.isConnected) {
            setTimeout(() => {
                this.reconnect();
            }, 1000);
        }
    }

    // 重连串口
    async reconnect() {
        if (this.currentPort) {
            await this.closePort();
            await this.openPort(this.currentPort, this.baudRate);
        }
    }

    // 注册数据回调
    onData(callback) {
        this.dataCallbacks.push(callback);
    }

    // 注册错误回调
    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    // 通知数据回调
    notifyDataCallbacks(data) {
        this.dataCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('数据回调错误:', error);
            }
        });
    }

    // 通知错误回调
    notifyErrorCallbacks(error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                console.error('错误回调错误:', err);
            }
        });
    }

    // 移除回调
    removeDataCallback(callback) {
        const index = this.dataCallbacks.indexOf(callback);
        if (index > -1) {
            this.dataCallbacks.splice(index, 1);
        }
    }

    removeErrorCallback(callback) {
        const index = this.errorCallbacks.indexOf(callback);
        if (index > -1) {
            this.errorCallbacks.splice(index, 1);
        }
    }

    // 获取连接状态
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            port: this.currentPort,
            baudRate: this.baudRate
        };
    }

    // 销毁实例
    destroy() {
        this.closePort();
        this.dataCallbacks = [];
        this.errorCallbacks = [];
        
        if (window.electronAPI) {
            window.electronAPI.removeAllListeners('serial-data');
            window.electronAPI.removeAllListeners('serial-error');
        }
    }
}

// 创建全局串口管理器实例
window.serialManager = new SerialManager();