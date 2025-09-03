const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor(configFileName = 'foc-monitor-config.json') {
        this.configFileName = configFileName;
        this.configPath = this.getConfigPath();
        this.defaultConfig = this.getDefaultConfig();
        this.config = { ...this.defaultConfig };
        
        // 确保配置目录存在
        this.ensureConfigDirectory();
        
        // 加载现有配置
        this.loadConfig();
    }

    // 获取配置文件的完整路径
    getConfigPath() {
        const userDataPath = this.getUserDataPath();
        return path.join(userDataPath, this.configFileName);
    }

    // 获取用户数据目录
    getUserDataPath() {
        // 对于Electron应用，使用app.getPath('userData')
        // 这里使用备用方案
        const appData = process.env.APPDATA || 
                       (process.platform === 'darwin' ? 
                        path.join(process.env.HOME, 'Library', 'Application Support') : 
                        path.join(process.env.HOME, '.config'));
        
        return path.join(appData, 'FOC-Monitor');
    }

    // 确保配置目录存在
    ensureConfigDirectory() {
        const dirPath = path.dirname(this.configPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    // 获取默认配置
    getDefaultConfig() {
        return {
            // 串口配置
            serial: {
                lastPort: null,
                lastBaudRate: 115200,
                autoConnect: false,
                dataBits: 8,
                parity: 'none',
                stopBits: 1,
                flowControl: false
            },
            
            // 界面配置
            ui: {
                theme: 'light',
                language: 'zh-CN',
                fontSize: 14,
                chartRefreshRate: 100,
                dataBufferSize: 1000,
                autoScaleCharts: true,
                showGridLines: true,
                animationEnabled: true
            },
            
            // 图表配置
            charts: {
                timeRange: 30,
                maxDataPoints: 1000,
                defaultYRange: {
                    current: { min: -10, max: 10 },
                    voltage: { min: 0, max: 50 },
                    speed: { min: -1000, max: 1000 },
                    position: { min: -180, max: 180 },
                    torque: { min: -5, max: 5 }
                },
                colors: {
                    phaseCurrentU: '#FF6B6B',
                    phaseCurrentV: '#4ECDC4',
                    phaseCurrentW: '#45B7D1',
                    busVoltage: '#F9A826',
                    motorSpeed: '#6C5CE7',
                    motorPosition: '#00B894',
                    torqueCurrent: '#FD79A8',
                    fluxCurrent: '#74B9FF'
                }
            },
            
            // FOC电机参数配置
            motor: {
                // PID参数
                pid: {
                    speed: { kp: 0.5, ki: 0.1, kd: 0.01 },
                    position: { kp: 1.0, ki: 0.2, kd: 0.05 },
                    current: { kp: 0.3, ki: 0.05, kd: 0.005 }
                },
                
                // 电机限制
                limits: {
                    maxSpeed: 2000,
                    maxCurrent: 10,
                    maxVoltage: 48,
                    maxTemperature: 85
                },
                
                // 电机特性
                characteristics: {
                    polePairs: 7,
                    resistance: 0.1,
                    inductance: 0.001,
                    backEMFConstant: 0.05
                }
            },
            
            // 数据记录配置
            dataLogging: {
                enabled: false,
                autoStart: false,
                fileFormat: 'csv',
                maxFileSize: 10, // MB
                maxFiles: 10,
                logDirectory: this.getDefaultLogDirectory(),
                includeTimestamp: true,
                includeRawData: false
            },
            
            // 通信协议配置
            protocol: {
                packetHeader: 0xAA,
                packetFooter: 0x55,
                timeout: 1000, // ms
                retryCount: 3,
                checksumEnabled: true,
                autoReconnect: true,
                maxReconnectAttempts: 5
            },
            
            // 窗口配置
            window: {
                width: 1200,
                height: 800,
                x: null,
                y: null,
                maximized: false,
                alwaysOnTop: false
            },
            
            // 快捷键配置
            shortcuts: {
                connectDisconnect: 'Ctrl+Shift+C',
                startStopLogging: 'Ctrl+Shift+L',
                clearCharts: 'Ctrl+Shift+X',
                exportData: 'Ctrl+Shift+E',
                toggleFullscreen: 'F11'
            },
            
            // 更新配置
            update: {
                checkOnStartup: true,
                autoDownload: false,
                channel: 'stable'
            }
        };
    }

    // 获取默认日志目录
    getDefaultLogDirectory() {
        const userDataPath = this.getUserDataPath();
        return path.join(userDataPath, 'logs');
    }

    // 加载配置
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const loadedConfig = JSON.parse(configData);
                
                // 深度合并配置
                this.config = this.deepMerge(this.defaultConfig, loadedConfig);
                
                console.log('配置加载成功');
                return true;
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            // 使用默认配置
            this.config = { ...this.defaultConfig };
        }
        
        return false;
    }

    // 保存配置
    saveConfig() {
        try {
            const configData = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(this.configPath, configData, 'utf8');
            console.log('配置保存成功');
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }

    // 深度合并对象
    deepMerge(target, source) {
        const output = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(target[key]) && this.isObject(source[key])) {
                    output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            }
        }
        
        return output;
    }

    // 检查是否为对象
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    // 获取配置值
    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue !== null ? defaultValue : undefined;
            }
        }
        
        return value;
    }

    // 设置配置值
    set(key, value) {
        const keys = key.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!current[k] || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // 自动保存
        this.saveConfig();
        
        return true;
    }

    // 重置配置到默认值
    resetToDefault() {
        this.config = { ...this.defaultConfig };
        this.saveConfig();
        return true;
    }

    // 重置特定配置部分
    resetSection(section) {
        if (this.defaultConfig[section]) {
            this.config[section] = { ...this.defaultConfig[section] };
            this.saveConfig();
            return true;
        }
        return false;
    }

    // 导出配置
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }

    // 导入配置
    importConfig(configData) {
        try {
            const importedConfig = JSON.parse(configData);
            this.config = this.deepMerge(this.defaultConfig, importedConfig);
            this.saveConfig();
            return true;
        } catch (error) {
            console.error('导入配置失败:', error);
            return false;
        }
    }

    // 备份配置
    backupConfig(backupPath = null) {
        try {
            const backupDir = backupPath || path.join(this.getUserDataPath(), 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `config-backup-${timestamp}.json`);
            
            fs.writeFileSync(backupFile, this.exportConfig(), 'utf8');
            console.log('配置备份成功:', backupFile);
            return backupFile;
        } catch (error) {
            console.error('配置备份失败:', error);
            return null;
        }
    }

    // 恢复配置从备份
    restoreFromBackup(backupFile) {
        try {
            if (fs.existsSync(backupFile)) {
                const backupData = fs.readFileSync(backupFile, 'utf8');
                return this.importConfig(backupData);
            }
            return false;
        } catch (error) {
            console.error('恢复配置失败:', error);
            return false;
        }
    }

    // 获取所有备份文件
    getBackupFiles() {
        try {
            const backupDir = path.join(this.getUserDataPath(), 'backups');
            if (!fs.existsSync(backupDir)) {
                return [];
            }
            
            const files = fs.readdirSync(backupDir);
            return files
                .filter(file => file.startsWith('config-backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    date: fs.statSync(path.join(backupDir, file)).mtime
                }))
                .sort((a, b) => b.date - a.date);
        } catch (error) {
            console.error('获取备份文件失败:', error);
            return [];
        }
    }

    // 删除旧的备份文件
    cleanupOldBackups(maxBackups = 10) {
        try {
            const backups = this.getBackupFiles();
            if (backups.length > maxBackups) {
                const filesToDelete = backups.slice(maxBackups);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log('删除旧备份:', file.name);
                });
                return filesToDelete.length;
            }
            return 0;
        } catch (error) {
            console.error('清理备份文件失败:', error);
            return 0;
        }
    }

    // 获取配置信息摘要
    getConfigSummary() {
        return {
            configPath: this.configPath,
            configExists: fs.existsSync(this.configPath),
            configSize: fs.existsSync(this.configPath) ? fs.statSync(this.configPath).size : 0,
            lastModified: fs.existsSync(this.configPath) ? fs.statSync(this.configPath).mtime : null,
            backupCount: this.getBackupFiles().length
        };
    }

    // 销毁配置管理器
    destroy() {
        // 保存当前配置
        this.saveConfig();
        
        // 清理旧的备份
        this.cleanupOldBackups();
    }
}

module.exports = ConfigManager;