// FOC电机控制上位机 - 主应用脚本
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
            this.initEventListeners();
            this.initSerialPorts();
            this.initCurveSelection();
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
            
            // 初始化默认图表
            this.chartManager.init({
                type: 'line',
                data: {
                    datasets: []
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
        // 菜单按钮点击事件
        document.querySelectorAll('.menu-item').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchPage(e.target.dataset.page);
            });
        });

        // 可视性控制按钮事件
        document.getElementById('visibility-btn').addEventListener('click', () => {
            this.toggleVisibilityPanel();
        });

        // 标签页切换事件
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

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

        // 串口连接按钮事件
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.toggleSerialConnection();
        });



        // 时间范围选择事件
        document.getElementById('time-range-select').addEventListener('change', (e) => {
            this.updateTimeRange(parseInt(e.target.value));
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

    // 切换标签页
    switchTab(tab) {
        // 移除所有标签页的active类
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 为当前标签页添加active类
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // 更新图表显示的数据集
        this.updateChartDatasets(tab);
    }

    // 更新图表数据集
    updateChartDatasets(tab) {
        const datasets = [];
        
        switch (tab) {
            case 'current':
                datasets.push(
                    this.createDataset('相电流A (A)', '#FF6384'),
                    this.createDataset('相电流B (A)', '#36A2EB'),
                    this.createDataset('相电流C (A)', '#FFCE56')
                );
                break;
            case 'voltage':
                datasets.push(
                    this.createDataset('Vq_ref (V)', '#FF6384'),
                    this.createDataset('Vd_ref (V)', '#36A2EB'),
                    this.createDataset('Vq (V)', '#4BC0C0'),
                    this.createDataset('Vd (V)', '#FF9F40')
                );
                break;
            case 'speed':
                datasets.push(
                    this.createDataset('RPM_ref', '#FF6384'),
                    this.createDataset('RPM', '#36A2EB')
                );
                break;
            case 'position':
                datasets.push(
                    this.createDataset('Position_ref', '#FF6384'),
                    this.createDataset('Position', '#36A2EB')
                );
                break;
        }
        
        this.chartManager.updateDatasets(datasets);
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
        const currentTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        switch (currentTab) {
            case 'current':
                this.chartManager.addData(timestamp, [
                    parameters.current.ia,
                    parameters.current.ib,
                    parameters.current.ic
                ]);
                break;
            case 'voltage':
                this.chartManager.addData(timestamp, [
                    parameters.voltage.vq_ref,
                    parameters.voltage.vd_ref,
                    parameters.voltage.vq,
                    parameters.voltage.vd
                ]);
                break;
            case 'speed':
                this.chartManager.addData(timestamp, [
                    parameters.speed.rpm_ref,
                    parameters.speed.rpm
                ]);
                break;
            case 'position':
                this.chartManager.addData(timestamp, [
                    parameters.position.position_ref,
                    parameters.position.position
                ]);
                break;
        }
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
        const data = this.chartManager.getData();
        const csvContent = this.convertToCSV(data);
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `foc_data_${new Date().toISOString().replace(/:/g, '-')}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
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
    
    // 切换曲线可视性
    toggleCurveVisibility(paramId, isVisible) {
        if (this.chartManager && this.chartManager.updateDatasetVisibility) {
            this.chartManager.updateDatasetVisibility(paramId, isVisible);
        }
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

    // 更新时间范围
    updateTimeRange(seconds) {
        this.chartManager.setTimeRange(seconds);
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