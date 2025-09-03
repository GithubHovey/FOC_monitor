# FOC电机控制上位机

基于Electron + Node.js + HTML/CSS/JavaScript开发的FOC电机控制监控软件。

## 📁 项目目录结构

```
FOC_Monitor/
├── src/                    # 源代码目录
│   ├── frontend/           # 前端代码
│   │   ├── components/     # React/Vue组件
│   │   ├── pages/          # 页面组件
│   │   ├── styles/         # 样式文件
│   │   ├── utils/          # 前端工具函数
│   │   └── assets/         # 前端静态资源
│   └── backend/           # 后端代码
│       ├── communication/  # 串口通信模块
│       ├── data-processing/ # 数据处理模块
│       ├── utils/          # 后端工具函数
│       └── config/         # 配置文件
├── dist/                   # 构建产物目录
│   ├── windows/           # Windows平台可执行文件
│   ├── linux/            # Linux平台可执行文件
│   └── macos/            # macOS平台可执行文件
├── assets/                # 项目资源文件
│   ├── icons/            # 应用图标
│   ├── docs/             # 项目文档
│   └── images/           # 图片资源
├── build/                # 构建过程文件
│   ├── temp/             # 临时文件
│   └── cache/            # 缓存文件
└── FOC电机控制上位机需求文档.md
```

## 🚀 技术栈

- **前端**: HTML5/CSS3/JavaScript + Chart.js
- **框架**: Electron
- **后端**: Node.js + serialport库
- **数据持久化**: JSON配置文件 + SQLite数据库

## 📋 各目录详细说明

### src/frontend/
- `components/`: 可复用的UI组件
- `pages/`: 主要页面组件（监控面板、配置页面等）
- `styles/`: CSS样式文件和主题配置
- `utils/`: 前端工具函数和辅助类
- `assets/`: 前端静态资源（图片、字体等）

### src/backend/
- `communication/`: 串口通信模块，负责与FOC控制器通信
- `data-processing/`: 数据处理模块，解析和转换电机数据
- `utils/`: 后端工具函数
- `config/`: 应用配置管理和持久化

### dist/
各平台特定的打包输出文件：
- `windows/`: Windows平台的.exe可执行文件和依赖库
- `linux/`: Linux平台的AppImage或deb/rpm包
- `macos/`: macOS平台的.app应用程序包

### assets/
- `icons/`: 应用图标文件（不同尺寸和平台）
- `docs/`: 项目相关文档
- `images/`: 应用中使用到的图片资源

### build/
- `temp/`: 构建过程中的临时文件
- `cache/`: 构建缓存文件，加速后续构建

## 🛠️ 开发环境设置

1. 安装Node.js (v16+)
2. 安装Electron
3. 安装项目依赖

## 📦 构建说明

项目使用Electron Builder进行多平台打包，构建产物将输出到对应的dist/子目录中。