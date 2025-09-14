/**
 * 数据通信管理器
 * 处理十六进制数据的发送和接收显示
 */
class DataCommunicationManager {
    constructor(serialManager) {
        this.serialManager = serialManager;
        this.sendHistory = [];
        this.receiveHistory = [];
        this.maxHistorySize = 1000;
        
        this.initializeElements();
        this.bindEvents();
        this.setupSerialListeners();
    }

    initializeElements() {
        this.elements = {
            sendDataDisplay: document.getElementById('send-data-display'),
            receiveDataDisplay: document.getElementById('receive-data-display'),
            hexInput: document.getElementById('hex-input'),
            sendHexBtn: document.getElementById('send-hex-btn'),
            clearSendBtn: document.getElementById('clear-send-btn'),
            clearReceiveBtn: document.getElementById('clear-receive-btn'),
            saveReceiveBtn: document.getElementById('save-receive-btn'),
            showRawDataCheckbox: document.getElementById('show-raw-data')
        };
    }

    bindEvents() {
        // 发送按钮点击事件
        this.elements.sendHexBtn.addEventListener('click', () => {
            this.sendHexData();
        });

        // 清空发送记录
        this.elements.clearSendBtn.addEventListener('click', () => {
            this.clearSendHistory();
        });

        // 清空接收记录
        this.elements.clearReceiveBtn.addEventListener('click', () => {
            this.clearReceiveHistory();
        });

        // 保存接收记录
        this.elements.saveReceiveBtn.addEventListener('click', () => {
            this.saveReceiveData();
        });

        // 回车键发送
        this.elements.hexInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendHexData();
            }
        });

        // 输入验证
        this.elements.hexInput.addEventListener('input', (e) => {
            this.validateHexInput(e.target);
        });

        // 原始数据显示控制
        this.elements.showRawDataCheckbox.addEventListener('change', () => {
            this.toggleRawDataDisplay();
        });
    }

    setupSerialListeners() {
        // 监听串口数据接收
        if (this.serialManager.onData) {
            this.serialManager.onData((data) => {
                this.handleReceivedData(data);
            });
        }
    }

    validateHexInput(input) {
        // 只允许十六进制字符和空格
        const value = input.value;
        const cleanValue = value.replace(/[^0-9a-fA-F\s]/g, '');
        if (value !== cleanValue) {
            input.value = cleanValue;
        }
    }

    async sendHexData() {
        const hexString = this.elements.hexInput.value.trim();
        if (!hexString) {
            this.showMessage('请输入十六进制数据', 'warning');
            return;
        }

        try {
            // 验证十六进制格式
            const cleanHex = hexString.replace(/\s/g, '');
            if (cleanHex.length % 2 !== 0) {
                this.showMessage('十六进制字符串长度必须为偶数', 'error');
                return;
            }

            // 转换为字节数组
            const bytes = this.hexStringToBytes(cleanHex);
            
            // 通过串口发送
            await this.serialManager.sendData(new Uint8Array(bytes));
            
            // 记录发送历史
            this.recordSendData(bytes, hexString);
            
            // 清空输入框
            this.elements.hexInput.value = '';
            
            this.showMessage('数据发送成功', 'success');
            
        } catch (error) {
            console.error('发送数据失败:', error);
            this.showMessage('发送失败: ' + error.message, 'error');
        }
    }

    hexStringToBytes(hexString) {
        const bytes = [];
        for (let i = 0; i < hexString.length; i += 2) {
            const byte = parseInt(hexString.substr(i, 2), 16);
            if (isNaN(byte)) {
                throw new Error('无效的十六进制字符');
            }
            bytes.push(byte);
        }
        return bytes;
    }

    recordSendData(bytes, originalHex) {
        const timestamp = new Date().toLocaleTimeString();
        const hexDisplay = this.bytesToHexString(bytes);
        
        this.sendHistory.push({
            timestamp,
            bytes,
            hex: hexDisplay
        });

        // 限制历史记录大小
        if (this.sendHistory.length > this.maxHistorySize) {
            this.sendHistory.shift();
        }

        // 更新显示
        this.updateSendDisplay();
    }

    handleReceivedData(data) {
        const timestamp = new Date().toLocaleTimeString();
        let bytes;
        
        // 处理不同格式的数据
        if (data.raw) {
            // 来自FOC协议解析器的原始数据
            bytes = Array.from(new Uint8Array(data.raw));
        } else if (data.data) {
            // 来自FOC协议解析器的数据部分
            bytes = Array.from(new Uint8Array(data.data));
        } else {
            // 直接来自串口的原始数据
            bytes = Array.from(new Uint8Array(data));
        }
        
        const hexDisplay = this.bytesToHexString(bytes);
        
        this.receiveHistory.push({
            timestamp,
            bytes,
            hex: hexDisplay
        });

        // 限制历史记录大小
        if (this.receiveHistory.length > this.maxHistorySize) {
            this.receiveHistory.shift();
        }

        // 更新显示（如果启用了原始数据显示）
        if (this.elements.showRawDataCheckbox.checked) {
            this.updateReceiveDisplay();
        }
        

    }

    bytesToHexString(bytes) {
        return bytes.map(byte => 
            byte.toString(16).padStart(2, '0').toUpperCase()
        ).join(' ');
    }

    updateSendDisplay() {
        if (!this.elements.sendDataDisplay) return;

        const displayText = this.sendHistory
            .slice(-50) // 只显示最近50条
            .map(item => `[${item.timestamp}] ${item.hex}`)
            .join('\n');

        this.elements.sendDataDisplay.value = displayText;
        this.elements.sendDataDisplay.scrollTop = this.elements.sendDataDisplay.scrollHeight;
    }

    updateReceiveDisplay() {
        if (!this.elements.receiveDataDisplay) return;

        const displayText = this.receiveHistory
            .slice(-50) // 只显示最近50条
            .map(item => `[${item.timestamp}] ${item.hex}`)
            .join('\n');

        this.elements.receiveDataDisplay.value = displayText;
        this.elements.receiveDataDisplay.scrollTop = this.elements.receiveDataDisplay.scrollHeight;
    }

    clearSendHistory() {
        this.sendHistory = [];
        this.updateSendDisplay();
        this.showMessage('已清空发送记录', 'info');
    }

    clearReceiveHistory() {
        this.receiveHistory = [];
        this.updateReceiveDisplay();
        this.showMessage('已清空接收记录', 'info');
    }

    toggleRawDataDisplay() {
        if (this.elements.showRawDataCheckbox.checked) {
            // 如果启用显示，立即更新显示
            this.updateReceiveDisplay();
        } else {
            // 如果禁用显示，清空显示区域
            this.elements.receiveDataDisplay.value = '';
        }
    }

    saveReceiveData() {
        if (this.receiveHistory.length === 0) {
            this.showMessage('没有可保存的数据', 'warning');
            return;
        }

        const content = this.receiveHistory
            .map(item => `${item.timestamp}\t${item.hex}\t${item.bytes.join(' ')}`)
            .join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `received_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showMessage('数据已保存', 'success');
    }

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
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        // 设置不同消息类型的背景色
        switch (type) {
            case 'success':
                messageEl.style.backgroundColor = '#28a745';
                break;
            case 'error':
                messageEl.style.backgroundColor = '#dc3545';
                break;
            case 'warning':
                messageEl.style.backgroundColor = '#ffc107';
                messageEl.style.color = '#212529';
                break;
            default:
                messageEl.style.backgroundColor = '#17a2b8';
        }

        document.body.appendChild(messageEl);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // 外部调用的方法
    addSendRecord(bytes, description = '') {
        const timestamp = new Date().toLocaleTimeString();
        const hexDisplay = this.bytesToHexString(bytes);
        
        this.sendHistory.push({
            timestamp,
            bytes,
            hex: hexDisplay,
            description
        });

        if (this.sendHistory.length > this.maxHistorySize) {
            this.sendHistory.shift();
        }

        this.updateSendDisplay();
    }

    addReceiveRecord(bytes, description = '') {
        const timestamp = new Date().toLocaleTimeString();
        const hexDisplay = this.bytesToHexString(bytes);
        
        this.receiveHistory.push({
            timestamp,
            bytes,
            hex: hexDisplay,
            description
        });

        if (this.receiveHistory.length > this.maxHistorySize) {
            this.receiveHistory.shift();
        }

        this.updateReceiveDisplay();
    }
}

// 导出模块
export default DataCommunicationManager;