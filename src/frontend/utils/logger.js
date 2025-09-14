/**
 * FOC电机控制上位机 - 日志系统
 * 提供统一的日志管理和显示功能
 */

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.unreadCount = 0;
        this.isWindowOpen = false;
        this.logLevel = 'info'; // debug, info, warn, error
        
        this.init();
    }

    init() {
        this.createLogIcon();
        this.createLogWindow();
        this.bindEvents();
        
        // 添加一些初始日志
        this.info('日志系统初始化完成');
    }

    createLogIcon() {
        const header = document.querySelector('.header');
        const statusBar = header.querySelector('.status-bar');
        
        const logIconContainer = document.createElement('div');
        logIconContainer.className = 'log-icon-container';
        logIconContainer.innerHTML = `
            <div class="log-icon-wrapper">
                <svg class="log-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2v-4h-2V9h2V7h2v2h2v4h-2v4zm-8-2h2v2H6v-2zm0-4h2v2H6v-2zm0-4h2v2H6V7zm10-2h2v2h-2V5zm4 4h-2v-2h2v2zm0 4h-2v-2h2v2zm0 4h-2v-2h2v2z"/>
                </svg>
                <span class="unread-badge" style="display: none;">!</span>
            </div>
        `;
        
        statusBar.appendChild(logIconContainer);
        this.logIconContainer = logIconContainer;
        this.unreadBadge = logIconContainer.querySelector('.unread-badge');
    }

    createLogWindow() {
        const overlay = document.createElement('div');
        overlay.className = 'log-overlay';
        
        const logWindow = document.createElement('div');
        logWindow.className = 'log-window';
        logWindow.innerHTML = `
            <div class="log-header">
                <h3>系统日志</h3>
                <div class="log-controls">
                    <button class="log-btn" id="clear-logs">清空</button>
                    <button class="log-btn" id="export-logs">导出</button>
                    <button class="log-btn" id="close-logs">关闭</button>
                </div>
            </div>
            <div class="log-content" id="log-content"></div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(logWindow);
        
        this.overlay = overlay;
        this.logWindow = logWindow;
        this.logContent = logWindow.querySelector('#log-content');
    }

    bindEvents() {
        // 点击日志图标
        this.logIconContainer.addEventListener('click', () => {
            this.toggleLogWindow();
        });

        // 关闭日志窗口
        this.logWindow.querySelector('#close-logs').addEventListener('click', () => {
            this.hideLogWindow();
        });

        // 清空日志
        this.logWindow.querySelector('#clear-logs').addEventListener('click', () => {
            this.clearLogs();
        });

        // 导出日志
        this.logWindow.querySelector('#export-logs').addEventListener('click', () => {
            this.exportLogs();
        });

        // 点击遮罩层关闭
        this.overlay.addEventListener('click', () => {
            this.hideLogWindow();
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isWindowOpen) {
                this.hideLogWindow();
            }
        });
    }

    toggleLogWindow() {
        if (this.isWindowOpen) {
            this.hideLogWindow();
        } else {
            this.showLogWindow();
        }
    }

    showLogWindow() {
        this.overlay.style.display = 'block';
        this.logWindow.style.display = 'flex';
        this.isWindowOpen = true;
        
        // 清除未读计数
        this.unreadCount = 0;
        this.updateUnreadBadge();
        
        // 滚动到底部
        this.scrollToBottom();
    }

    hideLogWindow() {
        this.overlay.style.display = 'none';
        this.logWindow.style.display = 'none';
        this.isWindowOpen = false;
    }

    addLog(level, message, data = null) {
        const timestamp = new Date();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp,
            level,
            message,
            data
        };

        this.logs.push(logEntry);

        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // 如果窗口未打开，增加未读计数
        if (!this.isWindowOpen) {
            this.unreadCount++;
            this.updateUnreadBadge();
        }

        // 添加到显示
        this.displayLog(logEntry);

        // 同时输出到控制台 - 使用安全的日志级别
        const safeLevel = ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info';
        const logMessage = `[${level.toUpperCase()}] ${message}`;
        
        try {
            if (data) {
                console[safeLevel](logMessage, data);
            } else {
                console[safeLevel](logMessage);
            }
        } catch (consoleError) {
            // 如果console方法调用失败，使用备用日志记录
            console.log(`[LOGGER-ERROR] ${logMessage}`, data || '');
        }
    }

    displayLog(logEntry) {
        const logElement = document.createElement('div');
        logElement.className = 'log-entry';
        
        const timeStr = logEntry.timestamp.toLocaleTimeString('zh-CN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        logElement.innerHTML = `
            <span class="log-timestamp">${timeStr}</span>
            <span class="log-level ${logEntry.level}">${logEntry.level}</span>
            <span class="log-message ${logEntry.level}">${this.escapeHtml(logEntry.message)}</span>
        `;

        if (logEntry.data) {
            const dataElement = document.createElement('div');
            dataElement.style.marginLeft = '135px';
            dataElement.style.marginTop = '4px';
            dataElement.style.fontSize = '11px';
            dataElement.style.color = '#8b949e';
            dataElement.style.fontFamily = 'Consolas, Monaco, monospace';
            dataElement.style.whiteSpace = 'nowrap'; // 防止换行
            dataElement.style.overflow = 'hidden';
            dataElement.style.textOverflow = 'ellipsis';
            
            // 简化数组显示，避免多行换行
            let dataStr;
            if (Array.isArray(logEntry.data)) {
                dataStr = `[${logEntry.data.map(item => 
                    typeof item === 'object' ? JSON.stringify(item) : String(item)
                ).join(', ')}]`;
            } else if (typeof logEntry.data === 'object') {
                dataStr = JSON.stringify(logEntry.data);
            } else {
                dataStr = String(logEntry.data);
            }
            
            // 限制长度，避免过长内容
            if (dataStr.length > 200) {
                dataStr = dataStr.substring(0, 197) + '...';
            }
            
            dataElement.textContent = dataStr;
            logElement.appendChild(dataElement);
        }

        this.logContent.appendChild(logElement);
        
        // 如果窗口打开，滚动到底部
        if (this.isWindowOpen) {
            this.scrollToBottom();
        }
    }

    updateUnreadBadge() {
        if (this.unreadCount > 0) {
            this.unreadBadge.style.display = 'flex';
            this.unreadBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        } else {
            this.unreadBadge.style.display = 'none';
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.logContent.scrollTop = this.logContent.scrollHeight;
        }, 100);
    }

    clearLogs() {
        this.logs = [];
        this.unreadCount = 0;
        this.updateUnreadBadge();
        this.logContent.innerHTML = '';
        this.info('日志已清空');
    }

    exportLogs() {
        const logText = this.logs.map(log => {
            const timeStr = log.timestamp.toLocaleString('zh-CN');
            return `[${timeStr}] [${log.level.toUpperCase()}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`;
        }).join('\n');

        const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `foc-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.info('日志已导出');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 日志级别方法
    debug(message, data = null) {
        if (this.shouldLog('debug')) {
            this.addLog('debug', message, data);
        }
    }

    info(message, data = null) {
        if (this.shouldLog('info')) {
            this.addLog('info', message, data);
        }
    }

    warn(message, data = null) {
        if (this.shouldLog('warn')) {
            this.addLog('warn', message, data);
        }
    }

    error(message, data = null) {
        if (this.shouldLog('error')) {
            this.addLog('error', message, data);
        }
    }

    success(message, data = null) {
        if (this.shouldLog('info')) {
            this.addLog('success', message, data);
        }
    }

    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        
        return messageLevelIndex >= currentLevelIndex;
    }

    setLogLevel(level) {
        if (['debug', 'info', 'warn', 'error'].includes(level)) {
            this.logLevel = level;
            this.info(`日志级别已设置为: ${level}`);
        }
    }

    // 获取日志统计
    getStats() {
        const stats = {
            total: this.logs.length,
            unread: this.unreadCount,
            levels: {
                debug: this.logs.filter(log => log.level === 'debug').length,
                info: this.logs.filter(log => log.level === 'info').length,
                warn: this.logs.filter(log => log.level === 'warn').length,
                error: this.logs.filter(log => log.level === 'error').length,
                success: this.logs.filter(log => log.level === 'success').length
            }
        };
        
        return stats;
    }
}

// 创建全局日志实例
window.logger = new Logger();