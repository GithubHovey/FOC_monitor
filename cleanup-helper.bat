@echo off
echo === Git历史清理助手 ===
echo.
echo 这个工具会帮助你将.gitignore中的文件从Git历史中移除
echo.

:menu
echo 请选择清理方法：
echo 1. 使用git filter-branch（内置，较慢但兼容）
echo 2. 使用BFG Repo-Cleaner（快速，需要Java）
echo 3. 查看手动清理指南
echo 4. 检查当前状态
echo 5. 退出
echo.

set /p choice=请输入选项(1-5): 

if "%choice%"=="1" goto filter_branch
if "%choice%"=="2" goto bfg_method
if "%choice%"=="3" goto manual_guide
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto exit

echo 无效选项，请重新选择
goto menu

:filter_branch
echo 启动git filter-branch清理...
call clean-git-history.bat
goto menu

:bfg_method
echo 启动BFG清理...
call clean-with-bfg.bat
goto menu

:manual_guide
echo 打开清理指南...
start MANUAL_CLEANUP.md
goto menu

:check_status
echo.
echo === 当前Git状态检查 ===
echo.
echo 当前分支:
git branch --show-current
echo.
echo 远程仓库:
git remote -v
echo.
echo 大文件统计:
git count-objects -vH
echo.
echo 被忽略的文件:
git status --ignored
echo.
echo 需要清理的文件:
git ls-files | findstr -E "dist|build|.*\.log|node_modules|\.DS_Store|Thumbs\.db"
echo.
pause
goto menu

:exit
echo 感谢使用清理助手
echo 如需帮助，请查看MANUAL_CLEANUP.md
pause