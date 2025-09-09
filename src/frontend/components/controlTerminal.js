class ControlTerminal {
    constructor(serialManager) {
        this.serialManager = serialManager;
        this.isConnected = false;
        this.elements = {};
        
        this.initializeElements();
        this.bindEvents();
        
        // 监听串口连接状态变化（使用前端serialManager的事件）
        if (this.serialManager.onData) {
            // 监听数据接收
            this.serialManager.onData((data) => {
                // 可以在这里处理接收到的数据
            });
        }
        
        if (this.serialManager.onError) {
            // 监听错误
            this.serialManager.onError((error) => {
                console.error('串口错误:', error);
            });
        }
        
        // 前端serialManager没有直接的连接状态事件
        // 连接状态需要通过其他方式获取，比如定期检查或UI状态同步
    }

    // 发送自定义数据（内部方法）
    async _sendCustomData(data, format) {
        if (!this.isConnected) {
            throw new Error('串口未连接');
        }

        try {
            // 根据格式转换数据
            let dataToSend;
            switch (format) {
                case 'hex':
                    // 十六进制处理
                    dataToSend = this.hexStringToBuffer(data);
                    break;
                case 'ascii':
                case 'utf8':
                    dataToSend = new TextEncoder().encode(data);
                    break;
                case 'decimal':
                    dataToSend = this.decimalStringToBuffer(data);
                    break;
                case 'binary':
                    dataToSend = this.binaryStringToBuffer(data);
                    break;
                default:
                    dataToSend = new TextEncoder().encode(data);
            }

            // 通过串口管理器发送数据
            await this.serialManager.sendData(dataToSend);
            return true;
        } catch (error) {
            console.error('发送数据失败:', error);
            throw error;
        }
    }

    // 十六进制字符串转Buffer
    hexStringToBuffer(hexString) {
        // 移除空格和0x前缀
        const cleanHex = hexString.replace(/\s|0x/gi, '');
        
        // 确保长度为偶数
        if (cleanHex.length % 2 !== 0) {
            throw new Error('十六进制字符串长度必须为偶数');
        }
        
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
            const byte = parseInt(cleanHex.substr(i, 2), 16);
            if (isNaN(byte)) {
                throw new Error('无效的十六进制字符');
            }
            bytes.push(byte);
        }
        
        return new Uint8Array(bytes);
    }

    // 十进制字符串转Buffer
    decimalStringToBuffer(decimalString) {
        const numbers = decimalString.split(/[,\s]+/).filter(Boolean);
        const bytes = [];
        
        for (const numStr of numbers) {
            const num = parseInt(numStr, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                throw new Error('无效的十进制值，必须在0-255之间');
            }
            bytes.push(num);
        }
        
        return new Uint8Array(bytes);
    }

    // 二进制字符串转Buffer
    binaryStringToBuffer(binaryString) {
        const binaries = binaryString.split(/[,\s]+/).filter(Boolean);
        const bytes = [];
        
        for (const binStr of binaries) {
            if (!/^[01]{1,8}$/.test(binStr)) {
                throw new Error('无效的二进制值，必须是1-8位二进制数');
            }
            const byte = parseInt(binStr, 2);
            bytes.push(byte);
        }
        
        return new Uint8Array(bytes);
    }

    // 初始化DOM元素
    initializeElements() {
        this.elements = {
            dataFormatSelect: document.getElementById('data-format-select'),
            customDataInput: document.getElementById('custom-data-input'),
            sendDataBtn: document.getElementById('send-data-btn'),
            clearDataBtn: document.getElementById('clear-data-btn')
        };
    }

    // 绑定事件
    bindEvents() {
        // 检查元素是否存在
        if (!this.elements.sendDataBtn || !this.elements.clearDataBtn || !this.elements.customDataInput) {
            console.warn('控制终端元素未找到，事件绑定失败');
            return;
        }

        this.elements.sendDataBtn.addEventListener('click', () => {
            this.sendCustomData();
        });

        this.elements.clearDataBtn.addEventListener('click', () => {
            this.clearData();
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
            
            const success = await this._sendCustomData(data, format);
            
            if (success) {
                this.elements.customDataInput.value = '';
                this.showMessage('数据发送成功', 'success');
            }
            
        } catch (error) {
            console.error('发送数据失败:', error);
            this.showMessage('发送失败: ' + error.message, 'error');
        } finally {
            this.elements.sendDataBtn.disabled = false;
            this.elements.sendDataBtn.textContent = '发送数据';
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
            this.elements.clearDataBtn
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

    // 记录发送结果
    logSendResult(result, success) {
        console.log(`${success ? '✓' : '✗'} 数据发送结果:`, result);
    }
}

// 导出模块
export default ControlTerminal;