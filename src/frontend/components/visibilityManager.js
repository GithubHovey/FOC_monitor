// FOC电机控制上位机 - 可视性控制管理器
class VisibilityManager {
    constructor() {
        this.visibilityState = new Map();
        this.visibilityGroups = new Map();
        this.callbacks = [];
        
        // 初始化默认可见性状态
        this.initDefaultVisibility();
    }

    // 初始化默认可见性状态
    initDefaultVisibility() {
        // 实时数据监控参数
        this.setVisibility('current_ia', true);
        this.setVisibility('current_ib', true);
        this.setVisibility('current_ic', true);
        this.setVisibility('voltage_dc', true);
        this.setVisibility('speed_rpm', true);
        this.setVisibility('position_deg', true);
        
        // 控制参数
        this.setVisibility('target_speed', true);
        this.setVisibility('target_torque', true);
        this.setVisibility('target_position', true);
        
        // 调试参数
        this.setVisibility('pwm_frequency', false);
        this.setVisibility('dead_time', false);
        
        // 通信参数
        this.setVisibility('can_id', false);
        this.setVisibility('baud_rate', false);
        
        // 定义参数分组
        this.defineGroups();
    }

    // 定义参数分组
    defineGroups() {
        this.visibilityGroups.set('current_parameters', [
            'current_ia', 'current_ib', 'current_ic',
            'torque_current', 'excitation_current'
        ]);
        
        this.visibilityGroups.set('voltage_parameters', [
            'voltage_dc', 'voltage_q_ref', 'voltage_d_ref',
            'voltage_q', 'voltage_d'
        ]);
        
        this.visibilityGroups.set('motion_parameters', [
            'speed_rpm', 'position_deg', 'target_speed',
            'target_position', 'acceleration_limit', 'deceleration_limit'
        ]);
        
        this.visibilityGroups.set('control_parameters', [
            'speed_kp', 'speed_ki', 'current_kp', 'current_ki'
        ]);
        
        this.visibilityGroups.set('protection_parameters', [
            'overcurrent_protection', 'overvoltage_protection',
            'undervoltage_protection', 'overtemperature_protection'
        ]);
        
        this.visibilityGroups.set('debug_parameters', [
            'pwm_frequency', 'dead_time', 'adc_sample_rate',
            'encoder_resolution', 'pole_pairs'
        ]);
        
        this.visibilityGroups.set('communication_parameters', [
            'can_id', 'baud_rate', 'data_bits', 'stop_bits',
            'parity', 'timeout', 'retry_count'
        ]);
    }

    // 设置单个参数的可见性
    setVisibility(parameterId, isVisible) {
        this.visibilityState.set(parameterId, isVisible);
        this.notifyCallbacks(parameterId, isVisible);
        this.saveToLocalStorage();
    }

    // 设置分组参数的可见性
    setGroupVisibility(groupId, isVisible) {
        const parameters = this.visibilityGroups.get(groupId);
        if (parameters) {
            parameters.forEach(paramId => {
                this.setVisibility(paramId, isVisible);
            });
        }
    }

    // 切换参数的可见性
    toggleVisibility(parameterId) {
        const currentState = this.visibilityState.get(parameterId) || false;
        this.setVisibility(parameterId, !currentState);
        return !currentState;
    }

    // 获取参数的可见性状态
    getVisibility(parameterId) {
        return this.visibilityState.get(parameterId) || false;
    }

    // 获取分组内所有参数的可见性状态
    getGroupVisibility(groupId) {
        const parameters = this.visibilityGroups.get(groupId) || [];
        const states = {};
        
        parameters.forEach(paramId => {
            states[paramId] = this.getVisibility(paramId);
        });
        
        return states;
    }

    // 获取所有可见的参数ID
    getVisibleParameters() {
        const visibleParams = [];
        for (const [paramId, isVisible] of this.visibilityState) {
            if (isVisible) {
                visibleParams.push(paramId);
            }
        }
        return visibleParams;
    }

    // 获取所有参数的状态
    getAllVisibility() {
        const allStates = {};
        for (const [paramId, isVisible] of this.visibilityState) {
            allStates[paramId] = isVisible;
        }
        return allStates;
    }

    // 注册可见性变化回调
    onVisibilityChange(callback) {
        this.callbacks.push(callback);
    }

    // 通知所有回调函数
    notifyCallbacks(parameterId, isVisible) {
        this.callbacks.forEach(callback => {
            try {
                callback(parameterId, isVisible);
            } catch (error) {
                console.error('Visibility callback error:', error);
            }
        });
    }

    // 保存到本地存储
    saveToLocalStorage() {
        try {
            const visibilityData = Object.fromEntries(this.visibilityState);
            localStorage.setItem('foc_visibility_settings', JSON.stringify(visibilityData));
        } catch (error) {
            console.warn('无法保存可见性设置到本地存储:', error);
        }
    }

    // 从本地存储加载
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('foc_visibility_settings');
            if (savedData) {
                const visibilityData = JSON.parse(savedData);
                for (const [paramId, isVisible] of Object.entries(visibilityData)) {
                    this.visibilityState.set(paramId, isVisible);
                }
                return true;
            }
        } catch (error) {
            console.warn('从本地存储加载可见性设置失败:', error);
        }
        return false;
    }

    // 重置为默认设置
    resetToDefaults() {
        this.visibilityState.clear();
        this.initDefaultVisibility();
        this.saveToLocalStorage();
        this.notifyCallbacks('all', null); // 通知所有参数变化
    }

    // 导出可见性配置
    exportConfig() {
        return JSON.stringify({
            version: '1.0',
            timestamp: new Date().toISOString(),
            visibility: Object.fromEntries(this.visibilityState)
        }, null, 2);
    }

    // 导入可见性配置
    importConfig(configJson) {
        try {
            const config = JSON.parse(configJson);
            if (config.visibility) {
                for (const [paramId, isVisible] of Object.entries(config.visibility)) {
                    this.setVisibility(paramId, isVisible);
                }
                return true;
            }
        } catch (error) {
            console.error('导入可见性配置失败:', error);
        }
        return false;
    }

    // 销毁实例
    destroy() {
        this.callbacks = [];
        this.visibilityState.clear();
        this.visibilityGroups.clear();
    }
}

// 创建全局可视性管理器实例
window.visibilityManager = new VisibilityManager();
window.VisibilityManager = VisibilityManager;