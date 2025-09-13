class ChartManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chart = null;
        this.data = {
            labels: [],
            datasets: []
        };
        this.timeRange = 30; // 默认显示30秒数据
        this.maxDataPoints = 1000; // 最大数据点数量
        
        // 确保Chart对象可用
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js库未正确加载，请检查HTML中的script标签');
        }
        
        this.init();
    }

    // 初始化图表
    init(config = {}) {
        const defaultConfig = {
            type: 'line',
            data: this.data,
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
                            text: '时间 (ms)'
                        },
                        min: 0,
                        max: 10000, // 初始X轴范围0~10000ms
                        grid: {
                            color: '#484f58'
                        },
                        ticks: {
                            color: '#8b949e'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '数值'
                        },
                        beginAtZero: false,
                        min: -5000, // Y轴初始范围-5000~5000
                        max: 5000,
                        grid: {
                            color: '#484f58'
                        },
                        ticks: {
                            color: '#8b949e'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(3)}`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        };

        // 合并配置
        const mergedConfig = this.mergeConfigs(defaultConfig, config);
        
        // 销毁之前的图表实例（如果存在）
        if (this.chart) {
            this.chart.destroy();
        }
        
        // 创建图表
        this.chart = new Chart(this.ctx, mergedConfig);
        
        // 设置FOC电机控制的数据范围
        this.dataRange = {
            x: { min: 0, max: 1000000 },
            y: { min: -65535, max: 65535 }
        };
        
        // 设置鼠标滚轮缩放
        this.setupMouseWheelZoom();
        
        // 设置滚动条控制（只调用一次）
        this.setupScrollbarControls();
        
        // 应用初始视窗设置
        this.resetToInitialView();
    }

    // 重置到初始视图 - FOC标准范围
    resetToInitialView() {
        if (!this.chart) return;

        // FOC标准初始视图范围
        const yMin = -6000;
        const yMax = 6000;
        
        // X轴固定范围：0~10000ms
        const xMin = 0;
        const xMax = 10000;

        // 设置图表范围
        this.chart.options.scales.x.min = xMin;
        this.chart.options.scales.x.max = xMax;
        this.chart.options.scales.y.min = yMin;
        this.chart.options.scales.y.max = yMax;

        this.chart.update('none');
        this.updateScrollbars();
    }

    // 清理viewport相关方法
    setupViewportSystem() {
        // 这个方法现在是空的，使用Chart.js坐标系
    }

    // 清理setupScrollbarEvents方法
    setupScrollbarEvents() {
        // 这个方法现在是空的，使用setupScrollbarControls代替
    }

    // 合并配置对象
    mergeConfigs(defaultConfig, customConfig) {
        const result = { ...defaultConfig };
        
        // 深度合并
        for (const key in customConfig) {
            if (customConfig.hasOwnProperty(key)) {
                if (typeof customConfig[key] === 'object' && !Array.isArray(customConfig[key])) {
                    result[key] = this.mergeConfigs(defaultConfig[key] || {}, customConfig[key]);
                } else {
                    result[key] = customConfig[key];
                }
            }
        }
        
        return result;
    }

    // 添加数据点
    addData(timestamp, values) {
        if (!this.chart) return;
        
        // 确保values是数组
        if (!Array.isArray(values)) {
            values = [values];
        }
        
        // 添加时间戳标签
        this.data.labels.push(timestamp);
        
        // 添加各个数据集的数据
        values.forEach((value, index) => {
            if (this.data.datasets[index]) {
                this.data.datasets[index].data.push(value);
            }
        });
        
        // 限制数据点数量
        this.limitDataPoints();
        
        // 更新图表显示范围
        this.updateChartRange();
        
        // 更新图表
        this.chart.update('none');
    }

    // 限制数据点数量
    limitDataPoints() {
        if (this.data.labels.length > this.maxDataPoints) {
            const removeCount = this.data.labels.length - this.maxDataPoints;
            
            // 移除最早的数据
            this.data.labels.splice(0, removeCount);
            
            // 移除各个数据集的最早数据
            this.data.datasets.forEach(dataset => {
                dataset.data.splice(0, removeCount);
            });
        }
    }

    // 更新图表显示范围
    updateChartRange() {
        if (this.data.labels.length === 0) {
            // 默认显示范围：0~10000ms (10秒)
            this.chart.options.scales.x.min = 0;
            this.chart.options.scales.x.max = 10000;
            this.updateScrollbars(); // 更新滚动条状态
            return;
        }
        
        const currentTime = this.data.labels[this.data.labels.length - 1];
        const minTime = 0; // 起始值始终为0
        const maxTime = Math.min(currentTime + 20000, 1000000); // 当前时间+20秒，最大不超过100万ms
        
        this.chart.options.scales.x.min = minTime;
        this.chart.options.scales.x.max = maxTime;
        this.updateScrollbars(); // 更新滚动条状态
    }

    // 设置时间范围
    setTimeRange(seconds) {
        this.timeRange = seconds;
        this.updateChartRange();
        this.chart.update();
    }

    // 清除所有数据
    clearData() {
        this.data.labels = [];
        this.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        
        if (this.chart) {
            this.chart.update();
        }
    }

    // 更新数据集配置
    updateDatasets(newDatasets) {
        this.data.datasets = newDatasets;
        
        if (this.chart) {
            this.chart.update();
        }
    }

    // 添加新的数据集
    addDataset(label, color) {
        const newDataset = {
            label: label,
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            data: []
        };
        
        this.data.datasets.push(newDataset);
        
        if (this.chart) {
            this.chart.update();
        }
        
        return newDataset;
    }

    // 移除数据集
    removeDataset(index) {
        if (index >= 0 && index < this.data.datasets.length) {
            this.data.datasets.splice(index, 1);
            
            if (this.chart) {
                this.chart.update();
            }
        }
    }

    // 获取图表数据
    getData() {
        return {
            labels: [...this.data.labels],
            datasets: this.data.datasets.map(dataset => ({
                label: dataset.label,
                data: [...dataset.data]
            }))
        };
    }

    // 导出图表数据为CSV
    exportToCSV() {
        const data = this.getData();
        let csv = '时间戳';
        
        // 添加列标题
        data.datasets.forEach(dataset => {
            csv += `,${dataset.label}`;
        });
        csv += '\n';
        
        // 添加数据行
        for (let i = 0; i < data.labels.length; i++) {
            csv += data.labels[i];
            
            data.datasets.forEach(dataset => {
                csv += `,${dataset.data[i] || ''}`;
            });
            
            csv += '\n';
        }
        
        return csv;
    }

    // 设置图表标题
    setTitle(title) {
        if (this.chart && this.chart.options.plugins.title) {
            this.chart.options.plugins.title.text = title;
            this.chart.update();
        }
    }

    // 获取图表实例
    getChart() {
        return this.chart;
    }

    // 销毁图表
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    // 重置图表
    reset() {
        this.destroy();
        this.data = {
            labels: [],
            datasets: []
        };
        this.init();
    }

    // 初始化视窗系统
    // 修复setupViewportSystem方法，移除对旧方法的调用
    setupViewportSystem() {
        // 初始化Chart.js坐标系
        this.resetToInitialView();
        
        // 设置滚动条和缩放控制
        this.setupMouseWheelZoom();
        this.setupScrollbarControls();
        
        // 不再使用旧的viewport系统
        // this.setupCanvasDrag(); // 已移除
        // this.setupScrollbarEvents(); // 已替换为setupScrollbarControls
    }

    // 清理viewport相关代码，统一使用Chart.js坐标系
    // 清理setupScrollbarEvents方法，避免重复
    setupScrollbarEvents() {
        // 这个方法现在是空的，使用setupScrollbarControls代替
    }
    
    // 清理enforceViewportBounds方法，不再使用
    enforceViewportBounds() {
        // 这个方法现在不需要了
    }
    
    // 清理updateViewportTransform方法，不再使用
    updateViewportTransform() {
        // 这个方法现在不需要了
    }
    
    // 清理resetViewport方法，使用resetToInitialView
    resetViewport() {
        // 这个方法现在不需要了，使用resetToInitialView
    }

    // 更新滚动条状态 - 基于FOC实际数据范围
    updateScrollbars() {
        if (!this.chart) return;
        
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        const xTrack = document.getElementById('x-scrollbar-track');
        const yTrack = document.getElementById('y-scrollbar-track');
        
        if (!xThumb || !yThumb || !xTrack || !yTrack) return;

        // 获取当前视图范围
        const viewXMin = this.chart.options.scales.x.min;
        const viewXMax = this.chart.options.scales.x.max;
        const viewYMin = this.chart.options.scales.y.min;
        const viewYMax = this.chart.options.scales.y.max;

        // FOC实际数据总范围
        const totalYMin = -65535;
        const totalYMax = 65535;
        const totalYRange = totalYMax - totalYMin; // 131070

        // X轴固定总范围：0~10000ms
        const totalXRange = 10000;

        // 当前视图范围
        const viewXRange = Math.max(100, viewXMax - viewXMin);
        const viewYRange = Math.max(100, viewYMax - viewYMin);

        // 计算滚动条比例
        const xRatio = viewXRange / totalXRange;
        const yRatio = viewYRange / totalYRange;

        // 始终显示滚动条，但当占满100%时使用固定小宽度
        const xThumbWidth = xRatio >= 0.99 ? 8 : Math.max(5, Math.min(95, xRatio * 100));
        const yThumbHeight = yRatio >= 0.99 ? 8 : Math.max(5, Math.min(95, yRatio * 100));

        xThumb.style.width = `${xThumbWidth}%`;
        yThumb.style.height = `${yThumbHeight}%`;

        // 始终显示滚动条轨道
        xTrack.style.display = 'block';
        yTrack.style.display = 'block';

        // 计算thumb位置
        const xOffset = viewXMin;
        const maxXOffset = totalXRange - viewXRange;
        const xPosition = Math.max(0, Math.min(100 - xThumbWidth, (xOffset / Math.max(1, maxXOffset)) * (100 - xThumbWidth)));
        xThumb.style.left = `${xPosition}%`;

        // 修正Y轴滚动条方向：从底部开始计算，使滚动条移动方向与视图移动方向一致
        const yOffset = viewYMin - totalYMin;
        const maxYOffset = totalYRange - viewYRange;
        const yPosition = Math.max(0, Math.min(100 - yThumbHeight, (yOffset / Math.max(1, maxYOffset)) * (100 - yThumbHeight)));
        yThumb.style.top = `${yPosition}%`;

        // 根据比例设置样式提示
        xThumb.style.opacity = xRatio >= 0.99 ? '0.5' : '1';
        yThumb.style.opacity = yRatio >= 0.99 ? '0.5' : '1';
        xThumb.style.cursor = xRatio >= 0.99 ? 'default' : 'grab';
        yThumb.style.cursor = yRatio >= 0.99 ? 'default' : 'grab';
    }

    // 设置滚动条控制 - 统一实现
    setupScrollbarControls() {
        const xTrack = document.getElementById('x-scrollbar-track');
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yTrack = document.getElementById('y-scrollbar-track');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        
        if (!xTrack || !xThumb || !yTrack || !yThumb) return;

        // 设置拖拽事件
        this.setupScrollbarDragEvent(xThumb, xTrack, 'x');
        this.setupScrollbarDragEvent(yThumb, yTrack, 'y');
    }

    // 修正的滚动条拖拽事件处理
    setupScrollbarDragEvent(thumb, track, axis) {
        let isDragging = false;
        let startMousePos = 0;
        let startRangeStart = 0;
        let startRangeSize = 0;

        const getDataRange = () => {
            // FOC实际数据范围
            const totalYMin = -65535;
            const totalYMax = 65535;
            
            // X轴固定范围0~10000ms
            const totalXRange = 10000;

            return axis === 'x' 
                ? { min: 0, max: totalXRange }
                : { min: totalYMin, max: totalYMax };
        };

        const onMouseDown = (e) => {
            e.preventDefault();
            
            // 检查当前比例是否为100%
            const dataRange = getDataRange();
            let currentRangeSize, totalRange;
            
            if (axis === 'x') {
                currentRangeSize = this.chart.options.scales.x.max - this.chart.options.scales.x.min;
                totalRange = dataRange.max - dataRange.min;
            } else {
                currentRangeSize = this.chart.options.scales.y.max - this.chart.options.scales.y.min;
                totalRange = dataRange.max - dataRange.min;
            }
            
            const ratio = currentRangeSize / totalRange;
            
            // 如果占满100%，禁用拖拽
            if (ratio >= 0.99) return;

            isDragging = true;
            startMousePos = axis === 'x' ? e.clientX : e.clientY;
            
            if (axis === 'x') {
                startRangeStart = this.chart.options.scales.x.min;
                startRangeSize = this.chart.options.scales.x.max - this.chart.options.scales.x.min;
            } else {
                startRangeStart = this.chart.options.scales.y.min;
                startRangeSize = this.chart.options.scales.y.max - this.chart.options.scales.y.min;
            }
            
            thumb.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            const currentMousePos = axis === 'x' ? e.clientX : e.clientY;
            const mouseDelta = currentMousePos - startMousePos;
            
            const trackSize = axis === 'x' ? track.offsetWidth : track.offsetHeight;
            const thumbSize = axis === 'x' ? thumb.offsetWidth : thumb.offsetHeight;
            const usableTrackSize = Math.max(0, trackSize - thumbSize);
            
            if (usableTrackSize <= 0) return;
            
            // 计算拖拽比例
            const dragRatio = mouseDelta / usableTrackSize;
            const dataRange = getDataRange();
            const totalRange = dataRange.max - dataRange.min;
            const maxOffset = Math.max(0, totalRange - startRangeSize);
            
            // 计算新的起始位置
            let newStart = startRangeStart + (dragRatio * maxOffset);
            
            // 限制范围
            newStart = Math.max(dataRange.min, Math.min(dataRange.max - startRangeSize, newStart));
            
            if (axis === 'x') {
                this.chart.options.scales.x.min = newStart;
                this.chart.options.scales.x.max = newStart + startRangeSize;
            } else {
                this.chart.options.scales.y.min = newStart;
                this.chart.options.scales.y.max = newStart + startRangeSize;
            }
            
            this.chart.update('none');
            this.updateScrollbars();
        };

        const onMouseUp = () => {
            isDragging = false;
            thumb.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        thumb.addEventListener('mousedown', onMouseDown);
        
        // 点击轨道跳转 - 修正位置计算
        track.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (e.target === thumb) return;
            
            const trackRect = track.getBoundingClientRect();
            const clickPos = axis === 'x' ? e.clientX - trackRect.left : e.clientY - trackRect.top;
            const thumbSize = axis === 'x' ? thumb.offsetWidth : thumb.offsetHeight;
            const trackSize = axis === 'x' ? track.offsetWidth : track.offsetHeight;
            
            // 检查当前比例是否为100%
            const dataRange = getDataRange();
            let currentRangeSize;
            
            if (axis === 'x') {
                currentRangeSize = this.chart.options.scales.x.max - this.chart.options.scales.x.min;
            } else {
                currentRangeSize = this.chart.options.scales.y.max - this.chart.options.scales.y.min;
            }
            
            const ratio = currentRangeSize / (dataRange.max - dataRange.min);
            
            // 如果占满100%，禁用跳转
            if (ratio >= 0.99) return;
            
            const usableTrackSize = Math.max(0, trackSize - thumbSize);
            if (usableTrackSize <= 0) return;
            
            // 修正点击位置计算：考虑滑块宽度，使点击中心位置
            const clickRatio = Math.max(0, Math.min(1, (clickPos - (thumbSize / 2)) / usableTrackSize));
            const dataRange2 = getDataRange();
            const totalRange = dataRange2.max - dataRange2.min;
            
            let newStart = dataRange2.min + (clickRatio * (totalRange - currentRangeSize));
            newStart = Math.max(dataRange2.min, Math.min(dataRange2.max - currentRangeSize, newStart));
            
            if (axis === 'x') {
                this.chart.options.scales.x.min = newStart;
                this.chart.options.scales.x.max = newStart + currentRangeSize;
            } else {
                this.chart.options.scales.y.min = newStart;
                this.chart.options.scales.y.max = newStart + currentRangeSize;
            }
            
            this.chart.update('none');
            this.updateScrollbars();
        });
    }

    // 设置鼠标滚轮缩放 - 修正边界处理
    setupMouseWheelZoom() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
            
            // 获取当前数据范围
            const currentXMin = this.chart.options.scales.x.min;
            const currentXMax = this.chart.options.scales.x.max;
            const currentYMin = this.chart.options.scales.y.min;
            const currentYMax = this.chart.options.scales.y.max;
            
            const currentXRange = currentXMax - currentXMin;
            const currentYRange = currentYMax - currentYMin;
            
            // 计算新的范围
            const newXRange = Math.max(100, Math.min(1000000, currentXRange * zoomFactor));
            const newYRange = Math.max(100, Math.min(131070, currentYRange * zoomFactor));
            
            // 计算当前鼠标位置对应的数据坐标
            const xScale = this.chart.scales.x;
            const yScale = this.chart.scales.y;
            
            const dataMouseX = xScale.getValueForPixel(mouseX);
            const dataMouseY = yScale.getValueForPixel(mouseY);
            
            // 计算新的范围，保持鼠标位置不变
            const newXMin = Math.max(0, Math.min(1000000 - newXRange, dataMouseX - (mouseX / rect.width) * newXRange));
            const newXMax = newXMin + newXRange;
            
            const newYMin = Math.max(-65535, Math.min(65535 - newYRange, dataMouseY - ((rect.height - mouseY) / rect.height) * newYRange));
            const newYMax = newYMin + newYRange;
            
            // 应用新的范围
            this.chart.options.scales.x.min = newXMin;
            this.chart.options.scales.x.max = newXMax;
            this.chart.options.scales.y.min = newYMin;
            this.chart.options.scales.y.max = newYMax;
            
            this.chart.update('none');
            this.updateScrollbars();
        });
    }
}

// 确保ChartManager作为全局变量可用
if (typeof window !== 'undefined') {
    window.ChartManager = ChartManager;
}