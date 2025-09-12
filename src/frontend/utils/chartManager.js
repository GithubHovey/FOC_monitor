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
    setupViewportSystem() {
        this.viewport = {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            contentWidth: 1000,
            contentHeight: 400
        };
        
        this.setupViewportControls();
        this.setupMouseWheelZoom();
        this.setupCanvasDrag();
        this.setupScrollbarEvents();
    }

    setupViewportControls() {
        // 重置视图按钮
        const resetBtn = document.getElementById('zoom-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetViewport());
        }
        
        // 适应数据按钮
        const fitBtn = document.getElementById('zoom-fit');
        if (fitBtn) {
            fitBtn.addEventListener('click', () => this.fitToData());
        }
    }

    setupCanvasDrag() {
        const canvas = this.canvas;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            this.viewport.x += deltaX;
            this.viewport.y += deltaY;
            
            lastX = e.clientX;
            lastY = e.clientY;
            
            this.updateViewportTransform();
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });
    }

    setupMouseWheelZoom() {
        const canvas = this.canvas;
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // 缩放因子
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            
            if (e.ctrlKey || e.metaKey) {
                // Y轴缩放 - 精确保持鼠标位置
                const oldScaleY = this.viewport.scaleY;
                this.viewport.scaleY *= zoomFactor;
                this.viewport.scaleY = Math.max(0.1, Math.min(10, this.viewport.scaleY));
                
                // 计算鼠标位置在缩放前的世界坐标
                const worldYBefore = (mouseY - this.viewport.y) / oldScaleY;
                // 计算缩放后需要的新偏移量，使该世界坐标仍在鼠标位置
                this.viewport.y = mouseY - worldYBefore * this.viewport.scaleY;
            } else {
                // X轴缩放 - 精确保持鼠标位置
                const oldScaleX = this.viewport.scaleX;
                this.viewport.scaleX *= zoomFactor;
                this.viewport.scaleX = Math.max(0.1, Math.min(10, this.viewport.scaleX));
                
                // 计算鼠标位置在缩放前的世界坐标
                const worldXBefore = (mouseX - this.viewport.x) / oldScaleX;
                // 计算缩放后需要的新偏移量，使该世界坐标仍在鼠标位置
                this.viewport.x = mouseX - worldXBefore * this.viewport.scaleX;
            }
            
            // 应用边界限制，确保图表内容始终填充视框
            this.enforceViewportBounds();
            
            this.updateViewportTransform();
            this.updateScrollbars();
        }, { passive: false });
    }

    // 强制视窗边界限制，确保图表内容填充整个视框
    enforceViewportBounds() {
        const canvasWidth = this.canvas.offsetWidth;
        const canvasHeight = this.canvas.offsetHeight;
        const containerWidth = this.canvas.parentElement.clientWidth;
        const containerHeight = this.canvas.parentElement.clientHeight;
        
        // 计算数据范围
        const dataWidth = this.dataRange.x.max - this.dataRange.x.min;
        const dataHeight = this.dataRange.y.max - this.dataRange.y.min;
        
        // 计算缩放后的实际尺寸
        const scaledDataWidth = dataWidth * this.viewport.scaleX;
        const scaledDataHeight = dataHeight * this.viewport.scaleY;
        
        // 确保图表内容至少填满视框
        const minScaleX = containerWidth / dataWidth;
        const minScaleY = containerHeight / dataHeight;
        
        // 限制最小缩放比例，确保填充
        this.viewport.scaleX = Math.max(this.viewport.scaleX, minScaleX * 0.8);
        this.viewport.scaleY = Math.max(this.viewport.scaleY, minScaleY * 0.8);
        
        // 重新计算缩放后的尺寸
        const finalScaledWidth = dataWidth * this.viewport.scaleX;
        const finalScaledHeight = dataHeight * this.viewport.scaleY;
        
        // 限制最大偏移量，防止看到图表之外的内容
        const maxOffsetX = Math.max(0, finalScaledWidth - containerWidth);
        const maxOffsetY = Math.max(0, finalScaledHeight - containerHeight);
        
        // 应用边界限制
        this.viewport.x = Math.max(-maxOffsetX, Math.min(0, this.viewport.x));
        this.viewport.y = Math.max(-maxOffsetY, Math.min(0, this.viewport.y));
    }

    resetViewport() {
        this.viewport.x = 0;
        this.viewport.y = 0;
        this.viewport.scaleX = 1;
        this.viewport.scaleY = 1;
        this.updateViewportTransform();
        this.updateScrollbars();
    }

    fitToData() {
        // 根据数据范围调整视窗
        const datasets = this.data.datasets;
        if (!datasets || datasets.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        datasets.forEach(dataset => {
            if (dataset.data && dataset.data.length > 0) {
                dataset.data.forEach((value, index) => {
                    const x = this.data.labels[index];
                    const y = value;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                });
            }
        });

        if (minX === Infinity) return;

        // 设置图表范围，但限制在合理范围内
        this.chart.options.scales.x.min = 0;
        this.chart.options.scales.x.max = Math.max(maxX, 10000); // 至少显示10秒
        this.chart.options.scales.y.min = Math.max(-65535, minY - (maxY - minY) * 0.1);
        this.chart.options.scales.y.max = Math.min(65535, maxY + (maxY - minY) * 0.1);
        
        this.chart.update();
        this.resetViewport();
    }

    updateViewportTransform() {
        if (!this.canvas) return;
        
        // 应用边界限制
        this.enforceViewportBounds();
        
        // 应用变换
        this.canvas.style.transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.scaleX}, ${this.viewport.scaleY})`;
    }

    updateScrollbars() {
        // 更新滚动条位置和大小
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        
        if (xThumb && yThumb) {
            const canvasWidth = this.canvas.offsetWidth * this.viewport.scaleX;
            const canvasHeight = this.canvas.offsetHeight * this.viewport.scaleY;
            
            const xThumbWidth = Math.min(100, Math.max(20, 100 / this.viewport.scaleX));
            const yThumbHeight = Math.min(100, Math.max(20, 100 / this.viewport.scaleY));
            
            xThumb.style.width = `${xThumbWidth}px`;
            yThumb.style.height = `${yThumbHeight}px`;
            
            const xThumbLeft = (-this.viewport.x / canvasWidth) * 100;
            const yThumbTop = (-this.viewport.y / canvasHeight) * 100;
            
            xThumb.style.left = `${Math.max(0, Math.min(100 - xThumbWidth, xThumbLeft))}%`;
            yThumb.style.top = `${Math.max(0, Math.min(100 - yThumbHeight, yThumbTop))}%`;
        }
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
        
        // 设置滚动条交互
        this.setupScrollbarControls();
    }
    
    // 设置滚动条控制
    setupScrollbarControls() {
        const xTrack = document.getElementById('x-scrollbar-track');
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yTrack = document.getElementById('y-scrollbar-track');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        
        if (!xTrack || !xThumb || !yTrack || !yThumb) return;
        
        // X轴滚动条控制
        this.setupScrollbarDrag(xTrack, xThumb, 'x');
        this.setupScrollbarDrag(yTrack, yThumb, 'y');
        
        // 初始更新滚动条
        this.updateScrollbars();
    }
    
    // 设置单个滚动条拖拽 - 简化版本
    setupScrollbarDrag(track, thumb, axis) {
        let isDragging = false;
        let startMousePos = 0;
        let startDataPos = 0;
        let startRange = 0;
        
        const onMouseDown = (e) => {
            isDragging = true;
            startMousePos = axis === 'x' ? e.clientX : e.clientY;
            
            if (axis === 'x') {
                startDataPos = this.chart.options.scales.x.min;
                startRange = this.chart.options.scales.x.max - this.chart.options.scales.x.min;
            } else {
                startDataPos = this.chart.options.scales.y.min;
                startRange = this.chart.options.scales.y.max - this.chart.options.scales.y.min;
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
            const usableTrackSize = trackSize - thumbSize;
            
            if (axis === 'x') {
                // X轴：总范围0-1000000
                const totalDataRange = 1000000;
                const pixelsPerData = usableTrackSize > 0 ? totalDataRange / usableTrackSize : 0;
                const dataDelta = mouseDelta * pixelsPerData;
                
                const newMin = Math.max(0, Math.min(totalDataRange - startRange, startDataPos + dataDelta));
                const newMax = newMin + startRange;
                
                this.chart.options.scales.x.min = newMin;
                this.chart.options.scales.x.max = newMax;
                
                // 更新thumb位置
                const ratio = usableTrackSize > 0 ? newMin / (1000000 - startRange) : 0;
                thumb.style.left = `${Math.max(0, Math.min(usableTrackSize, ratio * usableTrackSize))}px`;
                
            } else {
                // Y轴：总范围-65535到65535
                const totalDataRange = 131070; // 65535 - (-65535)
                const pixelsPerData = usableTrackSize > 0 ? totalDataRange / usableTrackSize : 0;
                const dataDelta = mouseDelta * pixelsPerData;
                
                const newMin = Math.max(-65535, Math.min(65535 - startRange, startDataPos + dataDelta));
                const newMax = newMin + startRange;
                
                this.chart.options.scales.y.min = newMin;
                this.chart.options.scales.y.max = newMax;
                
                // 更新thumb位置（注意Y轴是反向的）
                const ratio = usableTrackSize > 0 ? (65535 - newMax) / (131070 - startRange) : 0;
                thumb.style.top = `${Math.max(0, Math.min(usableTrackSize, ratio * usableTrackSize))}px`;
            }
            
            this.chart.update();
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
    
    // 更新滚动条状态
    updateScrollbars() {
        const xTrack = document.getElementById('x-scrollbar-track');
        const xThumb = document.getElementById('x-scrollbar-thumb');
        const yTrack = document.getElementById('y-scrollbar-track');
        const yThumb = document.getElementById('y-scrollbar-thumb');
        
        if (!xTrack || !xThumb || !yTrack || !yThumb) return;
        
        const xRange = this.chart.options.scales.x.max - this.chart.options.scales.x.min;
        const yRange = this.chart.options.scales.y.max - this.chart.options.scales.y.min;
        
        const totalXRange = 1000000;
        const totalYRange = 131070;
        
        // X轴滚动条
        const xRatio = xRange / totalXRange;
        const xThumbWidth = Math.max(20, xTrack.offsetWidth * xRatio);
        const xMaxOffset = Math.max(0, totalXRange - xRange);
        const xOffsetRatio = xMaxOffset > 0 ? this.chart.options.scales.x.min / xMaxOffset : 0;
        
        xThumb.style.width = `${xThumbWidth}px`;
        xThumb.style.left = `${xOffsetRatio * (xTrack.offsetWidth - xThumbWidth)}px`;
        xThumb.style.display = xRatio < 1 ? 'block' : 'none';
        
        // Y轴滚动条
        const yRatio = yRange / totalYRange;
        const yThumbHeight = Math.max(20, yTrack.offsetHeight * yRatio);
        const yMaxOffset = Math.max(0, totalYRange - yRange);
        
        // 修正Y轴偏移计算 - 反向：数据值越大，滚动条位置越靠上
        const yOffset = 65535 - this.chart.options.scales.y.max;
        const yOffsetRatio = yMaxOffset > 0 ? yOffset / yMaxOffset : 0;
        
        yThumb.style.height = `${yThumbHeight}px`;
        yThumb.style.top = `${yOffsetRatio * (yTrack.offsetHeight - yThumbHeight)}px`;
        yThumb.style.display = yRatio < 1 ? 'block' : 'none';
    }

    // 重置到初始视窗范围
    resetToInitialView() {
        if (!this.chart) return;
        
        this.chart.options.scales.x.min = 0;
        this.chart.options.scales.x.max = 10000; // 0~10000ms
        this.chart.options.scales.y.min = -5000; // -5000~5000
        this.chart.options.scales.y.max = 5000;
        
        this.chart.update();
        this.updateScrollbars(); // 更新滚动条状态
    }
}

// 创建全局图表管理器实例
window.ChartManager = ChartManager;