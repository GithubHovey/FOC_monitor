// FOC电机控制上位机 - 主应用脚本

import DataCommunicationManager from '../utils/dataCommunication.js';

class FOCMonitorApp {
    constructor() {
        this.isInitialized = false;
        this.isPaused = false;
        this.dataPoints = 0;
        this.startTime = Date.now();
        this.chartManager = null;
        this.serialManager = window.serialManager;
        this.visibilityManager = null;
        this.visibilityPanel = null;
        
        this.init();
    }

    // 初始化应用
    async init() {
        try {
            console.log('正在初始化FOC电机控制上位机...');
            
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }

            // 初始化各个模块
        await this.initChartManager();
        await this.initVisibilityManager();
// 初始化事件监听器
        this.initEventListeners();
        this.initSerialPorts();
        this.initCurveSelection();

        this.initDataCommunication();
        this.initModeControls();
        this.initRWDataControls();
        this.startStatusUpdates();

            this.isInitialized = true;
            console.log('FOC电机控制上位机初始化完成');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败: ' + error.message);
        }
    }

    // 初始化图表管理器
    async initChartManager() {
        try {
            // 使用全局图表管理器
            this.chartManager = new window.ChartManager('main-chart');
            
            // 初始化默认图表，显示所有重要参数
            this.chartManager.init({
                type: 'line',
                data: {
                    datasets: [
                        this.createDataset('相电流A (A)', '#FF6384'),
                        this.createDataset('相电流B (A)', '#36A2EB'),
                        this.createDataset('相电流C (A)', '#FFCE56'),
                        this.createDataset('Vq_ref (V)', '#4BC0C0'),
                        this.createDataset('RPM_ref', '#FF9F40'),
                        this.createDataset('RPM', '#9966FF')
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 0
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            title: {
                                display: true,
                                text: '时间 (秒)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: '数值'
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('图表管理器初始化失败:', error);
            throw new Error('无法初始化图表系统');
        }
    }

    // 初始化可视性管理器
    async initVisibilityManager() {
        try {
            // 使用全局可视性管理器
            this.visibilityManager = window.visibilityManager;
            this.visibilityPanel = window.visibilityPanel;
            
            // 加载CSS样式
            this.loadVisibilityStyles();
            
            // 注册可视性变化回调
            if (this.visibilityManager && this.visibilityManager.onVisibilityChange) {
                this.visibilityManager.onVisibilityChange((paramId, isVisible) => {
                    this.handleVisibilityChange(paramId, isVisible);
                });
            }
            
            console.log('可视性管理器初始化完成');
            
        } catch (error) {
            console.error('可视性管理器初始化失败:', error);
        }
    }

    // 加载可视性样式
    loadVisibilityStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '../styles/visibility.css';
        document.head.appendChild(link);
    }

    // 初始化事件监听器
    initEventListeners() {
        // 可视性控制按钮事件 - 如果按钮存在则绑定
        const visibilityBtn = document.getElementById('visibility-btn');
        if (visibilityBtn) {
            visibilityBtn.addEventListener('click', () => {
                this.toggleVisibilityPanel();
            });
        }



        // 控制按钮事件
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearChart();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // 调试日志按钮事件
        document.getElementById('debug-log-btn').addEventListener('click', () => {
            this.toggleDebugLog();
        });

        document.getElementById('export-log-btn').addEventListener('click', () => {
            this.exportDebugLog();
        });

        // 串口连接按钮事件
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.toggleSerialConnection();
        });

        // 串口管理器事件
        this.serialManager.onData((data) => {
            this.handleSerialData(data);
        });

        this.serialManager.onError((error) => {
            this.showError('串口错误: ' + error);
        });
    }

    // 初始化串口列表
    async initSerialPorts() {
        try {
            const ports = await this.serialManager.getAvailablePorts();
            const select = document.getElementById('serial-port-select');
            
            // 清空现有选项（保留第一个提示选项）
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // 添加新的串口选项
            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = `${port.path} - ${port.manufacturer || '未知设备'}`;
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('获取串口列表失败:', error);
        }
    }

    // 初始化数据通信管理器
    initDataCommunication() {
        // 使用全局的serialManager实例
        this.dataCommunication = new DataCommunicationManager(window.serialManager);
    }

    // 切换页面
    switchPage(page) {
        // 移除所有页面的active类
        document.querySelectorAll('.menu-item').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 为当前页面添加active类
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        // 这里可以添加具体的页面切换逻辑
        console.log('切换到页面:', page);
    }



    // 创建数据集配置
    createDataset(label, color) {
        // 提取参数ID用于曲线选择功能
        let paramId = '';
        if (label.includes('相电流A')) paramId = 'ia';
        else if (label.includes('相电流B')) paramId = 'ib';
        else if (label.includes('相电流C')) paramId = 'ic';
        else if (label.includes('Vq_ref')) paramId = 'vq_ref';
        else if (label.includes('Vd_ref')) paramId = 'vd_ref';
        else if (label.includes('Vq')) paramId = 'vq';
        else if (label.includes('Vd')) paramId = 'vd';
        else if (label.includes('目标转速')) paramId = 'rpm_ref';
        else if (label.includes('当前转速')) paramId = 'rpm';
        else if (label.includes('目标位置')) paramId = 'position_ref';
        else if (label.includes('当前位置')) paramId = 'position';
        
        return {
            label: label,
            borderColor: color,
            backgroundColor: color + '20', // 添加透明度
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            data: [],
            paramId: paramId // 添加参数ID用于曲线选择
        };
    }

    // 切换串口连接状态
    async toggleSerialConnection() {
        const connectBtn = document.getElementById('connect-btn');
        const portSelect = document.getElementById('serial-port-select');
        const baudRateSelect = document.getElementById('baud-rate-select');
        
        if (this.serialManager.isConnected) {
            // 断开连接
            await this.serialManager.closePort();
            connectBtn.textContent = '连接';
            connectBtn.classList.remove('connected');
            this.updateConnectionStatus(false);
        } else {
            // 连接串口
            const portName = portSelect.value;
            const baudRate = parseInt(baudRateSelect.value);
            
            if (!portName) {
                this.showError('请选择串口');
                return;
            }
            
            const success = await this.serialManager.openPort(portName, baudRate);
            
            if (success) {
                connectBtn.textContent = '断开';
                connectBtn.classList.add('connected');
                this.updateConnectionStatus(true);
            }
        }
    }

    // 更新连接状态显示
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        
        if (connected) {
            statusElement.textContent = '已连接';
            statusElement.className = 'status-online';
        } else {
            statusElement.textContent = '未连接';
            statusElement.className = 'status-offline';
        }
    }

    // 处理串口数据
    handleSerialData(data) {
        if (this.isPaused) return;
        
        this.dataPoints++;
        
        // 更新数据速率显示
        this.updateDataRate();
        
        // 将所有接收到的数据以16进制形式显示在读写栏中
        if (data.raw) {
            // 显示原始16进制数据
            this.displayReceivedHex(data.raw);
        } else if (data.data) {
            // 显示数据部分
            this.displayReceivedHex(data.data);
        }
        
        if (data.type === 'foc_data') {
            // 处理FOC协议数据
            this.processFOCData(data);
        } else if (data.type === 'raw_data') {
            // 处理原始数据
            console.log('收到原始数据:', data.text);
        }
    }

    // 处理FOC协议数据
    processFOCData(data) {
        const currentTime = (Date.now() - this.startTime) / 1000; // 转换为秒
        
        switch (data.command) {
            case 0x01: // 读取电机参数
                this.processMotorParameters(data.data, currentTime);
                break;
            case 0x02: // 控制模式响应
                console.log('控制模式设置响应:', data.data);
                break;
            case 0x03: // 目标值设置响应
                console.log('目标值设置响应:', data.data);
                break;
            default:
                console.log('未知命令:', data.command, '数据:', data.data);
        }
    }

    // 处理电机参数数据
    processMotorParameters(data, timestamp) {
        // 这里根据实际的数据格式解析电机参数
        // 假设数据格式为: [电流A, 电流B, 电流C, 电压Q, 电压D, 转速, 位置]
        
        const parameters = {
            current: {
                ia: this.decodeFloat(data, 0),
                ib: this.decodeFloat(data, 4),
                ic: this.decodeFloat(data, 8)
            },
            voltage: {
                vq_ref: this.decodeFloat(data, 12),
                vd_ref: this.decodeFloat(data, 16),
                vq: this.decodeFloat(data, 20),
                vd: this.decodeFloat(data, 24)
            },
            speed: {
                rpm_ref: this.decodeFloat(data, 28),
                rpm: this.decodeFloat(data, 32)
            },
            position: {
                position_ref: this.decodeFloat(data, 36),
                position: this.decodeFloat(data, 40)
            }
        };
        
        // 更新图表数据（根据可视性设置过滤）
        this.updateChartData(timestamp, parameters);
    }

    // 处理可视性变化
    handleVisibilityChange(paramId, isVisible) {
        console.log(`参数 ${paramId} 可视性变化: ${isVisible ? '显示' : '隐藏'}`);
        
        // 根据参数ID更新图表显示
        this.updateChartVisibility(paramId, isVisible);
        
        // 如果需要，可以在这里添加其他可视性相关的逻辑
    }

    // 更新图表可视性
    updateChartVisibility(paramId, isVisible) {
        if (this.chartManager && this.chartManager.updateDatasetVisibility) {
            this.chartManager.updateDatasetVisibility(paramId, isVisible);
        }
    }

    // 切换可视性面板
    toggleVisibilityPanel() {
        if (window.visibilityPanel) {
            window.visibilityPanel.toggle();
        }
    }

    // 从字节数组解码浮点数
    decodeFloat(data, offset) {
        if (offset + 4 > data.length) return 0;
        
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        
        for (let i = 0; i < 4; i++) {
            view.setUint8(i, data[offset + i]);
        }
        
        return view.getFloat32(0, true); // little endian
    }

    // 更新图表数据
    updateChartData(timestamp, parameters) {
        // 显示所有重要参数，不再依赖标签页
        this.chartManager.addData(timestamp, [
            parameters.current.ia,
            parameters.current.ib,
            parameters.current.ic,
            parameters.voltage.vq_ref,
            parameters.speed.rpm_ref,
            parameters.speed.rpm
        ]);
    }

    // 更新数据速率
    updateDataRate() {
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        const dataRate = this.dataPoints / elapsedTime;
        
        document.getElementById('data-rate').textContent = 
            `${dataRate.toFixed(1)} Hz`;
        
        document.getElementById('data-points').textContent = 
            `数据点: ${this.dataPoints}`;
    }

    // 开始状态更新定时器
    startStatusUpdates() {
        // 更新时间显示
        setInterval(() => {
            const now = new Date();
            document.getElementById('current-time').textContent = 
                now.toLocaleTimeString();
        }, 1000);
        
        // 更新内存使用显示（模拟）
        setInterval(() => {
            const memoryUsage = (performance.memory ? 
                (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) : '--');
            document.getElementById('memory-usage').textContent = 
                `内存: ${memoryUsage} MB`;
        }, 5000);
    }

    // 切换暂停状态
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
    }

    // 清除图表数据
    clearChart() {
        this.chartManager.clearData();
        this.dataPoints = 0;
        this.startTime = Date.now();
        this.updateDataRate();
    }

    // 导出数据
    exportData() {
        if (!this.chartManager) return;
        
        try {
            const data = this.chartManager.getData();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `foc-data-${timestamp}.json`;
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showSuccess('数据导出成功');
            
        } catch (error) {
            console.error('数据导出失败:', error);
            this.showError('数据导出失败: ' + error.message);
        }
    }

    // 切换调试日志显示
    toggleDebugLog() {
        if (this.chartManager && this.chartManager.viewport && this.chartManager.viewport.logger) {
            const logger = this.chartManager.viewport.logger;
            const logDiv = document.getElementById('viewport-debug-log');
            
            if (logDiv) {
                logDiv.style.display = logDiv.style.display === 'none' ? 'block' : 'none';
            } else {
                // 创建调试日志显示区域
                const chartContainer = document.querySelector('.chart-container') || document.body;
                const debugDiv = document.createElement('div');
                debugDiv.id = 'viewport-debug-log';
                debugDiv.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: 300px;
                    max-height: 400px;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    font-family: monospace;
                    font-size: 12px;
                    padding: 10px;
                    border-radius: 5px;
                    z-index: 10000;
                    overflow-y: auto;
                    display: block;
                `;
                debugDiv.innerHTML = '<h4>视窗调试日志</h4><div id="log-content"></div>';
                chartContainer.appendChild(debugDiv);
            }
        } else {
            console.warn('调试日志系统未初始化');
        }
    }

    // 导出调试日志
    exportDebugLog() {
        if (this.chartManager && this.chartManager.viewport && this.chartManager.viewport.logger) {
            this.chartManager.viewport.logger.export();
        } else {
            console.warn('调试日志系统未初始化');
        }
    }



    // 转换为CSV格式
    convertToCSV(data) {
        const headers = ['时间戳', ...data.datasets.map(ds => ds.label)];
        let csv = headers.join(',') + '\n';
        
        for (let i = 0; i < data.labels.length; i++) {
            const row = [data.labels[i]];
            
            for (const dataset of data.datasets) {
                row.push(dataset.data[i] || '');
            }
            
            csv += row.join(',') + '\n';
        }
        
        return csv;
    }

    // 显示接收到的16进制数据
    displayReceivedHex(data) {
        const receiveDataDisplay = document.getElementById('receive-data-display');
        if (!receiveDataDisplay) return;

        const timestamp = new Date().toLocaleTimeString();
        const bytes = Array.from(new Uint8Array(data));
        const hexDisplay = bytes.map(byte => 
            byte.toString(16).padStart(2, '0').toUpperCase()
        ).join(' ');

        // 添加到现有内容的末尾
        const currentText = receiveDataDisplay.value;
        const newLine = `[${timestamp}] ${hexDisplay}`;
        
        if (currentText) {
            receiveDataDisplay.value = currentText + '\n' + newLine;
        } else {
            receiveDataDisplay.value = newLine;
        }

        // 自动滚动到底部
        receiveDataDisplay.scrollTop = receiveDataDisplay.scrollHeight;
    }

    // 显示发送的16进制数据
    displaySentHex(data) {
        const sendDataDisplay = document.getElementById('send-data-display');
        if (!sendDataDisplay) return;

        const timestamp = new Date().toLocaleTimeString();
        const bytes = Array.from(new Uint8Array(data));
        const hexDisplay = bytes.map(byte => 
            byte.toString(16).padStart(2, '0').toUpperCase()
        ).join(' ');

        // 添加到现有内容的末尾
        const currentText = sendDataDisplay.value;
        const newLine = `[${timestamp}] ${hexDisplay}`;
        
        if (currentText) {
            sendDataDisplay.value = currentText + '\n' + newLine;
        } else {
            sendDataDisplay.value = newLine;
        }

        // 自动滚动到底部
        sendDataDisplay.scrollTop = sendDataDisplay.scrollHeight;
    }

    // 初始化曲线选择控件
    initCurveSelection() {
        const curveControls = document.getElementById('curve-controls');
        
        // 定义需要显示的曲线参数（根据需求文档2.1节）
        const curveParameters = [
            { id: 'iq_ref', label: '目标Q轴电流', defaultVisible: true },
            { id: 'ia', label: '相电流A', defaultVisible: true },
            { id: 'ib', label: '相电流B', defaultVisible: true },
            { id: 'ic', label: '相电流C', defaultVisible: true },
            { id: 'rpm_ref', label: '目标转速', defaultVisible: true },
            { id: 'rpm', label: '当前转速', defaultVisible: true },
            { id: 'position_ref', label: '目标位置', defaultVisible: true },
            { id: 'position', label: '当前位置', defaultVisible: true }
        ];
        
        // 创建曲线选择控件
        curveParameters.forEach(param => {
            const controlDiv = document.createElement('div');
            controlDiv.className = 'curve-control';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `curve-${param.id}`;
            checkbox.checked = param.defaultVisible;
            checkbox.addEventListener('change', (e) => {
                this.toggleCurveVisibility(param.id, e.target.checked);
            });
            
            const label = document.createElement('label');
            label.htmlFor = `curve-${param.id}`;
            label.textContent = param.label;
            
            controlDiv.appendChild(checkbox);
            controlDiv.appendChild(label);
            curveControls.appendChild(controlDiv);
        });
    }

    // 初始化模式控制功能
    initModeControls() {
        // 模式选择器事件 - 选择后立即切换
        const modeSelector = document.getElementById('control-mode-select');
        
        if (!modeSelector) {
            console.error('模式选择器未找到');
            return;
        }

        // 选择器变化时立即切换
        modeSelector.addEventListener('change', () => {
            const selectedMode = modeSelector.value;
            this.updateModeControls(selectedMode);
            this.showSuccess(`已切换到${this.getModeDisplayName(selectedMode)}`);
        });

        // 初始化默认模式
        this.updateModeControls('torque');

        // 进度条事件 - 所有模式都支持实时发送
        this.initSliderEvents();

        // 校准模式 - 直接发送
        const calibrateBtn = document.getElementById('send-calibration-btn');
        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => {
                this.sendCalibrationCommand();
            });
        }

        // 状态上报模式 - 切换到该模式时自动启用状态上报
        // 无需按钮，状态上报将在切换到该模式时自动处理
    }

    // 初始化读写数据控制
    initRWDataControls() {
        const rwModeRadios = document.querySelectorAll('input[name="rw-mode"]');
        const dataIdSelect = document.getElementById('data-id-select');
        const dataValueInput = document.getElementById('data-value-input');
        const dataValueDisplay = document.getElementById('data-value-display');
        const executeBtn = document.getElementById('execute-rw-btn');
        const clearBtn = document.getElementById('clear-rw-btn');

        // 数据ID到类型的映射
        const dataTypeMap = {
            '0x10': 'float', '0x11': 'float', '0x12': 'float', '0x13': 'float',
            '0x14': 'float', '0x15': 'float', '0x16': 'float', '0x17': 'float',
            '0x18': 'float', '0x19': 'float', '0x1A': 'float', '0x1B': 'float',
            '0x1C': 'float', '0x1D': 'float', '0x1E': 'uint32', '0x1F': 'float',
            '0x20': 'float', '0x21': 'float', '0x22': 'float', '0x23': 'uint32',
            '0x24': 'uint32', '0x25': 'uint32', '0x26': 'float', '0x27': 'float',
            '0x28': 'float', '0x29': 'float', '0x2A': 'float', '0x2B': 'float',
            '0x2C': 'float', '0x2D': 'float', '0x2E': 'float', '0x30': 'uint32',
            '0x31': 'float'
        };

        // 更新数据类型显示
        const updateDataType = () => {
            const dataId = dataIdSelect.value;
            const dataType = dataTypeMap[dataId] || 'float';
            document.getElementById('data-type-label').textContent = dataType;
        };

        // 更新读写模式UI
        const updateRWMode = () => {
            const mode = document.querySelector('input[name="rw-mode"]:checked').value;
            const dataValueInput = document.getElementById('data-value-input');
            const dataValueDisplay = document.getElementById('data-value-display');
            const dataValueLabel = document.getElementById('data-value-label');
            const executeBtn = document.getElementById('execute-rw-btn');

            if (mode === 'read') {
                dataValueInput.style.display = 'none';
                dataValueDisplay.style.display = 'block';
                dataValueLabel.textContent = '读取值:';
                executeBtn.textContent = '读取数据';
            } else {
                dataValueInput.style.display = 'block';
                dataValueDisplay.style.display = 'none';
                dataValueLabel.textContent = '写入值:';
                executeBtn.textContent = '写入数据';
            }
        };

        // 绑定事件监听器
        rwModeRadios.forEach(radio => {
            radio.addEventListener('change', updateRWMode);
        });

        dataIdSelect.addEventListener('change', updateDataType);

        executeBtn.addEventListener('click', () => {
            this.executeRWCommand();
        });

        clearBtn.addEventListener('click', () => {
            this.clearRWData();
        });

        // 初始化
        updateDataType();
        updateRWMode();
    }

    // 执行读写命令
    async executeRWCommand() {
        const mode = document.querySelector('input[name="rw-mode"]:checked').value;
        const dataId = document.getElementById('data-id-select').value;
        const dataValueInput = document.getElementById('data-value-input');
        const resultDisplay = document.getElementById('rw-result-display');

        try {
            const idHex = parseInt(dataId, 16);
            
            if (mode === 'read') {
                await this.sendReadCommand(idHex, resultDisplay);
            } else {
                const value = parseFloat(dataValueInput.value);
                if (isNaN(value)) {
                    throw new Error('请输入有效的数值');
                }
                await this.sendWriteCommand(idHex, value, resultDisplay);
            }
        } catch (error) {
            this.showRWResult(resultDisplay, `错误: ${error.message}`, 'error');
        }
    }

    // 发送读取命令
    async sendReadCommand(dataId, resultDisplay) {
        if (!this.serialManager.isConnected()) {
            throw new Error('请先连接串口');
        }

        // 构建读取命令包：AA 02 [数据ID高字节] [数据ID低字节] 00 00 00 00 00 00 00 [CHK] 55
        const command = 0x02; // 读数据命令
        const packet = new Uint8Array(14);
        packet[0] = 0xAA; // 包头
        packet[1] = command; // 命令
        packet[2] = (dataId >> 8) & 0xFF; // 数据ID高字节
        packet[3] = dataId & 0xFF; // 数据ID低字节
        
        // 其余数据区填充0
        for (let i = 4; i < 12; i++) {
            packet[i] = 0;
        }
        
        // 计算校验和
        let checksum = 0;
        for (let i = 0; i < 12; i++) {
            checksum += packet[i];
        }
        packet[12] = checksum & 0xFF; // 校验和
        packet[13] = 0x55; // 包尾

        // 发送数据并显示16进制
        await this.serialManager.sendData(packet);
        this.displaySentHex(packet);
        this.showRWResult(resultDisplay, '读取命令已发送，等待响应...', 'success');

        // 设置响应处理 - 使用临时监听器
        const readHandler = (data) => {
            const dataArray = new Uint8Array(data);
            if (dataArray.length >= 14 && dataArray[1] === 0x02) {
                this.handleReadResponse(dataArray, resultDisplay);
                // 移除监听器
                const index = this.serialManager.dataCallbacks.indexOf(readHandler);
                if (index > -1) {
                    this.serialManager.dataCallbacks.splice(index, 1);
                }
            }
        };
        
        this.serialManager.onData(readHandler);
        
        // 设置超时，5秒后自动移除监听器
        setTimeout(() => {
            const index = this.serialManager.dataCallbacks.indexOf(readHandler);
            if (index > -1) {
                this.serialManager.dataCallbacks.splice(index, 1);
                this.showRWResult(resultDisplay, '读取超时，未收到响应', 'error');
            }
        }, 5000);
    }

    // 发送写入命令
    async sendWriteCommand(dataId, value, resultDisplay) {
        if (!this.serialManager.isConnected()) {
            throw new Error('请先连接串口');
        }

        // 构建写入命令包：AA 01 [数据ID高字节] [数据ID低字节] [数据4字节] 00 00 00 00 [CHK] 55
        const command = 0x01; // 写数据命令
        const packet = new Uint8Array(14);
        packet[0] = 0xAA; // 包头
        packet[1] = command; // 命令
        packet[2] = (dataId >> 8) & 0xFF; // 数据ID高字节
        packet[3] = dataId & 0xFF; // 数据ID低字节

        // 将float值转换为4字节小端格式
        const floatBytes = new Float32Array([value]);
        const bytes = new Uint8Array(floatBytes.buffer);
        packet[4] = bytes[0];
        packet[5] = bytes[1];
        packet[6] = bytes[2];
        packet[7] = bytes[3];

        // 其余数据区填充0
        for (let i = 8; i < 12; i++) {
            packet[i] = 0;
        }

        // 计算校验和
        let checksum = 0;
        for (let i = 0; i < 12; i++) {
            checksum += packet[i];
        }
        packet[12] = checksum & 0xFF; // 校验和
        packet[13] = 0x55; // 包尾

        // 发送命令并显示16进制
        await this.serialManager.sendData(packet);
        this.displaySentHex(packet);
        this.showRWResult(resultDisplay, `写入命令已发送，值: ${value}`, 'success');

        // 设置响应处理 - 使用临时监听器
        const writeHandler = (data) => {
            const dataArray = new Uint8Array(data);
            if (dataArray.length >= 14 && dataArray[1] === 0x01) {
                this.handleWriteResponse(dataArray, resultDisplay);
                // 移除监听器
                const index = this.serialManager.dataCallbacks.indexOf(writeHandler);
                if (index > -1) {
                    this.serialManager.dataCallbacks.splice(index, 1);
                }
            }
        };
        
        this.serialManager.onData(writeHandler);
        
        // 设置超时，5秒后自动移除监听器
        setTimeout(() => {
            const index = this.serialManager.dataCallbacks.indexOf(writeHandler);
            if (index > -1) {
                this.serialManager.dataCallbacks.splice(index, 1);
                this.showRWResult(resultDisplay, '写入超时，未收到响应', 'error');
            }
        }, 5000);
    }

    // 处理读取响应
    handleReadResponse(data, resultDisplay) {
        if (data.length >= 14) {
            const command = data[1];
            if (command === 0x02) { // 读数据响应
                const dataId = (data[2] << 8) | data[3]; // 高字节在前
                const value = new Float32Array(data.slice(4, 8).buffer)[0];
                
                document.getElementById('data-value-display').textContent = value.toFixed(4);
            }
        }
    }

    // 处理写入响应
    handleWriteResponse(data, resultDisplay) {
        if (data.length >= 14) {
            const command = data[1];
            if (command === 0x01) { // 写数据响应
                const dataId = (data[2] << 8) | data[3]; // 高字节在前
            }
        }
    }

    // 清空读写数据
    clearRWData() {
        document.getElementById('data-value-input').value = '';
        document.getElementById('data-value-display').textContent = '';
    }

    // 显示读写结果
    showRWResult(displayElement, message, type = 'info') {
        displayElement.textContent = message;
        displayElement.className = `result-display ${type}`;
    }

    // 更新模式控制界面
    updateModeControls(selectedMode) {
        // 隐藏所有模式控制块
        const modeControls = document.querySelectorAll('.mode-control');
        modeControls.forEach(control => {
            control.style.display = 'none';
        });

        // 显示选中的模式控制块
        const selectedControl = document.querySelector(`.${selectedMode}-mode`);
        if (selectedControl) {
            selectedControl.style.display = 'block';
        }

        // 更新当前模式
        this.currentMode = selectedMode;

        // 状态上报模式特殊处理
        if (selectedMode === 'status') {
            this.sendStatusEnableCommand();
        }
    }

    // 初始化进度条事件
    initSliderEvents() {
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            // 获取对应的值显示元素
            const valueDisplayId = slider.id.replace('-slider', '-value');
            const valueDisplay = document.getElementById(valueDisplayId);
            
            // 显示当前值
            if (valueDisplay) {
                valueDisplay.textContent = slider.value;
            }

            // 值变化事件（实时发送）
            slider.addEventListener('input', (e) => {
                const valueDisplayId = e.target.id.replace('-slider', '-value');
                const valueDisplay = document.getElementById(valueDisplayId);
                if (valueDisplay) {
                    valueDisplay.textContent = e.target.value;
                }
                // 实时发送数据
                this.sendModeCommand(e.target.id, parseFloat(e.target.value));
            });
        });
    }

    // 发送模式命令
    sendModeCommand(controlId, value) {
        if (!this.serialManager || !this.serialManager.isConnected()) {
            this.showError('串口未连接，无法发送命令');
            return;
        }

        // 创建14字节数据包（全0x55，后续可替换为实际协议）
        const data = new Uint8Array(14);
        data.fill(0x55);

        // 根据控制ID设置不同的命令类型
        let commandType = 0;
        switch (controlId) {
            case 'torque-slider':
                commandType = 0x01; // 力矩模式命令
                // 将0-100的值映射到协议范围
                data[0] = commandType;
                data[1] = Math.round(value * 2.55); // 0-100 -> 0-255
                break;
            case 'speed-slider':
                commandType = 0x02; // 速度模式命令
                data[0] = commandType;
                data[1] = Math.round(value * 2.55); // 0-100 -> 0-255
                break;
            case 'position-slider':
                commandType = 0x03; // 位置模式命令
                data[0] = commandType;
                // 将0-360度的值转换为两个字节
                const positionValue = Math.round((value / 360) * 65535);
                data[1] = (positionValue >> 8) & 0xFF;
                data[2] = positionValue & 0xFF;
                break;
        }

        // 发送数据并显示16进制
        this.serialManager.sendData(data).then(() => {
            this.displaySentHex(data);
            console.log(`发送${controlId}命令成功，值: ${value}`);
        }).catch(error => {
            this.showError(`发送命令失败: ${error.message}`);
        });
    }

    // 发送校准命令
    sendCalibrationCommand() {
        if (!this.serialManager || !this.serialManager.isConnected()) {
            this.showError('串口未连接，无法发送命令');
            return;
        }

        // 创建14字节数据包
        const data = new Uint8Array(14);
        data[0] = 0xAA; // 包头
        data[1] = 0x05; // 命令类型：校准模式
        data[2] = 0x01; // 校准开始
        data[12] = 0x55; // 包尾
        data[13] = 0x55;

        // 计算校验和
        let checksum = 0;
        for (let i = 1; i < 12; i++) {
            checksum += data[i];
        }
        data[11] = checksum & 0xFF;

        this.serialManager.sendData(data).then(() => {
            this.displaySentHex(data);
            console.log('校准命令发送成功');
        }).catch(error => {
            this.showError(`发送校准命令失败: ${error.message}`);
        });
    }

    // 发送状态上报启用命令
    sendStatusEnableCommand() {
        if (!this.serialManager || !this.serialManager.isConnected()) {
            this.showError('串口未连接，无法发送命令');
            return;
        }

        // 创建14字节数据包
        const data = new Uint8Array(14);
        data[0] = 0xAA; // 包头
        data[1] = 0x06; // 命令类型：状态上报配置
        data[2] = 0x01; // 启用状态上报
        data[12] = 0x55; // 包尾
        data[13] = 0x55;

        // 其余字节填充0
        for (let i = 3; i < 12; i++) {
            data[i] = 0;
        }

        // 计算校验和
        let checksum = 0;
        for (let i = 1; i < 12; i++) {
            checksum += data[i];
        }
        data[11] = checksum & 0xFF;

        this.serialManager.sendData(data).then(() => {
            this.displaySentHex(data);
            console.log('状态上报已启用');
            this.showSuccess('状态上报已启用');
        }).catch(error => {
            this.showError(`状态上报启用失败: ${error.message}`);
        });
    }

    // 发送状态上报禁用命令
    sendStatusDisableCommand() {
        if (!this.serialManager || !this.serialManager.isConnected()) {
            this.showError('串口未连接，无法发送命令');
            return;
        }

        // 创建14字节数据包
        const data = new Uint8Array(14);
        data[0] = 0xAA; // 包头
        data[1] = 0x06; // 命令类型：状态上报配置
        data[2] = 0x00; // 禁用状态上报
        data[12] = 0x55; // 包尾
        data[13] = 0x55;

        // 其余字节填充0
        for (let i = 3; i < 12; i++) {
            data[i] = 0;
        }

        // 计算校验和
        let checksum = 0;
        for (let i = 1; i < 12; i++) {
            checksum += data[i];
        }
        data[11] = checksum & 0xFF;

        this.serialManager.sendData(data).then(() => {
            this.displaySentHex(data);
            console.log('状态上报已禁用');
            this.showSuccess('状态上报已禁用');
        }).catch(error => {
            this.showError(`状态上报禁用失败: ${error.message}`);
        });
    }
    
    // 切换曲线可视性
    toggleCurveVisibility(paramId, isVisible) {
        if (this.chartManager && this.chartManager.updateDatasetVisibility) {
            this.chartManager.updateDatasetVisibility(paramId, isVisible);
        }
    }
    
    // 获取模式显示名称
    getModeDisplayName(mode) {
        const modeNames = {
            'torque': '力矩模式',
            'speed': '速度模式',
            'position': '位置模式',
            'calibration': '校准模式',
            'status': '状态上报模式'
        };
        return modeNames[mode] || '未知模式';
    }

    // 切换控制模式
    switchControlMode(mode) {
        let command;
        switch (mode) {
            case 'position':
                command = 0x11; // 位置模式
                break;
            case 'torque':
                command = 0x12; // 力矩模式
                break;
            default:
                console.error('未知的控制模式:', mode);
                return;
        }
        
        // 发送控制模式设置命令
        this.serialManager.sendFOCCommand(command).catch(error => {
            this.showError('切换控制模式失败: ' + error.message);
        });
    }



    // 显示错误消息
    showError(message) {
        // 这里可以替换为更友好的错误提示方式
        console.error(message);
        alert('错误: ' + message);
    }

    // 显示成功消息
    showSuccess(message) {
        console.log(message);
        // 这里可以添加成功提示
    }

    // 销毁应用
    destroy() {
        this.serialManager.destroy();
        
        if (this.chartManager) {
            this.chartManager.destroy();
        }
        
        // 移除所有事件监听器
        const events = ['click', 'change', 'input'];
        events.forEach(event => {
            document.removeEventListener(event, this.boundHandlers[event]);
        });
    }
}

// 启动应用
window.addEventListener('load', () => {
    window.focMonitorApp = new FOCMonitorApp();
});