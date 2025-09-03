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
                            text: '时间 (秒)'
                        },
                        min: 0,
                        max: this.timeRange
                    },
                    y: {
                        title: {
                            display: true,
                            text: '数值'
                        },
                        beginAtZero: false
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
        
        // 创建图表
        this.chart = new Chart(this.ctx, mergedConfig);
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
        if (this.data.labels.length === 0) return;
        
        const currentTime = this.data.labels[this.data.labels.length - 1];
        const minTime = Math.max(0, currentTime - this.timeRange);
        const maxTime = currentTime;
        
        this.chart.options.scales.x.min = minTime;
        this.chart.options.scales.x.max = maxTime;
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

    // 获取可见的数据集数量
    getVisibleDatasetCount() {
        if (!this.chart) return 0;
        
        return this.data.datasets.filter((dataset, index) => {
            const meta = this.chart.getDatasetMeta(index);
            return !meta.hidden;
        }).length;
    }
}

export default ChartManager;