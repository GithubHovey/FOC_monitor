class FOCDataProcessor {
    constructor() {
        this.dataBuffer = Buffer.alloc(0);
        this.packetStructure = {
            header: 0xAA,
            footer: 0x55,
            minLength: 12, // 最小数据包长度
            maxLength: 64  // 最大数据包长度
        };
        
        // FOC数据包结构定义
        this.dataTypes = {
            REAL_TIME_DATA: 0x01,      // 实时数据
            PARAMETER_SETTING: 0x02,   // 参数设置
            STATUS_REPORT: 0x03,       // 状态报告
            ERROR_REPORT: 0x04,       // 错误报告
            COMMAND_RESPONSE: 0x05     // 命令响应
        };
        
        // 数据解析回调函数
        this.callbacks = {
            onDataReceived: null,
            onError: null,
            onStatusChange: null
        };
        
        // 数据统计
        this.stats = {
            totalPackets: 0,
            validPackets: 0,
            invalidPackets: 0,
            lastPacketTime: null,
            dataRate: 0
        };
        
        // 数据缓存
        this.dataCache = new Map();
        this.cacheSize = 1000; // 缓存大小
    }

    // 设置回调函数
    setCallback(type, callback) {
        if (this.callbacks.hasOwnProperty(type)) {
            this.callbacks[type] = callback;
        }
    }

    // 处理接收到的原始数据
    processRawData(data) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        
        // 添加到缓冲区
        this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
        
        // 处理缓冲区中的数据包
        this.processBuffer();
    }

    // 处理缓冲区中的数据
    processBuffer() {
        while (this.dataBuffer.length >= this.packetStructure.minLength) {
            // 查找数据包头
            const headerIndex = this.dataBuffer.indexOf(this.packetStructure.header);
            
            if (headerIndex === -1) {
                // 没有找到包头，清空缓冲区
                this.dataBuffer = Buffer.alloc(0);
                break;
            }
            
            if (headerIndex > 0) {
                // 移除包头前的无效数据
                this.dataBuffer = this.dataBuffer.slice(headerIndex);
                continue;
            }
            
            // 检查数据包长度是否足够
            if (this.dataBuffer.length < 4) {
                break; // 等待更多数据
            }
            
            // 获取数据包长度
            const packetLength = this.dataBuffer[1];
            
            if (packetLength < this.packetStructure.minLength || 
                packetLength > this.packetStructure.maxLength) {
                // 无效的数据包长度，跳过这个字节
                this.dataBuffer = this.dataBuffer.slice(1);
                this.stats.invalidPackets++;
                continue;
            }
            
            if (this.dataBuffer.length < packetLength) {
                break; // 等待完整的数据包
            }
            
            // 提取完整的数据包
            const packet = this.dataBuffer.slice(0, packetLength);
            
            // 验证数据包
            if (this.validatePacket(packet)) {
                this.processPacket(packet);
                this.stats.validPackets++;
            } else {
                this.stats.invalidPackets++;
            }
            
            // 移除已处理的数据
            this.dataBuffer = this.dataBuffer.slice(packetLength);
            this.stats.totalPackets++;
        }
    }

    // 验证数据包
    validatePacket(packet) {
        // 检查包头
        if (packet[0] !== this.packetStructure.header) {
            return false;
        }
        
        // 检查包尾
        if (packet[packet.length - 1] !== this.packetStructure.footer) {
            return false;
        }
        
        // 检查长度
        if (packet[1] !== packet.length) {
            return false;
        }
        
        // 计算校验和
        const checksum = this.calculateChecksum(packet);
        if (checksum !== 0) {
            return false;
        }
        
        return true;
    }

    // 计算校验和
    calculateChecksum(packet) {
        let sum = 0;
        // 跳过包头、长度字节和校验和字节
        for (let i = 2; i < packet.length - 2; i++) {
            sum += packet[i];
        }
        return (sum & 0xFF) ^ packet[packet.length - 2];
    }

    // 处理有效的数据包
    processPacket(packet) {
        const dataType = packet[2];
        const timestamp = Date.now();
        
        try {
            let processedData;
            
            switch (dataType) {
                case this.dataTypes.REAL_TIME_DATA:
                    processedData = this.parseRealTimeData(packet);
                    break;
                    
                case this.dataTypes.PARAMETER_SETTING:
                    processedData = this.parseParameterSetting(packet);
                    break;
                    
                case this.dataTypes.STATUS_REPORT:
                    processedData = this.parseStatusReport(packet);
                    break;
                    
                case this.dataTypes.ERROR_REPORT:
                    processedData = this.parseErrorReport(packet);
                    break;
                    
                case this.dataTypes.COMMAND_RESPONSE:
                    processedData = this.parseCommandResponse(packet);
                    break;
                    
                default:
                    console.warn('未知的数据类型:', dataType);
                    return;
            }
            
            // 添加时间戳
            processedData.timestamp = timestamp;
            processedData.rawPacket = packet;
            
            // 更新统计数据
            this.updateStats(timestamp);
            
            // 缓存数据
            this.cacheData(processedData);
            
            // 触发回调
            if (this.callbacks.onDataReceived) {
                this.callbacks.onDataReceived(processedData);
            }
            
        } catch (error) {
            console.error('处理数据包时出错:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
        }
    }

    // 解析实时数据
    parseRealTimeData(packet) {
        return {
            type: 'real_time_data',
            phaseCurrentU: this.readFloat16(packet, 3),  // U相电流
            phaseCurrentV: this.readFloat16(packet, 5),  // V相电流
            phaseCurrentW: this.readFloat16(packet, 7),  // W相电流
            busVoltage: this.readFloat16(packet, 9),     // 总线电压
            motorSpeed: this.readInt16(packet, 11),       // 电机转速 RPM
            motorPosition: this.readInt16(packet, 13),   // 电机位置
            torqueCurrent: this.readFloat16(packet, 15), // 转矩电流
            fluxCurrent: this.readFloat16(packet, 17),   // 磁通电流
            temperature: this.readInt8(packet, 19),     // 温度
            status: packet[20]                           // 状态字
        };
    }

    // 解析参数设置
    parseParameterSetting(packet) {
        return {
            type: 'parameter_setting',
            parameterId: packet[3],
            parameterValue: this.readFloat32(packet, 4),
            success: packet[8] === 0x01
        };
    }

    // 解析状态报告
    parseStatusReport(packet) {
        return {
            type: 'status_report',
            motorStatus: packet[3],
            controlMode: packet[4],
            errorCode: packet[5],
            warningCode: packet[6]
        };
    }

    // 解析错误报告
    parseErrorReport(packet) {
        return {
            type: 'error_report',
            errorCode: packet[3],
            errorMessage: this.getErrorMessage(packet[3]),
            timestamp: this.readUint32(packet, 4)
        };
    }

    // 解析命令响应
    parseCommandResponse(packet) {
        return {
            type: 'command_response',
            commandId: packet[3],
            responseCode: packet[4],
            responseData: packet.slice(5, packet.length - 2)
        };
    }

    // 读取各种数据类型的方法
    readUint8(buffer, offset) {
        return buffer.readUInt8(offset);
    }

    readInt8(buffer, offset) {
        return buffer.readInt8(offset);
    }

    readUint16(buffer, offset) {
        return buffer.readUInt16LE(offset);
    }

    readInt16(buffer, offset) {
        return buffer.readInt16LE(offset);
    }

    readUint32(buffer, offset) {
        return buffer.readUInt32LE(offset);
    }

    readInt32(buffer, offset) {
        return buffer.readInt32LE(offset);
    }

    readFloat16(buffer, offset) {
        // 16位浮点数转换（假设为IEEE半精度）
        const uint16 = this.readUint16(buffer, offset);
        return this.convertFloat16To32(uint16);
    }

    readFloat32(buffer, offset) {
        return buffer.readFloatLE(offset);
    }

    // 16位浮点数转32位浮点数
    convertFloat16To32(uint16) {
        // 简化的转换，实际应用中可能需要更精确的转换
        const sign = (uint16 & 0x8000) ? -1 : 1;
        const exponent = (uint16 & 0x7C00) >> 10;
        const fraction = uint16 & 0x03FF;
        
        if (exponent === 0) {
            return sign * Math.pow(2, -14) * (fraction / 1024);
        } else if (exponent === 31) {
            return sign * (fraction ? NaN : Infinity);
        }
        
        return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
    }

    // 获取错误消息
    getErrorMessage(errorCode) {
        const errorMessages = {
            0x01: '过流保护',
            0x02: '过压保护',
            0x03: '欠压保护',
            0x04: '过温保护',
            0x05: '通信超时',
            0x06: '编码器故障',
            0x07: '硬件故障',
            0x08: '参数错误'
        };
        
        return errorMessages[errorCode] || '未知错误';
    }

    // 更新统计数据
    updateStats(timestamp) {
        if (this.stats.lastPacketTime) {
            const timeDiff = timestamp - this.stats.lastPacketTime;
            this.stats.dataRate = 1000 / timeDiff; // 数据率（包/秒）
        }
        this.stats.lastPacketTime = timestamp;
    }

    // 缓存数据
    cacheData(data) {
        const key = data.timestamp;
        this.dataCache.set(key, data);
        
        // 维护缓存大小
        if (this.dataCache.size > this.cacheSize) {
            const oldestKey = Array.from(this.dataCache.keys())[0];
            this.dataCache.delete(oldestKey);
        }
    }

    // 获取缓存数据
    getCachedData(startTime, endTime) {
        const result = [];
        
        for (const [timestamp, data] of this.dataCache.entries()) {
            if (timestamp >= startTime && timestamp <= endTime) {
                result.push(data);
            }
        }
        
        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    // 清空缓存
    clearCache() {
        this.dataCache.clear();
    }

    // 获取统计数据
    getStatistics() {
        return { ...this.stats };
    }

    // 重置统计数据
    resetStatistics() {
        this.stats = {
            totalPackets: 0,
            validPackets: 0,
            invalidPackets: 0,
            lastPacketTime: null,
            dataRate: 0
        };
    }

    // 生成FOC控制命令
    generateCommand(commandType, data = Buffer.alloc(0)) {
        const header = Buffer.from([this.packetStructure.header]);
        const length = 6 + data.length; // 包头+长度+类型+命令+数据+校验和+包尾
        const type = this.dataTypes.COMMAND_RESPONSE;
        
        let packet = Buffer.concat([
            header,
            Buffer.from([length]),
            Buffer.from([type]),
            Buffer.from([commandType]),
            data
        ]);
        
        // 计算校验和
        let checksum = 0;
        for (let i = 2; i < packet.length; i++) {
            checksum += packet[i];
        }
        checksum = checksum & 0xFF;
        
        // 添加校验和和包尾
        packet = Buffer.concat([
            packet,
            Buffer.from([checksum]),
            Buffer.from([this.packetStructure.footer])
        ]);
        
        return packet;
    }

    // 生成常用的控制命令
    generateSpeedCommand(speed) {
        const data = Buffer.alloc(2);
        data.writeInt16LE(speed, 0);
        return this.generateCommand(0x01, data); // 速度控制命令
    }

    generatePositionCommand(position) {
        const data = Buffer.alloc(2);
        data.writeInt16LE(position, 0);
        return this.generateCommand(0x02, data); // 位置控制命令
    }

    generateTorqueCommand(torque) {
        const data = Buffer.alloc(2);
        data.writeInt16LE(torque, 0);
        return this.generateCommand(0x03, data); // 转矩控制命令
    }

    generateParameterReadCommand(parameterId) {
        const data = Buffer.from([parameterId]);
        return this.generateCommand(0x04, data); // 参数读取命令
    }

    generateParameterWriteCommand(parameterId, value) {
        const data = Buffer.alloc(5);
        data.writeUInt8(parameterId, 0);
        data.writeFloatLE(value, 1);
        return this.generateCommand(0x05, data); // 参数写入命令
    }

    // 销毁处理器
    destroy() {
        this.dataBuffer = Buffer.alloc(0);
        this.dataCache.clear();
        this.callbacks = {
            onDataReceived: null,
            onError: null,
            onStatusChange: null
        };
    }
}

module.exports = FOCDataProcessor;