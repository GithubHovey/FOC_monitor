@echo off
echo === FOC电机控制上位机环境配置脚本 ===
echo.

:: 检查Node.js
echo 检查Node.js版本...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请从 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)

:: 检查npm
echo 检查npm版本...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm未安装
    pause
    exit /b 1
)

:: 设置国内镜像
echo 配置国内镜像...
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/
npm config set electron_builder_binaries_mirror https://cdn.npmmirror.com/binaries/electron-builder-binaries/

:: 清理旧的依赖
echo 清理旧的依赖...
if exist node_modules (
    echo 删除旧的node_modules...
    rmdir /s /q node_modules
)

:: 安装依赖
echo 安装项目依赖...
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    echo 请检查网络连接或手动安装
    pause
    exit /b 1
)

:: 验证安装
echo 验证安装...
npm list
if %errorlevel% neq 0 (
    echo ❌ 依赖验证失败
    pause
    exit /b 1
)

:: 清理构建产物
echo 清理构建产物...
npm run clean

echo.
echo ✅ 环境配置完成！
echo.
echo 可用命令：
echo   npm run dev      - 开发模式运行
echo   npm run build    - 构建所有平台
echo   npm run build:win - 构建Windows版本
echo   npm run clean    - 清理构建产物
echo.
pause