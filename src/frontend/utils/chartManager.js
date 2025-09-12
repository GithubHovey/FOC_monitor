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
        
        // 创建图表 - 使用全局Chart对象
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js库未正确加载，请检查HTML中的script标签');
        }
        this.chart = new Chart(this.ctx, mergedConfig);
        
        // 初始化新的视窗系统
        this.setupViewportSystem();
        
        // 设置FOC电机控制的数据范围
        this.dataRange = {
            x: { min: 0, max: 1000000 }, // 最大100万ms (1000秒)
            y: { min: -65535, max: 65535 } // FOC电机控制完整数据范围
        };
        
        // 设置鼠标滚轮缩放
        this.setupMouseWheelZoom();
        
        // 应用初始视窗设置
        this.resetToInitialView();
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
    
    // 添加缺失的resetToInitialView方法
    resetToInitialView() {
        if (!this.chart) return;
        
        this.chart.options.scales.x.min = 0;
        this.chart.options.scales.x.max = 10000; // 0~10000ms
        this.chart.options.scales.y.min = -5000; // -5000~5000
        this.chart.options.scales.y.max = 5000;
        
        this.chart.update();
        this.updateScrollbars(); // 更新滚动条状态
    }
    
    // 确保fitToData方法存在且正确
    fitToData() {
        if (!this.chart || this.data.datasets.length === 0) return;
        
        // 获取数据范围
        let minX = 0;
        let maxX = 10000;
        let minY = -5000;
        let maxY = 5000;
        
        if (this.data.labels.length > 0) {
            minX = Math.min(...this.data.labels);
            maxX = Math.max(...this.data.labels);
        }
        
        this.data.datasets.forEach(dataset => {
            if (dataset.data.length > 0) {
                minY = Math.min(minY, Math.min(...dataset.data));
                maxY = Math.max(maxY, Math.max(...dataset.data));
            }
        });
        
        // 添加边距
        const xMargin = Math.max(1000, (maxX - minX) * 0.1);
        const yMargin = Math.max(500, (maxY - minY) * 0.1);
        
        minX -= xMargin;
        maxX += xMargin;
        minY -= yMargin;
        maxY += yMargin;
        
        // 限制范围
        minY = Math.max(-65535, minY);
        maxY = Math.min(65535, maxY);
        minX = Math.max(0, minX);
        
        this.chart.options.scales.x.min = minX;
        this.chart.options.scales.x.max = maxX;
        this.chart.options.scales.y.min = minY;
        this.chart.options.scales.y.max = maxY;
        
        this.chart.update();
        this.updateScrollbars();
    }

    updateViewportTransform() {
        if (!this.canvas) return;
        
        // 应用边界限制
        this.enforceViewportBounds();
        
        // 应用变换
        this.canvas.style.transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.scaleX}, ${this.viewport.scaleY})`;
    }

    // 删除重复的viewport相关方法
    // 只保留Chart.js坐标系的updateScrollbars方法
    
    updateScrollbars() {
        if (!this.chart) return;
        
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        const xTrack = document.getElementById('x-scrollbar-track');
        const yTrack = document.getElementById('y-scrollbar-track');
        
        if (!xThumb || !yThumb || !xTrack || !yTrack) return;
    
        // 获取当前数据范围
        const xMin = this.chart.options.scales.x.min || 0;
        const xMax = this.chart.options.scales.x.max || 10000;
        const yMin = this.chart.options.scales.y.min || -5000;
        const yMax = this.chart.options.scales.y.max || 5000;
    
        // 计算数据总范围
        const totalXRange = Math.max(10000, xMax - xMin);
        const totalYRange = Math.max(10000, yMax - yMin);
    
        // 计算可视范围比例
        const visibleXRatio = Math.min(1, 10000 / totalXRange);
        const visibleYRatio = Math.min(1, 10000 / totalYRange);
    
        // 设置thumb大小
        xThumb.style.width = `${Math.max(5, visibleXRatio * 100)}%`;
        yThumb.style.height = `${Math.max(5, visibleYRatio * 100)}%`;
    
        // 计算thumb位置
        const xThumbWidth = parseFloat(xThumb.style.width);
        const yThumbHeight = parseFloat(yThumb.style.height);
    
        // 计算当前位置比例
        const xPositionRatio = xMin / Math.max(10000, totalXRange - 10000);
        const yPositionRatio = (yMax - 5000) / Math.max(10000, totalYRange - 10000);
    
        xThumb.style.left = `${Math.max(0, Math.min(100 - xThumbWidth, xPositionRatio * (100 - xThumbWidth)))}%`;
        yThumb.style.top = `${Math.max(0, Math.min(100 - yThumbHeight, yPositionRatio * (100 - yThumbHeight)))}%`;
    }

    setupScrollbarEvents() {
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        const xTrack = document.getElementById('x-scrollbar-track');
        const yTrack = document.getElementById('y-scrollbar-track');
        
        if (!xThumb || !yThumb || !xTrack || !yTrack) return;

        // X轴滚动条拖拽
        this.setupScrollbarDrag(xThumb, xTrack, 'x');
        this.setupScrollbarDrag(yThumb, yTrack, 'y');
    }

    setupScrollbarDrag(thumb, track, axis) {
        let isDragging = false;
        let startPos = 0;
        let startThumbPos = 0;

        const onMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            startPos = axis === 'x' ? e.clientX : e.clientY;
            startThumbPos = axis === 'x' ? thumb.offsetLeft : thumb.offsetTop;
            
            thumb.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const currentPos = axis === 'x' ? e.clientX : e.clientY;
            const delta = currentPos - startPos;
            
            const trackSize = axis === 'x' ? track.offsetWidth : track.offsetHeight;
            const thumbSize = axis === 'x' ? thumb.offsetWidth : thumb.offsetHeight;
            const maxThumbPos = trackSize - thumbSize;
            
            let newThumbPos = Math.max(0, Math.min(maxThumbPos, startThumbPos + delta));
            let ratio = maxThumbPos > 0 ? newThumbPos / maxThumbPos : 0;
            
            if (axis === 'x') {
                thumb.style.left = `${newThumbPos}px`;
                
                // 根据新的X轴范围逻辑计算偏移
                const currentTime = this.data.labels.length > 0 ? this.data.labels[this.data.labels.length - 1] : 0;
                const maxTime = currentTime + 10; // 始终为当前时间+10秒
                const viewWidth = this.canvas.parentElement.clientWidth;
                
                // 计算可滚动区域
                const canvasWidth = maxTime * this.viewport.scaleX; // 使用时间范围而不是像素
                const maxOffsetX = Math.max(0, canvasWidth - viewWidth);
                this.viewport.x = -ratio * maxOffsetX;
            } else {
                thumb.style.top = `${newThumbPos}px`;
                
                const canvasHeight = this.canvas.offsetHeight * this.viewport.scaleY;
                const viewHeight = this.canvas.parentElement.clientHeight;
                const maxOffsetY = Math.max(0, canvasHeight - viewHeight);
                this.viewport.y = -ratio * maxOffsetY;
            }
            
            this.updateViewportTransform();
        };

        const onMouseUp = () => {
            isDragging = false;
            thumb.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        thumb.addEventListener('mousedown', onMouseDown);
        
        // 点击轨道跳转到位置
        track.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (e.target === thumb) return;
            
            const trackRect = track.getBoundingClientRect();
            const clickPos = axis === 'x' ? e.clientX - trackRect.left : e.clientY - trackRect.top;
            const thumbSize = axis === 'x' ? thumb.offsetWidth : thumb.offsetHeight;
            const trackSize = axis === 'x' ? track.offsetWidth : track.offsetHeight;
            const usableTrackSize = trackSize - thumbSize;
            
            let newThumbPos = Math.max(0, Math.min(usableTrackSize, clickPos - thumbSize / 2));
            let ratio = usableTrackSize > 0 ? newThumbPos / usableTrackSize : 0;
            
            if (axis === 'x') {
                const startRange = this.chart.options.scales.x.max - this.chart.options.scales.x.min;
                const newMin = Math.max(0, Math.min(1000000 - startRange, ratio * (1000000 - startRange)));
                const newMax = newMin + startRange;
                
                this.chart.options.scales.x.min = newMin;
                this.chart.options.scales.x.max = newMax;
                
                thumb.style.left = `${newThumbPos}px`;
                
            } else {
                const startRange = this.chart.options.scales.y.max - this.chart.options.scales.y.min;
                
                // 修正方向计算：ratio直接对应数据范围比例
                const dataMin = -65535 + (ratio * (131070 - startRange));
                const newMax = Math.min(65535, dataMin + startRange);
                const newMin = Math.max(-65535, dataMin);
                
                this.chart.options.scales.y.min = newMin;
                this.chart.options.scales.y.max = newMax;
                
                thumb.style.top = `${newThumbPos}px`;
            }
            
            this.chart.update();
        });
    }

    // 设置图表类型
    setType(type) {
        if (this.chart) {
            this.chart.config.type = type;
            this.chart.update();
        }
    }

    // 设置Y轴范围
    setYRange(min, max) {
        if (this.chart) {
            this.chart.options.scales.y.min = min;
            this.chart.options.scales.y.max = max;
            this.chart.update();
        }
    }

    // 自动调整Y轴范围
    autoScaleY() {
        if (!this.chart || this.data.datasets.length === 0) return;
        
        let min = Infinity;
        let max = -Infinity;
        
        // 查找所有数据集的最小最大值
        this.data.datasets.forEach(dataset => {
            if (dataset.data.length > 0) {
                const datasetMin = Math.min(...dataset.data);
                const datasetMax = Math.max(...dataset.data);
                
                min = Math.min(min, datasetMin);
                max = Math.max(max, datasetMax);
            }
        });
        
        // 添加一些边距
        const range = max - min;
        const margin = range * 0.1;
        
        this.setYRange(min - margin, max + margin);
    }

    // 显示/隐藏数据集
    toggleDatasetVisibility(index) {
        if (this.chart && index >= 0 && index < this.data.datasets.length) {
            const meta = this.chart.getDatasetMeta(index);
            meta.hidden = !meta.hidden;
            this.chart.update();
        }
    }

    // 根据参数ID更新数据集可视性
    updateDatasetVisibility(paramId, isVisible) {
        if (!this.chart) return;
        
        // 查找包含参数ID的数据集
        this.data.datasets.forEach((dataset, index) => {
            if ((dataset.paramId && dataset.paramId === paramId) || 
                (dataset.label && dataset.label.includes(paramId))) {
                const meta = this.chart.getDatasetMeta(index);
                meta.hidden = !isVisible;
            }
        });
        
        this.chart.update();
    }

    // 获取数据集的可视性状态
    getDatasetVisibility(index) {
        if (!this.chart || index < 0 || index >= this.data.datasets.length) {
            return false;
        }
        
        const meta = this.chart.getDatasetMeta(index);
        return !meta.hidden;
    }

    // 根据标签名查找数据集索引
    findDatasetIndexByLabel(labelPattern) {
        return this.data.datasets.findIndex(dataset => 
            dataset.label && dataset.label.includes(labelPattern)
        );
    }

    // 批量更新数据集可视性
    updateMultipleDatasetsVisibility(visibilityMap) {
        if (!this.chart) return;
        
        Object.entries(visibilityMap).forEach(([paramId, isVisible]) => {
            this.updateDatasetVisibility(paramId, isVisible);
        });
    }

    // 获取可见的数据集数量
    getVisibleDatasetCount() {
        if (!this.chart) return 0;
        
        return this.data.datasets.filter((dataset, index) => {
            const meta = this.chart.getDatasetMeta(index);
            return !meta.hidden;
        }).length;
    }

    // 设置鼠标滚轮缩放 - 以鼠标坐标为中心
    setupMouseWheelZoom() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            
            // 计算当前鼠标对应的数据坐标
            const xScale = this.chart.scales.x;
            const yScale = this.chart.scales.y;
            
            const dataMouseX = xScale.getValueForPixel(mouseX);
            const dataMouseY = yScale.getValueForPixel(mouseY);
            
            // 计算新的范围
            const currentXRange = xScale.max - xScale.min;
            const currentYRange = yScale.max - yScale.min;
            
            const newXRange = Math.max(1000, Math.min(1000000, currentXRange * zoomFactor));
            const newYRange = Math.max(1000, Math.min(131070, currentYRange * zoomFactor));
            
            // 确保不超出数据范围
            const newXMin = Math.max(0, Math.min(1000000 - newXRange, dataMouseX - (mouseX / rect.width) * newXRange));
            const newXMax = newXMin + newXRange;
            
            const newYMin = Math.max(-65535, Math.min(65535 - newYRange, dataMouseY - (mouseY / rect.height) * newYRange));
            const newYMax = newYMin + newYRange;
            
            // 应用新的范围
            this.chart.options.scales.x.min = newXMin;
            this.chart.options.scales.x.max = newXMax;
            this.chart.options.scales.y.min = newYMin;
            this.chart.options.scales.y.max = newYMax;
            
            this.chart.update();
            this.updateScrollbars(); // 更新滚动条
        });
        
        // 设置滚动条控制
        this.setupScrollbarControls();
    }
    
    // 设置滚动条控制
    setupScrollbarControls() {
        const xTrack = document.getElementById('x-scrollbar-track');
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yTrack = document.getElementById('y-scrollbar-track');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        
        if (!xTrack || !xThumb || !yTrack || !yThumb) return;
        
        const xMin = this.chart.options.scales.x.min;
        const xMax = this.chart.options.scales.x.max;
        const yMin = this.chart.options.scales.y.min;
        const yMax = this.chart.options.scales.y.max;
        
        const xRange = xMax - xMin;
        const yRange = yMax - yMin;
        
        // 获取实际数据范围
        let dataMinX = 0;
        let dataMaxX = 10000; // 默认10秒
        let dataMinY = -5000;
        let dataMaxY = 5000;
        
        if (this.data.labels.length > 0) {
            dataMinX = Math.min(...this.data.labels);
            dataMaxX = Math.max(...this.data.labels) + 10000; // 添加10秒缓冲区
        }
        
        if (this.data.datasets.length > 0) {
            this.data.datasets.forEach(dataset => {
                if (dataset.data.length > 0) {
                    dataMinY = Math.min(dataMinY, Math.min(...dataset.data));
                    dataMaxY = Math.max(dataMaxY, Math.max(...dataset.data));
                }
            });
            // 添加边距
            const margin = (dataMaxY - dataMinY) * 0.1;
            dataMinY -= margin;
            dataMaxY += margin;
        }
        
        dataMinY = Math.max(-65535, dataMinY);
        dataMaxY = Math.min(65535, dataMaxY);
        
        const totalXRange = Math.max(dataMaxX, 10000); // 至少10秒
        const totalYRange = dataMaxY - dataMinY;
        
        // X轴滚动条
        const xRatio = xRange / totalXRange;
        const xThumbWidth = Math.max(20, xTrack.offsetWidth * (1 - Math.min(0.95, Math.max(0.05, xRatio))));
        
        if (xRatio < 0.95) {
            const xMaxOffset = totalXRange - xRange;
            const xOffsetRatio = xMaxOffset > 0 ? xMin / xMaxOffset : 0;
            xThumb.style.width = `${xThumbWidth}px`;
            xThumb.style.left = `${xOffsetRatio * (xTrack.offsetWidth - xThumbWidth)}px`;
            xThumb.style.display = 'block';
        } else {
            xThumb.style.display = 'none';
        }
        
        // Y轴滚动条
        const yRatio = yRange / totalYRange;
        const yThumbHeight = Math.max(20, yTrack.offsetHeight * (1 - Math.min(0.95, Math.max(0.05, yRatio))));
        
        if (yRatio < 0.95) {
            const yMaxOffset = totalYRange - yRange;
            const yOffsetRatio = yMaxOffset > 0 ? (dataMaxY - yMax) / yMaxOffset : 0;
            yThumb.style.height = `${yThumbHeight}px`;
            yThumb.style.top = `${yOffsetRatio * (yTrack.offsetHeight - yThumbHeight)}px`;
            yThumb.style.display = 'block';
        } else {
            yThumb.style.display = 'none';
        }
    }

    // 设置滚动条拖拽 - 修复坐标计算
    setupScrollbarDrag(track, thumb, axis) {
        let isDragging = false;
        let startMousePos = 0;
        let startRangeStart = 0;
        let startRangeSize = 0;
    
        const getDataRange = () => {
            let dataMinX = 0;
            let dataMaxX = 10000;
            let dataMinY = -5000;
            let dataMaxY = 5000;
    
            if (this.data.labels.length > 0) {
                dataMinX = Math.min(...this.data.labels);
                dataMaxX = Math.max(...this.data.labels) + 10000;
            }
    
            if (this.data.datasets.length > 0) {
                this.data.datasets.forEach(dataset => {
                    if (dataset.data.length > 0) {
                        dataMinY = Math.min(dataMinY, Math.min(...dataset.data));
                        dataMaxY = Math.max(dataMaxY, Math.max(...dataset.data));
                    }
                });
                const margin = (dataMaxY - dataMinY) * 0.1;
                dataMinY -= margin;
                dataMaxY += margin;
            }
    
            return axis === 'x' 
                ? { min: 0, max: Math.max(dataMaxX, 10000) }
                : { min: Math.max(-65535, dataMinY), max: Math.min(65535, dataMaxY) };
        };
    
        const onMouseDown = (e) => {
            e.preventDefault();
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
            e.stopPropagation();
            
            const currentMousePos = axis === 'x' ? e.clientX : e.clientY;
            const mouseDelta = currentMousePos - startMousePos;
            
            const trackSize = axis === 'x' ? track.offsetWidth : track.offsetHeight;
            const thumbSize = axis === 'x' ? thumb.offsetWidth : thumb.offsetHeight;
            const usableTrackSize = Math.max(0, trackSize - thumbSize);
            
            if (usableTrackSize <= 0) return;
            
            const ratio = mouseDelta / usableTrackSize;
            const dataRange = getDataRange();
            const totalRange = dataRange.max - dataRange.min;
            const maxOffset = Math.max(0, totalRange - startRangeSize);
            
            let newStart = startRangeStart + (ratio * maxOffset);
            
            // 限制范围
            newStart = Math.max(dataRange.min, Math.min(dataRange.max - startRangeSize, newStart));
            
            if (axis === 'x') {
                this.chart.options.scales.x.min = newStart;
                this.chart.options.scales.x.max = newStart + startRangeSize;
            } else {
                this.chart.options.scales.y.min = newStart;
                this.chart.options.scales.y.max = newStart + startRangeSize;
            }
            
            this.chart.update();
            this.updateScrollbars();
        };
    
        const onMouseUp = () => {
            isDragging = false;
            thumb.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    
        thumb.addEventListener('mousedown', onMouseDown);
        
        // 点击轨道跳转到位置
        track.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (e.target === thumb) return;
            
            const trackRect = track.getBoundingClientRect();
            const clickPos = axis === 'x' ? e.clientX - trackRect.left : e.clientY - trackRect.top;
            const thumbSize = axis === 'x' ? thumb.offsetWidth : thumb.offsetHeight;
            const trackSize = axis === 'x' ? track.offsetWidth : track.offsetHeight;
            const usableTrackSize = Math.max(0, trackSize - thumbSize);
            
            if (usableTrackSize <= 0) return;
            
            const ratio = Math.max(0, Math.min(1, clickPos / trackSize));
            const dataRange = getDataRange();
            const totalRange = dataRange.max - dataRange.min;
            const currentRangeSize = axis === 'x' 
                ? this.chart.options.scales.x.max - this.chart.options.scales.x.min
                : this.chart.options.scales.y.max - this.chart.options.scales.y.min;
            
            let newStart = dataRange.min + (ratio * (totalRange - currentRangeSize));
            newStart = Math.max(dataRange.min, Math.min(dataRange.max - currentRangeSize, newStart));
            
            if (axis === 'x') {
                this.chart.options.scales.x.min = newStart;
                this.chart.options.scales.x.max = newStart + currentRangeSize;
            } else {
                this.chart.options.scales.y.min = newStart;
                this.chart.options.scales.y.max = newStart + currentRangeSize;
            }
            
            this.chart.update();
            this.updateScrollbars();
        });
    }

    // 设置图表类型
    setType(type) {
        if (this.chart) {
            this.chart.config.type = type;
            this.chart.update();
        }
    }

    // 设置Y轴范围
    setYRange(min, max) {
        if (this.chart) {
            this.chart.options.scales.y.min = min;
            this.chart.options.scales.y.max = max;
            this.chart.update();
        }
    }

    // 自动调整Y轴范围
    autoScaleY() {
        if (!this.chart || this.data.datasets.length === 0) return;
        
        let min = Infinity;
        let max = -Infinity;
        
        // 查找所有数据集的最小最大值
        this.data.datasets.forEach(dataset => {
            if (dataset.data.length > 0) {
                const datasetMin = Math.min(...dataset.data);
                const datasetMax = Math.max(...dataset.data);
                
                min = Math.min(min, datasetMin);
                max = Math.max(max, datasetMax);
            }
        });
        
        // 添加一些边距
        const range = max - min;
        const margin = range * 0.1;
        
        this.setYRange(min - margin, max + margin);
    }

    // 显示/隐藏数据集
    toggleDatasetVisibility(index) {
        if (this.chart && index >= 0 && index < this.data.datasets.length) {
            const meta = this.chart.getDatasetMeta(index);
            meta.hidden = !meta.hidden;
            this.chart.update();
        }
    }

    // 根据参数ID更新数据集可视性
    updateDatasetVisibility(paramId, isVisible) {
        if (!this.chart) return;
        
        // 查找包含参数ID的数据集
        this.data.datasets.forEach((dataset, index) => {
            if ((dataset.paramId && dataset.paramId === paramId) || 
                (dataset.label && dataset.label.includes(paramId))) {
                const meta = this.chart.getDatasetMeta(index);
                meta.hidden = !isVisible;
            }
        });
        
        this.chart.update();
    }

    // 获取数据集的可视性状态
    getDatasetVisibility(index) {
        if (!this.chart || index < 0 || index >= this.data.datasets.length) {
            return false;
        }
        
        const meta = this.chart.getDatasetMeta(index);
        return !meta.hidden;
    }

    // 根据标签名查找数据集索引
    findDatasetIndexByLabel(labelPattern) {
        return this.data.datasets.findIndex(dataset => 
            dataset.label && dataset.label.includes(labelPattern)
        );
    }

    // 批量更新数据集可视性
    updateMultipleDatasetsVisibility(visibilityMap) {
        if (!this.chart) return;
        
        Object.entries(visibilityMap).forEach(([paramId, isVisible]) => {
            this.updateDatasetVisibility(paramId, isVisible);
        });
    }

    // 获取可见的数据集数量
    getVisibleDatasetCount() {
        if (!this.chart) return 0;
        
        return this.data.datasets.filter((dataset, index) => {
            const meta = this.chart.getDatasetMeta(index);
            return !meta.hidden;
        }).length;
    }

    // 设置鼠标滚轮缩放 - 以鼠标坐标为中心
    setupMouseWheelZoom() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // 反向缩放
            
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
            
            // 计算鼠标位置对应的数据比例
            const xRatio = mouseX / rect.width;
            const yRatio = mouseY / rect.height;
            
            // 计算新的范围，保持鼠标位置不变
            const newXMin = Math.max(0, currentXMin + xRatio * (currentXRange - newXRange));
            const newXMax = newXMin + newXRange;
            
            const newYMin = Math.max(-65535, currentYMin + yRatio * (currentYRange - newYRange));
            const newYMax = newYMin + newYRange;
            
            // 应用新的范围
            this.chart.options.scales.x.min = newXMin;
            this.chart.options.scales.x.max = newXMax;
            this.chart.options.scales.y.min = newYMin;
            this.chart.options.scales.y.max = newYMax;
            
            this.chart.update();
            this.updateScrollbars();
        });
        
        // 设置滚动条控制
        this.setupScrollbarControls();
    }
}

// 确保ChartManager作为全局变量可用
if (typeof window !== 'undefined') {
    window.ChartManager = ChartManager;
}