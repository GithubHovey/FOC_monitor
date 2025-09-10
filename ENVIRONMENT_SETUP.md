# FOC电机控制上位机环境配置指南

## 🔧 环境要求

### 必需软件
- **Node.js**: 版本 18.x 或更高
- **npm**: 最新版本
- **Git**: 最新版本

### 可选软件
- **Visual Studio Code**: 推荐编辑器
- **Python**: 3.8+ (某些node-gyp编译需要)

## 📥 新电脑环境配置步骤

### 1. 克隆项目
```bash
git clone [你的仓库地址]
cd FOC_monitor
```

### 2. 安装依赖
```bash
# 安装项目依赖
npm install

# 如果遇到权限问题，使用：
npm install --legacy-peer-deps
```

### 3. 验证安装
```bash
# 检查Electron是否安装成功
npx electron --version

# 检查开发环境
npm run dev
```

## 🏗️ 编译指南

### 清理编译产物
```bash
# 清理所有构建产物（推荐）
npm run clean

# 清理所有包括node_modules
npm run clean:all
```

### 构建命令
```bash
# 构建Windows版本
npm run build:win

# 构建Linux版本
npm run build:linux

# 构建macOS版本
npm run build:mac

# 构建所有平台
npm run build

# 开发模式运行
npm run dev
```

## ⚠️ 常见问题解决

### 1. 安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rmdir /s /q node_modules
npm install
```

### 2. Electron安装问题
```bash
# 设置国内镜像
npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/
npm install
```

### 3. 构建失败
```bash
# 确保所有依赖安装完整
npm install

# 检查package.json中的配置
```

## 🌐 国内镜像配置（可选）

### 临时使用国内镜像
```bash
npm install --registry=https://registry.npmmirror.com
```

### 永久配置国内镜像
```bash
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/
npm config set electron_builder_binaries_mirror https://cdn.npmmirror.com/binaries/electron-builder-binaries/
```

## 📁 项目结构说明

```
FOC_monitor/
├── src/                    # 源代码
│   ├── backend/           # Electron主进程
│   └── frontend/          # 前端代码
├── assets/                # 静态资源
├── dist/                  # 构建产物（git忽略）
├── build/                 # 构建缓存（git忽略）
├── package.json          # 项目配置
└── .gitignore           # 忽略文件配置
```

## 🚀 快速开始

1. **克隆项目**
2. **安装依赖**: `npm install`
3. **开发模式**: `npm run dev`
4. **构建发布**: `npm run build:win`

## 🔍 验证步骤

完成配置后，运行以下命令验证：
```bash
# 1. 检查Node.js版本
node --version

# 2. 检查npm版本
npm --version

# 3. 检查项目依赖
npm list

# 4. 启动开发环境
npm run dev

# 5. 构建测试
npm run build:win
```

如果以上步骤都成功，说明环境配置完成！