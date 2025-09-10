# FOC电机控制上位机环境配置脚本 (PowerShell)
Write-Host "=== FOC电机控制上位机环境配置脚本 ===" -ForegroundColor Green
Write-Host ""

# 检查Node.js
Write-Host "检查Node.js版本..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js未安装，请从 https://nodejs.org/ 下载安装" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Write-Host "✅ Node.js版本: $nodeVersion" -ForegroundColor Green

# 检查npm
Write-Host "检查npm版本..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm未安装" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Write-Host "✅ npm版本: $npmVersion" -ForegroundColor Green

# 设置国内镜像
Write-Host "配置国内镜像..." -ForegroundColor Yellow
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/
npm config set electron_builder_binaries_mirror https://cdn.npmmirror.com/binaries/electron-builder-binaries/
Write-Host "✅ 国内镜像配置完成" -ForegroundColor Green

# 清理旧的依赖
Write-Host "清理旧的依赖..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "删除旧的node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules
}

# 清理构建产物
Write-Host "清理构建产物..." -ForegroundColor Yellow
npm run clean

# 安装依赖
Write-Host "安装项目依赖..." -ForegroundColor Yellow
try {
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        throw "依赖安装失败"
    }
    Write-Host "✅ 依赖安装完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 依赖安装失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请检查网络连接或手动安装" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 验证安装
Write-Host "验证安装..." -ForegroundColor Yellow
try {
    npm list
    Write-Host "✅ 依赖验证完成" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 依赖验证警告: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ 环境配置完成！" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "可用命令：" -ForegroundColor Cyan
Write-Host "  npm run dev      - 开发模式运行" -ForegroundColor White
Write-Host "  npm run build    - 构建所有平台" -ForegroundColor White
Write-Host "  npm run build:win  - 构建Windows版本" -ForegroundColor White
Write-Host "  npm run clean    - 清理构建产物" -ForegroundColor White
Write-Host ""
Read-Host "按回车键完成配置"