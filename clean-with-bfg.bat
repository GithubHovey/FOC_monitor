@echo off
echo === 使用BFG清理Git历史 ===
echo.
echo BFG Repo-Cleaner是一个更快、更简单的替代方案
echo 下载地址：https://rtyley.github.io/bfg-repo-cleaner/
echo.

set /p confirm=是否下载并使用BFG？(y/N): 
if /i "%confirm%" neq "y" (
    echo 操作已取消
    pause
    exit /b 1
)

:: 检查BFG是否存在
if not exist bfg.jar (
    echo 正在下载BFG...
    powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/com/madgag/bfg/1.13.0/bfg-1.13.0.jar' -OutFile 'bfg.jar'"
)

echo.
echo 创建清理规则文件...

:: 创建BFG清理规则
echo dist/ > to-be-deleted.txt
echo build/ >> to-be-deleted.txt
echo *.log >> to-be-deleted.txt
echo npminstall-debug.log >> to-be-deleted.txt
echo node_modules/ >> to-be-deleted.txt
echo .DS_Store >> to-be-deleted.txt
echo Thumbs.db >> to-be-deleted.txt

echo.
echo 备份当前仓库...
if not exist backup-repo (
    mkdir backup-repo
)
xcopy /e /i /y .git backup-repo\.git

echo.
echo 使用BFG清理历史...
java -jar bfg.jar --delete-files to-be-deleted.txt --no-blob-protection

echo.
echo 清理完成！
echo 执行以下命令完成清理：
echo git reflog expire --expire=now --all
echo git gc --prune=now --aggressive
echo.
echo 然后强制推送：
echo git push origin --force --all

del to-be-deleted.txt
pause