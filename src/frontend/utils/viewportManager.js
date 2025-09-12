/**
 * 视窗管理器 - 专门处理FOC电机控制的图表视窗功能
 * 功能：
 * 1. Y轴范围-65535~65535，X轴动态范围0~当前时间+20000ms
 * 2. 初始视窗：Y轴-5000~5000，X轴0~10000ms
 * 3. 滚轮条拖动移动
 * 4. 鼠标滚轮缩放（以鼠标为中心）
 * 5. 缩放边界限制
 */

// 简单的调试日志系统
class DebugLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
    }
    
    log(level, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null
        };
        
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // 控制台输出
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
        
        // 更新页面日志显示
        this.updateLogDisplay();
    }
    
    updateLogDisplay() {
        let logContainer = document.getElementById('debug-log-container');
        if (!logContainer) {
            logContainer = document.createElement('div');
            logContainer.id = 'debug-log-container';
            logContainer.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 300px;
                max-height: 200px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                font-family: monospace;
                font-size: 11px;
                padding: 10px;
                border-radius: 4px;
                z-index: 10000;
                display: none;
            `;
            document.body.appendChild(logContainer);
        }
        
        const logText = this.logs.map(log => 
            `[${log.timestamp}] ${log.level}: ${log.message}`
        ).join('\n');
        
        logContainer.textContent = logText;
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    show() {
        const logContainer = document.getElementById('debug-log-container');
        if (logContainer) {
            logContainer.style.display = 'block';
        }
    }
    
    hide() {
        const logContainer = document.getElementById('debug-log-container');
        if (logContainer) {
            logContainer.style.display = 'none';
        }
    }
    
    export() {
        const logText = this.logs.map(log => 
            `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}` + 
            (log.data ? ` ${JSON.stringify(log.data, null, 2)}` : '')
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'viewport-debug.log';
        a.click();
        URL.revokeObjectURL(url);
    }
}

class ViewportManager {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.container = canvas.parentElement;
        this.logger = new DebugLogger();
        
        // 数据范围（固定）
        this.dataRange = {
            x: { min: 0, max: 20000 }, // 初始最大20秒，会动态增长
            y: { min: -65535, max: 65535 }
        };
        
        // 视窗范围（初始显示区域）
        this.viewport = {
            x: { min: 0, max: 10000 },      // X轴初始0~10000ms
            y: { min: -5000, max: 5000 }    // Y轴初始-5000~5000
        };
        
        // 缩放限制
        this.zoomLimits = {
            x: { min: 100, max: 1000000 },   // X轴最小100ms，最大1000秒
            y: { min: 100, max: 131070 }    // Y轴最小100单位，最大全范围
        };
        
        // 缩放倍率
        this.zoomFactor = 1.2;
        
        // 状态
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupScrollbars();
        this.updateDisplay();
    }
    
    setupCanvas() {
        // 设置canvas样式
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // 设置容器样式
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
    }
    
    setupEventListeners() {
        // 鼠标滚轮缩放
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomIn = e.deltaY < 0;
            this.zoomAtMouse(mouseX, mouseY, zoomIn);
        });
        
        // 鼠标拖动
        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.canvas) {
                this.startDrag(e.clientX, e.clientY);
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDrag(e.clientX, e.clientY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.endDrag();
        });
    }
    
    setupScrollbars() {
        // 创建X轴滚动条
        const xScrollbar = document.createElement('div');
        xScrollbar.id = 'viewport-x-scrollbar';
        xScrollbar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 12px;
            background: rgba(255, 255, 255, 0.1);
            cursor: pointer;
        `;
        
        const xThumb = document.createElement('div');
        xThumb.id = 'viewport-x-thumb';
        xThumb.style.cssText = `
            position: absolute;
            height: 100%;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 6px;
            cursor: grab;
        `;
        
        // 创建Y轴滚动条
        const yScrollbar = document.createElement('div');
        yScrollbar.id = 'viewport-y-scrollbar';
        yScrollbar.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 12px;
            height: 100%;
            background: rgba(255, 255, 255, 0.1);
            cursor: pointer;
        `;
        
        const yThumb = document.createElement('div');
        yThumb.id = 'viewport-y-thumb';
        yThumb.style.cssText = `
            position: absolute;
            width: 100%;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 6px;
            cursor: grab;
        `;
        
        xScrollbar.appendChild(xThumb);
        yScrollbar.appendChild(yThumb);
        this.container.appendChild(xScrollbar);
        this.container.appendChild(yScrollbar);
        
        // 设置滚动条事件
        this.setupScrollbarEvents(xThumb, yThumb);
    }
    
    setupScrollbarEvents(xThumb, yThumb) {
        // X轴滚动条拖拽
        this.setupScrollbarDrag(xThumb, 'x');
        this.setupScrollbarDrag(yThumb, 'y');
        
        // 添加轨道点击事件 - 使用mousedown避免click事件的延迟和冒泡
        const xScrollbar = document.getElementById('viewport-x-scrollbar');
        const yScrollbar = document.getElementById('viewport-y-scrollbar');
        
        if (xScrollbar) {
            // 阻止所有默认行为
            xScrollbar.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target === xThumb) return;
                this.handleScrollbarTrackClick(e, 'x', xScrollbar, xThumb);
            });
            
            // 完全阻止click事件
            xScrollbar.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
        
        if (yScrollbar) {
            // 阻止所有默认行为
            yScrollbar.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target === yThumb) return;
                this.handleScrollbarTrackClick(e, 'y', yScrollbar, yThumb);
            });
            
            // 完全阻止click事件
            yScrollbar.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
    }
    
    setupScrollbarDrag(thumb, axis) {
        let isDragging = false;
        let startPos = 0;
        let startViewportMin = 0;
        
        thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation(); // 防止触发轨道点击
            
            // 记录拖拽开始状态
            const startViewport = {
                x: { ...this.viewport.x },
                y: { ...this.viewport.y }
            };
            
            isDragging = true;
            startPos = axis === 'x' ? e.clientX : e.clientY;
            startViewportMin = axis === 'x' ? this.viewport.x.min : this.viewport.y.min;
            thumb.style.cursor = 'grabbing';
            
            this.logger.log('debug', '滚动条拖拽开始', {
                axis,
                startPos,
                startViewportMin,
                initialViewport: startViewport,
                containerSize: {
                    width: this.container.clientWidth,
                    height: this.container.clientHeight
                },
                dataRange: this.dataRange
            });
            
            const onMouseMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                e.stopPropagation();
                
                const currentPos = axis === 'x' ? e.clientX : e.clientY;
                const delta = currentPos - startPos;
                
                // 使用绝对位置计算，避免累积误差
                const containerSize = axis === 'x' ? this.container.clientWidth : this.container.clientHeight;
                const dataRange = axis === 'x' 
                    ? this.dataRange.x.max - this.dataRange.x.min
                    : this.dataRange.y.max - this.dataRange.y.min;
                const scrollRatio = delta / containerSize;
                
                const oldViewport = {
                    x: { ...this.viewport.x },
                    y: { ...this.viewport.y }
                };
                
                if (axis === 'x') {
                    const viewportRange = this.viewport.x.max - this.viewport.x.min;
                    this.viewport.x.min = startViewportMin + scrollRatio * dataRange;
                    this.viewport.x.max = this.viewport.x.min + viewportRange;
                } else {
                    const viewportRange = this.viewport.y.max - this.viewport.y.min;
                    this.viewport.y.min = startViewportMin - scrollRatio * dataRange; // Y轴反向
                    this.viewport.y.max = this.viewport.y.min + viewportRange;
                }
                
                this.clampViewport();
                this.updateDisplay();
                
                // 记录拖拽过程中的关键信息（限制频率避免过多日志）
                if (Math.abs(delta) % 50 < 5) { // 每50像素记录一次
                    this.logger.log('debug', '滚动条拖拽中', {
                        axis,
                        delta,
                        scrollRatio,
                        currentPos,
                        viewport: {
                            before: oldViewport,
                            after: {
                                x: { ...this.viewport.x },
                                y: { ...this.viewport.y }
                            }
                        }
                    });
                }
            };
            
            const onMouseUp = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = false;
                thumb.style.cursor = 'grab';
                
                this.logger.log('debug', '滚动条拖拽结束', {
                    axis,
                    finalViewport: {
                        x: { ...this.viewport.x },
                        y: { ...this.viewport.y }
                    }
                });
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    // 以鼠标为中心的缩放
    zoomAtMouse(mouseX, mouseY, zoomIn) {
        const factor = zoomIn ? this.zoomFactor : 1 / this.zoomFactor;
        
        // 计算鼠标在数据坐标系中的位置
        const dataMouseX = this.screenToDataX(mouseX);
        const dataMouseY = this.screenToDataY(mouseY);
        
        // 计算新的视窗范围
        let newWidth = this.viewport.x.max - this.viewport.x.min;
        let newHeight = this.viewport.y.max - this.viewport.y.min;
        
        newWidth *= factor;
        newHeight *= factor;
        
        // 应用边界限制
        newWidth = Math.max(this.zoomLimits.x.min, Math.min(this.zoomLimits.x.max, newWidth));
        newHeight = Math.max(this.zoomLimits.y.min, Math.min(this.zoomLimits.y.max, newHeight));
        
        // 计算新的视窗边界，保持鼠标位置不变
        const newMinX = dataMouseX - (dataMouseX - this.viewport.x.min) * (newWidth / (this.viewport.x.max - this.viewport.x.min));
        const newMaxX = newMinX + newWidth;
        
        const newMinY = dataMouseY - (dataMouseY - this.viewport.y.min) * (newHeight / (this.viewport.y.max - this.viewport.y.min));
        const newMaxY = newMinY + newHeight;
        
        // 应用新的视窗范围
        this.viewport.x.min = newMinX;
        this.viewport.x.max = newMaxX;
        this.viewport.y.min = newMinY;
        this.viewport.y.max = newMaxY;
        
        // 确保不超出数据范围
        this.clampViewport();
        
        this.updateDisplay();
    }
    
    // 拖动移动
    startDrag(x, y) {
        this.isDragging = true;
        this.dragStart = { x, y };
        this.lastMousePos = { x, y };
        this.container.style.cursor = 'grabbing';
    }
    
    handleDrag(x, y) {
        if (!this.isDragging) return;
        
        const deltaX = x - this.lastMousePos.x;
        const deltaY = y - this.lastMousePos.y;
        
        this.panByDelta(deltaX, deltaY);
        this.lastMousePos = { x, y };
    }
    
    endDrag() {
        this.isDragging = false;
        this.container.style.cursor = 'default';
    }
    
    // 通过滚动条移动
    scrollByDelta(delta, axis) {
        const containerSize = axis === 'x' ? this.container.clientWidth : this.container.clientHeight;
        const range = axis === 'x' ? this.dataRange.x.max - this.dataRange.x.min : this.dataRange.y.max - this.dataRange.y.min;
        const scrollAmount = (delta / containerSize) * range * 0.1;
        
        if (axis === 'x') {
            this.viewport.x.min += scrollAmount;
            this.viewport.x.max += scrollAmount;
        } else {
            this.viewport.y.min -= scrollAmount; // Y轴反向
            this.viewport.y.max -= scrollAmount;
        }
        
        this.clampViewport();
        this.updateDisplay();
    }
    
    // 通过鼠标拖动移动
    panByDelta(deltaX, deltaY) {
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        
        const dataWidth = this.viewport.x.max - this.viewport.x.min;
        const dataHeight = this.viewport.y.max - this.viewport.y.min;
        
        const panX = (deltaX / containerWidth) * dataWidth;
        const panY = (deltaY / containerHeight) * dataHeight;
        
        this.viewport.x.min -= panX;
        this.viewport.x.max -= panX;
        this.viewport.y.min += panY; // Y轴反向
        this.viewport.y.max += panY;
        
        this.clampViewport();
        this.updateDisplay();
    }
    
    // 限制视窗在数据范围内
    clampViewport() {
        // 确保视窗不超出数据范围
        this.viewport.x.min = Math.max(this.dataRange.x.min, this.viewport.x.min);
        this.viewport.x.max = Math.min(this.dataRange.x.max, this.viewport.x.max);
        this.viewport.y.min = Math.max(this.dataRange.y.min, this.viewport.y.min);
        this.viewport.y.max = Math.min(this.dataRange.y.max, this.viewport.y.max);
        
        // 确保视窗大小符合限制
        const currentWidth = this.viewport.x.max - this.viewport.x.min;
        const currentHeight = this.viewport.y.max - this.viewport.y.min;
        
        if (currentWidth < this.zoomLimits.x.min) {
            const center = (this.viewport.x.min + this.viewport.x.max) / 2;
            this.viewport.x.min = center - this.zoomLimits.x.min / 2;
            this.viewport.x.max = center + this.zoomLimits.x.min / 2;
        }
        
        if (currentHeight < this.zoomLimits.y.min) {
            const center = (this.viewport.y.min + this.viewport.y.max) / 2;
            this.viewport.y.min = center - this.zoomLimits.y.min / 2;
            this.viewport.y.max = center + this.zoomLimits.y.min / 2;
        }
    }
    
    // 更新数据范围（当有新数据时）
    updateDataRange(maxTime) {
        this.dataRange.x.max = maxTime + 20000; // 当前时间 + 20秒
        this.clampViewport();
        this.updateDisplay();
    }
    
    // 坐标转换函数
    screenToDataX(screenX) {
        const containerWidth = this.container.clientWidth;
        const ratio = screenX / containerWidth;
        return this.viewport.x.min + ratio * (this.viewport.x.max - this.viewport.x.min);
    }
    
    screenToDataY(screenY) {
        const containerHeight = this.container.clientHeight;
        const ratio = 1 - (screenY / containerHeight); // Y轴反向
        return this.viewport.y.min + ratio * (this.viewport.y.max - this.viewport.y.min);
    }
    
    dataToScreenX(dataX) {
        const containerWidth = this.container.clientWidth;
        const ratio = (dataX - this.viewport.x.min) / (this.viewport.x.max - this.viewport.x.min);
        return ratio * containerWidth;
    }
    
    dataToScreenY(dataY) {
        const containerHeight = this.container.clientHeight;
        const ratio = (dataY - this.viewport.y.min) / (this.viewport.y.max - this.viewport.y.min);
        return (1 - ratio) * containerHeight; // Y轴反向
    }
    
    // 处理滚动条轨道点击
    handleScrollbarTrackClick(e, axis, scrollbar, thumb) {
        e.preventDefault();
        
        const scrollbarRect = scrollbar.getBoundingClientRect();
        const clickPos = axis === 'x' 
            ? (e.clientX - scrollbarRect.left) / scrollbarRect.width
            : (e.clientY - scrollbarRect.top) / scrollbarRect.height;
            
        const thumbRect = thumb.getBoundingClientRect();
        const thumbSize = axis === 'x' 
            ? thumbRect.width / scrollbarRect.width
            : thumbRect.height / scrollbarRect.height;
            
        // 记录点击前的状态
        const oldViewport = {
            x: { ...this.viewport.x },
            y: { ...this.viewport.y }
        };
        
        // 计算新的视窗位置，将thumb中心移动到点击位置
        const newPos = Math.max(0, Math.min(1 - thumbSize, clickPos - thumbSize/2));
        
        if (axis === 'x') {
            const xRange = this.dataRange.x.max - this.dataRange.x.min;
            const xViewportRange = this.viewport.x.max - this.viewport.x.min;
            this.viewport.x.min = this.dataRange.x.min + newPos * (xRange - xViewportRange);
            this.viewport.x.max = this.viewport.x.min + xViewportRange;
        } else {
            const yRange = this.dataRange.y.max - this.dataRange.y.min;
            const yViewportRange = this.viewport.y.max - this.viewport.y.min;
            this.viewport.y.min = this.dataRange.y.min + newPos * (yRange - yViewportRange);
            this.viewport.y.max = this.viewport.y.min + yViewportRange;
        }
        
        this.clampViewport();
        this.updateDisplay();
        
        // 记录详细的调试信息
        this.logger.log('debug', '滚动条轨道点击', {
            axis,
            event: {
                clientX: e.clientX,
                clientY: e.clientY,
                target: e.target.id || 'scrollbar-track'
            },
            scrollbar: {
                left: scrollbarRect.left,
                top: scrollbarRect.top,
                width: scrollbarRect.width,
                height: scrollbarRect.height
            },
            thumb: {
                width: thumbRect.width,
                height: thumbRect.height,
                left: thumbRect.left,
                top: thumbRect.top
            },
            calculations: {
                clickPos,
                thumbSize,
                newPos,
                clickPosPercent: clickPos * 100,
                thumbSizePercent: thumbSize * 100,
                newPosPercent: newPos * 100
            },
            viewport: {
                before: oldViewport,
                after: {
                    x: { ...this.viewport.x },
                    y: { ...this.viewport.y }
                }
            },
            dataRange: this.dataRange,
            containerSize: {
                width: this.container.clientWidth,
                height: this.container.clientHeight
            }
        });
    }
    
    // 更新显示
    updateDisplay() {
        this.updateScrollbars();
        this.onViewportChange && this.onViewportChange(this.viewport);
    }
    
    updateScrollbars() {
        const xThumb = document.getElementById('viewport-x-thumb');
        const yThumb = document.getElementById('viewport-y-thumb');
        
        if (!xThumb || !yThumb) return;
        
        // 计算滚动条位置和大小
        const xRange = this.dataRange.x.max - this.dataRange.x.min;
        const yRange = this.dataRange.y.max - this.dataRange.y.min;
        
        const xViewportRange = this.viewport.x.max - this.viewport.x.min;
        const yViewportRange = this.viewport.y.max - this.viewport.y.min;
        
        const xThumbWidth = Math.max(10, Math.min(100, (xViewportRange / xRange) * 100));
        const yThumbHeight = Math.max(10, Math.min(100, (yViewportRange / yRange) * 100));
        
        const xThumbLeft = ((this.viewport.x.min - this.dataRange.x.min) / xRange) * (100 - xThumbWidth);
        
        // 修复Y轴滚动条位置计算：考虑反向坐标系
        // 滚动条从上往下移动对应数据范围从下往上看
        const yThumbTop = ((this.dataRange.y.max - this.viewport.y.max) / yRange) * (100 - yThumbHeight);
        
        xThumb.style.width = `${xThumbWidth}%`;
        xThumb.style.left = `${Math.max(0, Math.min(100 - xThumbWidth, xThumbLeft))}%`;
        
        yThumb.style.height = `${yThumbHeight}%`;
        yThumb.style.top = `${Math.max(0, Math.min(100 - yThumbHeight, yThumbTop))}%`;
    }
    
    // 重置视窗到初始状态
    resetViewport() {
        this.viewport = {
            x: { min: 0, max: 10000 },      // X轴初始0~10000ms
            y: { min: -5000, max: 5000 }    // Y轴初始-5000~5000
        };
        this.updateDisplay();
    }
    
    // 获取当前视窗范围
    getViewport() {
        return { ...this.viewport };
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewportManager;
} else {
    window.ViewportManager = ViewportManager;
}