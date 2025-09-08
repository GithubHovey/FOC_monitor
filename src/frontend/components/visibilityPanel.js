// FOC电机控制上位机 - 可视性控制面板组件
class VisibilityPanel {
    constructor() {
        this.panelElement = null;
        this.isVisible = false;
        this.visibilityManager = window.visibilityManager;
        
        this.init();
    }

    // 初始化面板
    init() {
        this.createPanelElement();
        this.bindEvents();
        this.loadVisibilitySettings();
        
        // 注册可见性变化回调
        this.visibilityManager.onVisibilityChange((paramId, isVisible) => {
            this.updateCheckboxState(paramId, isVisible);
        });
    }

    // 创建面板元素
    createPanelElement() {
        this.panelElement = document.createElement('div');
        this.panelElement.className = 'visibility-panel';
        this.panelElement.innerHTML = `
            <div class="panel-header">
                <h3>参数可视性控制</h3>
                <button class="close-btn" title="关闭面板">×</button>
            </div>
            
            <div class="panel-tabs">
                <button class="tab-btn active" data-tab="current">电流参数</button>
                <button class="tab-btn" data-tab="voltage">电压参数</button>
                <button class="tab-btn" data-tab="motion">运动参数</button>
                <button class="tab-btn" data-tab="control">控制参数</button>
                <button class="tab-btn" data-tab="protection">保护参数</button>
                <button class="tab-btn" data-tab="debug">调试参数</button>
                <button class="tab-btn" data-tab="communication">通信参数</button>
            </div>
            
            <div class="panel-content">
                <div class="tab-content active" data-tab="current">
                    <div class="parameter-group">
                        <h4>电流参数</h4>
                        <div class="parameter-list">
                            <label class="parameter-item">
                                <input type="checkbox" data-param="current_ia" checked>
                                <span>相电流A (A)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="current_ib" checked>
                                <span>相电流B (A)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="current_ic" checked>
                                <span>相电流C (A)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="torque_current" checked>
                                <span>转矩电流 (A)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="excitation_current" checked>
                                <span>励磁电流 (A)</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" data-tab="voltage">
                    <div class="parameter-group">
                        <h4>电压参数</h4>
                        <div class="parameter-list">
                            <label class="parameter-item">
                                <input type="checkbox" data-param="voltage_dc" checked>
                                <span>直流母线电压 (V)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="voltage_q_ref" checked>
                                <span>目标Q轴电压 (V)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="voltage_d_ref" checked>
                                <span>目标D轴电压 (V)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="voltage_q" checked>
                                <span>实际Q轴电压 (V)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="voltage_d" checked>
                                <span>实际D轴电压 (V)</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" data-tab="motion">
                    <div class="parameter-group">
                        <h4>运动参数</h4>
                        <div class="parameter-list">
                            <label class="parameter-item">
                                <input type="checkbox" data-param="speed_rpm" checked>
                                <span>电机转速 (RPM)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="position_deg" checked>
                                <span>电机位置 (°)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="target_speed" checked>
                                <span>目标转速 (RPM)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="target_position" checked>
                                <span>目标位置 (°)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="acceleration_limit" checked>
                                <span>加速度限制 (RPM/s)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="deceleration_limit" checked>
                                <span>减速度限制 (RPM/s)</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" data-tab="control">
                    <div class="parameter-group">
                        <h4>控制参数</h4>
                        <div class="parameter-list">
                            <label class="parameter-item">
                                <input type="checkbox" data-param="speed_kp" checked>
                                <span>速度环Kp</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="speed_ki" checked>
                                <span>速度环Ki</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="current_kp" checked>
                                <span>电流环Kp</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="current_ki" checked>
                                <span>电流环Ki</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" data-tab="protection">
                    <div class="parameter-group">
                        <h4>保护参数</h4>
                        <div class="parameter-list">
                            <label class="parameter-item">
                                <input type="checkbox" data-param="overcurrent_protection" checked>
                                <span>过流保护值 (A)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="overvoltage_protection" checked>
                                <span>过压保护值 (V)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="undervoltage_protection" checked>
                                <span>欠压保护值 (V)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="overtemperature_protection" checked>
                                <span>过热保护值 (°C)</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" data-tab="debug">
                    <div class="parameter-group">
                        <h4>调试参数</h4>
                        <div class="parameter-list">
                            <label class="parameter-item">
                                <input type="checkbox" data-param="pwm_frequency">
                                <span>PWM频率 (Hz)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="dead_time">
                                <span>死区时间 (ns)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="adc_sample_rate">
                                <span>ADC采样率 (Hz)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="encoder_resolution">
                                <span>编码器分辨率 (PPR)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="pole_pairs">
                                <span>极对数</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" data-tab="communication">
                    <div class="parameter-group">
                        <h4>通信参数</h4>
                        <div class="parameter-list">
                            <label class="parameter-item">
                                <input type="checkbox" data-param="can_id">
                                <span>CAN节点ID</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="baud_rate">
                                <span>波特率 (bps)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="data_bits">
                                <span>数据位</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="stop_bits">
                                <span>停止位</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="parity">
                                <span>校验位</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="timeout">
                                <span>通信超时 (ms)</span>
                            </label>
                            <label class="parameter-item">
                                <input type="checkbox" data-param="retry_count">
                                <span>重试次数</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="panel-footer">
                <button class="btn btn-primary" id="apply-visibility">应用</button>
                <button class="btn btn-secondary" id="reset-visibility">重置</button>
                <button class="btn btn-outline" id="select-all">全选</button>
                <button class="btn btn-outline" id="deselect-all">全不选</button>
            </div>
        `;
        
        document.body.appendChild(this.panelElement);
    }

    // 绑定事件
    bindEvents() {
        // 关闭按钮
        this.panelElement.querySelector('.close-btn').addEventListener('click', () => {
            this.hide();
        });

        // 标签页切换
        this.panelElement.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 参数复选框变化
        this.panelElement.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const paramId = e.target.dataset.param;
                const isVisible = e.target.checked;
                this.visibilityManager.setVisibility(paramId, isVisible);
            });
        });

        // 底部按钮
        this.panelElement.querySelector('#apply-visibility').addEventListener('click', () => {
            this.applyVisibility();
        });

        this.panelElement.querySelector('#reset-visibility').addEventListener('click', () => {
            this.resetVisibility();
        });

        this.panelElement.querySelector('#select-all').addEventListener('click', () => {
            this.selectAll();
        });

        this.panelElement.querySelector('#deselect-all').addEventListener('click', () => {
            this.deselectAll();
        });

        // 点击面板外部关闭
        this.panelElement.addEventListener('click', (e) => {
            if (e.target === this.panelElement) {
                this.hide();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    // 切换标签页
    switchTab(tabName) {
        // 移除所有激活状态
        this.panelElement.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.panelElement.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 激活选中的标签页
        this.panelElement.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
        this.panelElement.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
    }

    // 应用可见性设置
    applyVisibility() {
        this.visibilityManager.saveToLocalStorage();
        this.showMessage('可见性设置已应用');
    }

    // 重置可见性设置
    resetVisibility() {
        if (confirm('确定要重置所有可见性设置为默认值吗？')) {
            this.visibilityManager.resetToDefaults();
            this.updateAllCheckboxStates();
            this.showMessage('已重置为默认设置');
        }
    }

    // 全选
    selectAll() {
        this.panelElement.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
            const paramId = checkbox.dataset.param;
            this.visibilityManager.setVisibility(paramId, true);
        });
        this.showMessage('已选择所有参数');
    }

    // 全不选
    deselectAll() {
        this.panelElement.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
            const paramId = checkbox.dataset.param;
            this.visibilityManager.setVisibility(paramId, false);
        });
        this.showMessage('已取消选择所有参数');
    }

    // 更新复选框状态
    updateCheckboxState(paramId, isVisible) {
        const checkbox = this.panelElement.querySelector(`input[data-param="${paramId}"]`);
        if (checkbox) {
            checkbox.checked = isVisible;
        }
    }

    // 更新所有复选框状态
    updateAllCheckboxStates() {
        const allVisibility = this.visibilityManager.getAllVisibility();
        for (const [paramId, isVisible] of Object.entries(allVisibility)) {
            this.updateCheckboxState(paramId, isVisible);
        }
    }

    // 加载可见性设置
    loadVisibilitySettings() {
        if (this.visibilityManager.loadFromLocalStorage()) {
            this.updateAllCheckboxStates();
        }
    }

    // 显示面板
    show() {
        this.panelElement.style.display = 'block';
        this.isVisible = true;
        this.loadVisibilitySettings();
    }

    // 隐藏面板
    hide() {
        this.panelElement.style.display = 'none';
        this.isVisible = false;
    }

    // 切换面板显示
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // 显示消息
    showMessage(message) {
        // 创建临时消息提示
        const messageEl = document.createElement('div');
        messageEl.className = 'visibility-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 2000);
    }

    // 销毁面板
    destroy() {
        if (this.panelElement && this.panelElement.parentNode) {
            this.panelElement.parentNode.removeChild(this.panelElement);
        }
        this.visibilityManager.destroy();
    }
}

// 创建全局可视性面板实例
window.visibilityPanel = new VisibilityPanel();
window.VisibilityPanel = VisibilityPanel;