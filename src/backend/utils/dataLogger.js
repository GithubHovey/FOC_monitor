const fs = require('fs');
const path = require('path');

class DataLogger {
    constructor(config = {}) {
        this.config = {
            enabled: false,
            autoStart: false,
            fileFormat: 'csv',
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            logDirectory: './logs',
            includeTimestamp: true,
            includeRawData: false,
            ...config
        };
        
        this.currentFile = null;
        this.currentFileSize = 0;
        this.isLogging = false;
        this.startTime = null;
        this.logCount = 0;
        this.dataBuffer = [];
        this.flushInterval = null;
        
        // 确保日志目录存在
        this.ensureLogDirectory();
        
        // 自动开始记录（如果配置为自动开始）
        if (this.config.autoStart) {
            this.startLogging();
        }
    }

    // 确保日志目录存在
    ensureLogDirectory() {
        if (!fs.existsSync(this.config.logDirectory)) {
            fs.mkdirSync(this.config.logDirectory, { recursive: true });
        }
    }

    // 开始记录数据
    startLogging() {
        if (this.isLogging) {
            console.warn('数据记录已经在进行中');
            return false;
        }

        try {
            this.createNewLogFile();
            this.isLogging = true;
            this.startTime = Date.now();
            this.logCount = 0;
            
            // 设置定期刷新缓冲区
            this.flushInterval = setInterval(() => {
                this.flushBuffer();
            }, 1000); // 每秒刷新一次
            
            console.log('数据记录已开始');
            return true;
            
        } catch (error) {
            console.error('启动数据记录失败:', error);
            return false;
        }
    }

    // 停止记录数据
    stopLogging() {
        if (!this.isLogging) {
            console.warn('数据记录未在进行中');
            return false;
        }

        try {
            // 刷新剩余数据
            this.flushBuffer(true);
            
            // 关闭当前文件
            if (this.currentFile) {
                this.currentFile.end();
                this.currentFile = null;
            }
            
            // 清除定时器
            if (this.flushInterval) {
                clearInterval(this.flushInterval);
                this.flushInterval = null;
            }
            
            this.isLogging = false;
            console.log('数据记录已停止');
            return true;
            
        } catch (error) {
            console.error('停止数据记录失败:', error);
            return false;
        }
    }

    // 创建新的日志文件
    createNewLogFile() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `foc-data-${timestamp}.${this.config.fileFormat}`;
        const filePath = path.join(this.config.logDirectory, fileName);
        
        this.currentFile = fs.createWriteStream(filePath, { flags: 'a' });
        this.currentFileSize = 0;
        
        // 写入文件头（如果是CSV格式）
        if (this.config.fileFormat === 'csv') {
            const header = this.generateCSVHeader();
            this.writeToFile(header);
        }
        
        console.log('创建新的日志文件:', filePath);
        return filePath;
    }

    // 生成CSV文件头
    generateCSVHeader() {
        const headers = [
            'timestamp',
            'elapsed_time',
            'phase_current_u',
            'phase_current_v', 
            'phase_current_w',
            'bus_voltage',
            'motor_speed',
            'motor_position',
            'torque_current',
            'flux_current',
            'temperature',
            'status'
        ];
        
        if (this.config.includeRawData) {
            headers.push('raw_data');
        }
        
        return headers.join(',') + '\n';
    }

    // 记录数据
    logData(data) {
        if (!this.isLogging) {
            return false;
        }

        try {
            // 检查文件大小，如果需要则创建新文件
            if (this.currentFileSize >= this.config.maxFileSize) {
                this.rotateLogFile();
            }
            
            // 格式化数据
            const formattedData = this.formatData(data);
            
            // 添加到缓冲区
            this.dataBuffer.push(formattedData);
            
            // 如果缓冲区太大，立即刷新
            if (this.dataBuffer.length >= 100) {
                this.flushBuffer();
            }
            
            this.logCount++;
            return true;
            
        } catch (error) {
            console.error('记录数据失败:', error);
            return false;
        }
    }

    // 格式化数据
    formatData(data) {
        const elapsedTime = Date.now() - this.startTime;
        
        let formattedData;
        
        if (this.config.fileFormat === 'csv') {
            const fields = [
                data.timestamp || Date.now(),
                elapsedTime,
                data.phaseCurrentU || 0,
                data.phaseCurrentV || 0,
                data.phaseCurrentW || 0,
                data.busVoltage || 0,
                data.motorSpeed || 0,
                data.motorPosition || 0,
                data.torqueCurrent || 0,
                data.fluxCurrent || 0,
                data.temperature || 0,
                data.status || 0
            ];
            
            if (this.config.includeRawData && data.rawPacket) {
                fields.push(Buffer.from(data.rawPacket).toString('hex'));
            }
            
            formattedData = fields.join(',') + '\n';
            
        } else if (this.config.fileFormat === 'json') {
            const logEntry = {
                timestamp: data.timestamp || Date.now(),
                elapsed_time: elapsedTime,
                data: {
                    phase_current_u: data.phaseCurrentU || 0,
                    phase_current_v: data.phaseCurrentV || 0,
                    phase_current_w: data.phaseCurrentW || 0,
                    bus_voltage: data.busVoltage || 0,
                    motor_speed: data.motorSpeed || 0,
                    motor_position: data.motorPosition || 0,
                    torque_current: data.torqueCurrent || 0,
                    flux_current: data.fluxCurrent || 0,
                    temperature: data.temperature || 0,
                    status: data.status || 0
                }
            };
            
            if (this.config.includeRawData && data.rawPacket) {
                logEntry.raw_data = Buffer.from(data.rawPacket).toString('hex');
            }
            
            formattedData = JSON.stringify(logEntry) + '\n';
        }
        
        return formattedData;
    }

    // 刷新缓冲区到文件
    flushBuffer(force = false) {
        if (this.dataBuffer.length === 0) {
            return;
        }

        if (force || this.dataBuffer.length >= 50) {
            try {
                const dataToWrite = this.dataBuffer.join('');
                this.writeToFile(dataToWrite);
                this.dataBuffer = [];
            } catch (error) {
                console.error('刷新缓冲区失败:', error);
            }
        }
    }

    // 写入数据到文件
    writeToFile(data) {
        if (this.currentFile) {
            this.currentFile.write(data);
            this.currentFileSize += Buffer.byteLength(data, 'utf8');
        }
    }

    // 轮换日志文件
    rotateLogFile() {
        if (this.currentFile) {
            this.currentFile.end();
        }
        
        this.createNewLogFile();
        
        // 清理旧文件
        this.cleanupOldFiles();
    }

    // 清理旧文件
    cleanupOldFiles() {
        try {
            const files = fs.readdirSync(this.config.logDirectory)
                .filter(file => file.startsWith('foc-data-') && 
                               (file.endsWith('.csv') || file.endsWith('.json')))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.logDirectory, file),
                    time: fs.statSync(path.join(this.config.logDirectory, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // 最新的在前
            
            // 删除超出数量限制的文件
            if (files.length > this.config.maxFiles) {
                const filesToDelete = files.slice(this.config.maxFiles);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log('删除旧日志文件:', file.name);
                });
            }
            
        } catch (error) {
            console.error('清理旧文件失败:', error);
        }
    }

    // 获取日志统计信息
    getStats() {
        return {
            isLogging: this.isLogging,
            startTime: this.startTime,
            logCount: this.logCount,
            currentFileSize: this.currentFileSize,
            bufferSize: this.dataBuffer.length,
            config: this.config
        };
    }

    // 获取日志文件列表
    getLogFiles() {
        try {
            return fs.readdirSync(this.config.logDirectory)
                .filter(file => file.startsWith('foc-data-') && 
                               (file.endsWith('.csv') || file.endsWith('.json')))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.logDirectory, file),
                    size: fs.statSync(path.join(this.config.logDirectory, file)).size,
                    modified: fs.statSync(path.join(this.config.logDirectory, file)).mtime
                }))
                .sort((a, b) => b.modified - a.modified); // 最新的在前
        } catch (error) {
            console.error('获取日志文件列表失败:', error);
            return [];
        }
    }

    // 导出数据
    exportData(format = 'csv', startTime = null, endTime = null) {
        // 这里可以实现从日志文件中提取特定时间范围的数据
        // 由于实现较复杂，这里只返回提示
        console.log(`导出数据功能尚未完全实现，格式: ${format}`);
        return null;
    }

    // 更改配置
    updateConfig(newConfig) {
        const wasLogging = this.isLogging;
        
        if (wasLogging) {
            this.stopLogging();
        }
        
        this.config = { ...this.config, ...newConfig };
        this.ensureLogDirectory();
        
        if (wasLogging && this.config.autoStart) {
            this.startLogging();
        }
        
        return true;
    }

    // 销毁记录器
    destroy() {
        this.stopLogging();
        
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        
        if (this.currentFile) {
            this.currentFile.end();
            this.currentFile = null;
        }
        
        this.dataBuffer = [];
        console.log('数据记录器已销毁');
    }
}

module.exports = DataLogger;