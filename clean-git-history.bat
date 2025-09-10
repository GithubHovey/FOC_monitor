@echo off
echo === Git历史清理脚本 ===
echo.
echo 警告：此操作会重写Git历史记录！
echo 请确保：
echo 1. 已备份重要数据
echo 2. 其他协作者已知晓
echo 3. 理解操作后果
echo.

set /p confirm=是否继续？(y/N): 
if /i "%confirm%" neq "y" (
    echo 操作已取消
    pause
    exit /b 1
)

echo.
echo 开始清理Git历史中的忽略文件...

:: 创建临时分支
git checkout -b temp-cleanup

:: 移除dist目录
echo 移除dist目录...
git filter-branch --force --index-filter ^
"git rm -r --cached --ignore-unmatch dist" --prune-empty --tag-name-filter cat -- --all

:: 移除build目录
echo 移除build目录...
git filter-branch --force --index-filter ^
"git rm -r --cached --ignore-unmatch build" --prune-empty --tag-name-filter cat -- --all

:: 移除日志文件
echo 移除日志文件...
git filter-branch --force --index-filter ^
"git rm -r --cached --ignore-unmatch *.log npminstall-debug.log" --prune-empty --tag-name-filter cat -- --all

:: 移除node_modules
echo 移除node_modules...
git filter-branch --force --index-filter ^
"git rm -r --cached --ignore-unmatch node_modules" --prune-empty --tag-name-filter cat -- --all

:: 移除其他临时文件
echo 移除临时文件...
git filter-branch --force --index-filter ^
"git rm -r --cached --ignore-unmatch .DS_Store Thumbs.db *.tmp *.temp" --prune-empty --tag-name-filter cat -- --all

echo.
echo 清理完成！
echo.
echo 下一步操作：
echo 1. 检查清理结果： git log --oneline
echo 2. 强制推送到远程： git push origin --force --all
echo 3. 删除临时分支： git branch -d temp-cleanup
echo.
echo 警告：如果项目有协作者，请通知他们执行：
echo git fetch origin
echo git reset --hard origin/[分支名]

pause