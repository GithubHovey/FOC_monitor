class CustomDataSenderUI {
    constructor() {
        this.customDataSender = null;
        this.isConnected = false;
        
        // 初始化DOM元素
        this.initializeElements();
        
        // 等待DOM加载完成后再绑定事件
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
            });
        } else {
            this.bindEvents();
        }
    }

    // 初始化自定义数据发送器
    initialize(sender) {
        this.customDataSender = sender;
        
        // 监听连接状态变化
        this.customDataSender.on('connected', () => {
            this.isConnected = true;
            this.updateUIState();
        });
        
        this.customDataSender.on('disconnected', () => {
            this.isConnected = false;
            this.updateUIState();
        });
        
        // 监听发送结果
        this.customDataSender.on('sendSuccess', (data) => {
            this.showMessage('数据发送成功', 'success');
            this.logSendResult(data, true);
        });
        
        this.customDataSender.on('sendError', (error) => {
            this.showMessage('发送失败: ' + error.error.message, 'error');
            this.logSendResult(error, false);
        });
    }

    // 初始化DOM元素
    initializeElements() {
        this.elements = {
            dataFormatSelect: document.getElementById('data-format-select'),
            customDataInput: document.getElementById('custom-data-input'),
            sendDataBtn: document.getElementById('send-data-btn'),
            clearDataBtn: document.getElementById('clear-data-btn'),
            testPatternSelect: document.getElementById('test-pattern-select'),
            patternLengthInput: document.getElementById('pattern-length'),
            generatePatternBtn: document.getElementById('generate-pattern-btn')
        };
    }

    // 绑定事件
    bindEvents() {
        // 检查元素是否存在
        if (!this.elements.sendDataBtn || !this.elements.clearDataBtn || !this.elements.generatePatternBtn || !this.elements.customDataInput) {
            console.warn('自定义数据发送器元素未找到，事件绑定失败');
            return;
        }

        this.elements.sendDataBtn.addEventListener('click', () => {
            this.sendCustomData();
        });

        this.elements.clearDataBtn.addEventListener('click', () => {
            this.clearData();
        });

        this.elements.generatePatternBtn.addEventListener('click', () => {
            this.generateTestPattern();
        });

        // 回车键发送
        this.elements.customDataInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.sendCustomData();
            }
        });
    }

    // 发送自定义数据
    async sendCustomData() {
        if (!this.isConnected) {
            this.showMessage('请先连接串口', 'warning');
            return;
        }

        const data = this.elements.customDataInput.value.trim();
        const format = this.elements.dataFormatSelect.value;

        if (!data) {
            this.showMessage('请输入要发送的数据', 'warning');
            return;
        }

        try {
            this.elements.sendDataBtn.disabled = true;
            this.elements.sendDataBtn.textContent = '发送中...';
            
            const success = await this.customDataSender.sendCustomData(data, format);
            
            if (success) {
                this.elements.customDataInput.value = '';
            }
            
        } catch (error) {
            console.error('发送数据失败:', error);
            this.showMessage('发送失败: ' + error.message, 'error');
        } finally {
            this.elements.sendDataBtn.disabled = false;
            this.elements.sendDataBtn.textContent = '发送数据';
        }
    }

    // 生成测试模式
    generateTestPattern() {
        const patternType = this.elements.testPatternSelect.value;
        const length = parseInt(this.elements.patternLengthInput.value) || 16;

        if (length < 1 || length > 256) {
            this.showMessage('长度必须在1-256之间', 'warning');
            return;
        }

        try {
            const pattern = this.customDataSender.generateTestPattern(patternType, length);
            
            // 根据当前选择的格式显示模式
            const format = this.elements.dataFormatSelect.value;
            let displayText = '';

            switch (format) {
                case 'hex':
                    displayText = Array.from(pattern).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    break;
                case 'decimal':
                    displayText = Array.from(pattern).join(' ');
                    break;
                case 'binary':
                    displayText = Array.from(pattern).map(b => b.toString(2).padStart(8, '0')).join(' ');
                    break;
                default:
                    displayText = pattern.toString('ascii');
            }

            this.elements.customDataInput.value = displayText;
            
        } catch (error) {
            this.showMessage('生成模式失败: ' + error.message, 'error');
        }
    }

    // 清除数据
    clearData() {
        this.elements.customDataInput.value = '';
        this.showMessage('已清除输入数据', 'info');
    }

    // 更新UI状态
    updateUIState() {
        const elements = [
            this.elements.sendDataBtn,
            this.elements.clearDataBtn,
            this.elements.generatePatternBtn
        ];

        elements.forEach(element => {
            element.disabled = !this.isConnected;
        });

        if (!this.isConnected) {
            this.elements.customDataInput.placeholder = '请先连接串口...';
        } else {
            this.elements.customDataInput.placeholder = '输入要发送的数据...';
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            color: white;
            z-index: 1000;
            font-size: 14px;
        `;

        // 根据类型设置背景色
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;

        // 添加到页面
        document.body.appendChild(messageEl);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // 记录发送结果
    logSendResult(result, success) {
        const logEntry = {
            timestamp: new Date().toLocaleString(),
            success: success,
            data: result.data,
            format: result.format,
            type: result.type || 'custom_data'
        };

        console.log('发送记录:', logEntry);
        
        // 这里可以添加将日志保存到文件或数据库的功能
    }

    // 批量发送数据
    async sendBatch(dataArray, format = 'hex', interval = 100) {
        if (!this.isConnected) {
            this.showMessage('请先连接串口', 'warning');
            return [];
        }

        try {
            this.elements.sendDataBtn.disabled = true;
            this.elements.sendDataBtn.textContent = '批量发送中...';
            
            const results = await this.customDataSender.sendBatch(dataArray, format, interval);
            
            // 统计结果
            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;
            
            this.showMessage(`批量发送完成: ${successCount}/${totalCount} 成功`, 'info');
            
            return results;
            
        } catch (error) {
            console.error('批量发送失败:', error);
            this.showMessage('批量发送失败: ' + error.message, 'error');
            return [];
        } finally {
            this.elements.sendDataBtn.disabled = false;
            this.elements.sendDataBtn.textContent = '发送数据';
        }
    }

    // 销毁
    destroy() {
        // 移除事件监听器
        if (this.elements.sendDataBtn) {
            this.elements.sendDataBtn.removeEventListener('click', this.sendCustomData);
        }
        if (this.elements.clearDataBtn) {
            this.elements.clearDataBtn.removeEventListener('click', this.clearData);
        }
        if (this.elements.generatePatternBtn) {
            this.elements.generatePatternBtn.removeEventListener('click', this.generateTestPattern);
        }
        
        this.customDataSender = null;
    }
}

// module.exports = CustomDataSenderUI;